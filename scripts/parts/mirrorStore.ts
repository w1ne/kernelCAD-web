// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/mirrorStore.ts
//
// Content-addressed mirror stores for the parts ingestion engine. Keyed by
// sha256 ⇒ identical STEP bytes from any source mirror to the same object, so
// dedup is automatic and global. Two impls behind the `MirrorStore` seam:
//
//   LocalFsMirrorStore — writes `<rootDir>/step/<sha256>.step` on the local
//     filesystem. Used by tests, dev, and the operator's local catalog build.
//   R2MirrorStore — PUT/HEAD against Cloudflare R2's S3-compatible API using a
//     minimal SigV4 signer (no AWS SDK dependency). Runs in prod only; it must
//     typecheck and is unit-tested with a mocked fetch — it never touches real
//     R2 from the test suite.

import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import type { MirrorStore } from './contracts';

/** Content-addressed object key for a STEP blob. */
export function stepKey(sha256: string): string {
  return `step/${sha256}.step`;
}

// -----------------------------------------------------------------------------
// Local filesystem store
// -----------------------------------------------------------------------------

export class LocalFsMirrorStore implements MirrorStore {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  private pathFor(sha256: string): string {
    return join(this.rootDir, 'step', `${sha256}.step`);
  }

  async put(sha256: string, bytes: Uint8Array): Promise<string> {
    const dest = this.pathFor(sha256);
    // Idempotent: identical content under a content-addressed key — skip the
    // write if it already exists.
    if (!existsSync(dest)) {
      mkdirSync(join(this.rootDir, 'step'), { recursive: true });
      writeFileSync(dest, bytes);
    }
    return stepKey(sha256);
  }

  async has(sha256: string): Promise<boolean> {
    return existsSync(this.pathFor(sha256));
  }
}

// -----------------------------------------------------------------------------
// Cloudflare R2 store (S3-compatible, minimal SigV4 — no AWS SDK dependency)
// -----------------------------------------------------------------------------

export interface R2MirrorStoreConfig {
  bucket: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Public base URL the mirrored object is served from, e.g. a Pages/CDN host. */
  publicBaseUrl: string;
  /** R2 region label; R2 uses 'auto'. Injectable for testing. */
  region?: string;
  /** Injectable fetch for unit tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable clock for deterministic SigV4 test assertions. */
  now?: () => Date;
}

const EMPTY_SHA256 = createHash('sha256').update('').digest('hex');

export class R2MirrorStore implements MirrorStore {
  private readonly cfg: Required<Omit<R2MirrorStoreConfig, 'fetchImpl' | 'now'>>;
  private readonly doFetch: typeof fetch;
  private readonly now: () => Date;

  constructor(config: R2MirrorStoreConfig) {
    this.cfg = {
      bucket: config.bucket,
      accountId: config.accountId,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      publicBaseUrl: config.publicBaseUrl.replace(/\/$/, ''),
      region: config.region ?? 'auto',
    };
    this.doFetch = config.fetchImpl ?? fetch;
    this.now = config.now ?? (() => new Date());
  }

  /** S3-compatible endpoint host for this R2 account. */
  private endpointHost(): string {
    return `${this.cfg.accountId}.r2.cloudflarestorage.com`;
  }

  private objectUrl(sha256: string): string {
    return `https://${this.endpointHost()}/${this.cfg.bucket}/${stepKey(sha256)}`;
  }

  async has(sha256: string): Promise<boolean> {
    const res = await this.signedRequest('HEAD', sha256, undefined);
    if (res.status === 200) return true;
    if (res.status === 404) return false;
    // 403 on a missing key is also possible depending on bucket policy; treat
    // anything non-200 that isn't a hard error as "not present".
    if (res.status >= 500) {
      throw new Error(`R2 HEAD ${stepKey(sha256)} failed: HTTP ${res.status}`);
    }
    return false;
  }

  async put(sha256: string, bytes: Uint8Array): Promise<string> {
    const res = await this.signedRequest('PUT', sha256, bytes);
    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`R2 PUT ${stepKey(sha256)} failed: HTTP ${res.status}`);
    }
    return `${this.cfg.publicBaseUrl}/${stepKey(sha256)}`;
  }

  /** Sign + dispatch a single S3 request with AWS SigV4 (service 's3'). */
  private async signedRequest(
    method: 'PUT' | 'HEAD',
    sha256: string,
    body: Uint8Array | undefined,
  ): Promise<Response> {
    const url = this.objectUrl(sha256);
    const host = this.endpointHost();
    const date = this.now();
    const amzDate = toAmzDate(date); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8); // YYYYMMDD
    const region = this.cfg.region;
    const service = 's3';
    const payloadHash =
      body && body.length > 0
        ? createHash('sha256').update(body).digest('hex')
        : EMPTY_SHA256;

    const canonicalUri = `/${this.cfg.bucket}/${stepKey(sha256)}`;
    const canonicalQuery = '';
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const scope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = sigV4Key(this.cfg.secretAccessKey, dateStamp, region, service);
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${this.cfg.accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: authorization,
    };
    if (method === 'PUT') headers['Content-Type'] = 'application/step';

    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = body;
    }
    return this.doFetch(url, init);
  }
}

/** AWS SigV4 date format: YYYYMMDDTHHMMSSZ. */
function toAmzDate(d: Date): string {
  return d.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '');
}

/** Derive the SigV4 signing key chain. */
function sigV4Key(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(region).digest();
  const kService = createHmac('sha256', kRegion).update(service).digest();
  return createHmac('sha256', kService).update('aws4_request').digest();
}
