// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/remoteClient.ts
//
// Remote parts tier. Defaults to kernelCAD's own public catalog
// (kernelcad-parts.pages.dev) so kernelCAD can find off-the-shelf parts out of
// the box with no third-party dependency. Override the source with a
// partsBaseUrl argument or the KERNELCAD_PARTS_BASE_URL env var (e.g. point it
// at api.step.parts, or any catalog serving the same /v1/parts schema); set
// that env var to `off` / `none` to disable the remote tier and restore
// offline-only behavior.

import { KernelError } from '../../shared/intent/kernelError';
import type { PartRecord } from '../../shared/parts/types';
import { mapStepPartsRecord, type StepPartsRecord } from './stepPartsAdapter';

/** Zero-config default remote source: kernelCAD's own license-clean catalog,
 *  built from the CC-BY FreeCAD parts_library and served from Cloudflare Pages
 *  (see scripts/ingestFreecadLibrary.ts + .github/workflows/parts-catalog.yml).
 *  Serves the same /v1/parts schema the step.parts adapter speaks, so the
 *  mapper below is unchanged. Override via partsBaseUrl / KERNELCAD_PARTS_BASE_URL. */
export const KERNELCAD_PARTS_BASE_URL = 'https://kernelcad-parts.pages.dev';

export class RemoteDisabledError extends KernelError {
  constructor() {
    super(
      'parts.fetch.remote-disabled',
      'No partsBaseUrl configured; remote parts tier is disabled.',
      undefined,
      'Pass partsBaseUrl (programmatic), set the KERNELCAD_PARTS_BASE_URL env var, or use only bundled-catalog ids.',
    );
  }
}

export interface RemoteFindOpts {
  query?: string;
  category?: string;
  family?: string;
  standard?: string;
  tag?: string;
  limit?: number;
  partsBaseUrl?: string;
}

export interface RemoteFindResult {
  results: PartRecord[];
  totalMatches: number;
}

export interface RemoteFetchOpts {
  id: string;
  partsBaseUrl?: string;
}

function resolveBaseUrl(arg: string | undefined): string {
  const raw = (arg ?? process.env.KERNELCAD_PARTS_BASE_URL ?? '').trim();
  // Explicit opt-out: `KERNELCAD_PARTS_BASE_URL=off` (or `none`) disables the
  // remote tier entirely, restoring `parts.fetch.remote-disabled` behavior.
  if (raw.toLowerCase() === 'off' || raw.toLowerCase() === 'none') {
    throw new RemoteDisabledError();
  }
  // Zero-config default: kernelCAD's own catalog. An explicit arg/env URL
  // overrides it (e.g. api.step.parts, or any catalog serving /v1/parts).
  const url = raw.length === 0 ? KERNELCAD_PARTS_BASE_URL : raw;
  return url.replace(/\/$/, '');
}

async function callRemote(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': `kernelcad-parts/${process.env.npm_package_version ?? 'dev'}`,
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new KernelError(
        'parts.fetch.api-error',
        `Remote parts API returned ${res.status} for ${url}.`,
        undefined,
        'Retry later or fall back to bundled catalog (source: "local").',
      );
    }
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function remoteFindParts(
  opts: RemoteFindOpts,
): Promise<RemoteFindResult> {
  const base = resolveBaseUrl(opts.partsBaseUrl);
  const qs = new URLSearchParams();
  if (opts.query) qs.set('q', opts.query);
  if (opts.category) qs.set('category', opts.category);
  if (opts.family) qs.set('family', opts.family);
  if (opts.standard) qs.set('standard', opts.standard);
  if (opts.tag) qs.set('tag', opts.tag);
  if (opts.limit) qs.set('pageSize', String(opts.limit));
  const res = await callRemote(`${base}/v1/parts?${qs.toString()}`, 5000);
  // The catalog search response returns `{ items, total, ... }` where each item
  // is the same per-part shape as the detail endpoint (stepUrl + sha256 included).
  // Map each onto a PartRecord. Authored hash-bound manifests preserve their
  // connector names; records without one leave connectors for fetch-time synthesis.
  const raw = (await res.json()) as {
    items?: StepPartsRecord[];
    total?: number;
  };
  const results = (raw.items ?? []).map(mapStepPartsRecord);
  return { results, totalMatches: raw.total ?? results.length };
}

export async function remoteFetchPartMeta(
  opts: RemoteFetchOpts,
): Promise<PartRecord> {
  const base = resolveBaseUrl(opts.partsBaseUrl);
  const res = await callRemote(
    `${base}/v1/parts/${encodeURIComponent(opts.id)}`,
    5000,
  );
  // Remote catalog records use their own schema rather than a kernelCAD
  // PartRecord — map them. Authored hash-bound manifests carry their connector
  // names; fetchPartHost synthesizes connectors only when no manifest is present.
  const raw = (await res.json()) as StepPartsRecord;
  return mapStepPartsRecord(raw);
}

export async function remoteFetchPartBytes(stepUrl: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(stepUrl, { signal: ctrl.signal });
    if (!res.ok) {
      throw new KernelError(
        'parts.fetch.api-error',
        `Remote STEP fetch returned ${res.status} for ${stepUrl}.`,
        undefined,
        'Retry later or fall back to bundled catalog (source: "local").',
      );
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(t);
  }
}
