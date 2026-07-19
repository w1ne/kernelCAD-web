// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/cache/userCache.ts
//
// Shared on-disk user cache. Each consumer (textures, parts, future
// consumers) lives under its own subdirectory at
//   <root>/<consumer>/<sha256(url)><ext>
// with a per-consumer TTL policy passed at the call site. The root is
//   ~/.cache/kernelcad/  (or KERNELCAD_CACHE_DIR override)
//
// This is a behaviour-preserving extraction of the cache primitive that
// src/shared/textures/index.ts shipped first; that module now consumes
// this primitive and keeps its 1-week TTL.

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

export type CacheConsumer = 'textures' | 'parts';

export interface GetOrFetchOpts {
  consumer: CacheConsumer;
  url: string;
  ext: string;
  /** Milliseconds; `null` = no TTL (bytes never expire). */
  ttlMs: number | null;
  /** Hex sha256 of the expected CONTENT. When provided it is enforced twice:
   *  downloaded bytes are verified before writing, AND an existing cache entry
   *  whose content no longer matches is treated as a miss and re-fetched.
   *  Without it, entries keyed by sha256(URL) can never notice a republish. */
  expectedSha256?: string;
  /** Bytes fetcher — typically Node's built-in fetch. Pure-function shape so
   *  tests can stub without spinning up a server. */
  fetcher: (url: string) => Promise<Buffer>;
}

// Per-process URL memo so repeated calls within a single process never re-hit
// disk. Keyed by `<consumer>:<url>`.
const memo = new Map<string, string>();

export function userCacheRoot(): string {
  const env = process.env.KERNELCAD_CACHE_DIR;
  if (env && env.length > 0) return env;
  // Legacy compat for the texture-specific override (one release window).
  const legacyTextures = process.env.KERNELCAD_TEXTURE_CACHE_DIR;
  if (legacyTextures && legacyTextures.length > 0) {
    // The legacy var pointed AT the textures subdir; new layout has consumers
    // nested under a shared root. Use the parent of the legacy var when it
    // ends with /textures, otherwise fall through.
    if (
      legacyTextures.endsWith('/textures') ||
      legacyTextures.endsWith('\\textures')
    ) {
      return legacyTextures.slice(0, -'/textures'.length);
    }
  }
  let base: string;
  try {
    base = homedir();
  } catch {
    base = tmpdir();
  }
  return join(base, '.cache', 'kernelcad');
}

export function consumerDir(consumer: CacheConsumer): string {
  return join(userCacheRoot(), consumer);
}

export function cachePathFor(
  consumer: CacheConsumer,
  hashHex: string,
  ext: string,
): string {
  return join(consumerDir(consumer), `${hashHex}${ext}`);
}

function ensureConsumerDir(consumer: CacheConsumer): string {
  const dir = consumerDir(consumer);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function sha256(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** True when a cache entry exists but its CONTENT no longer matches what the
 *  caller expects.
 *
 *  Entries are keyed by sha256(URL), which says nothing about the bytes behind
 *  that URL. A republished artifact reuses the same key, so the stale copy is
 *  served forever. `expectedSha256` is the only signal that the content moved —
 *  so when the caller supplies it, it has to gate the cache HIT, not merely the
 *  download. */
function cachedContentIsStale(path: string, expectedSha256?: string): boolean {
  if (expectedSha256 === undefined) return false;
  try {
    return sha256(readFileSync(path)) !== expectedSha256.toLowerCase();
  } catch {
    return true; // unreadable entry — treat as a miss and re-fetch
  }
}

export async function getOrFetchAsync(opts: GetOrFetchOpts): Promise<string> {
  const key = `${opts.consumer}:${opts.url}`;
  const memoed = memo.get(key);
  if (
    memoed &&
    existsSync(memoed) &&
    !cachedContentIsStale(memoed, opts.expectedSha256)
  ) {
    return memoed;
  }

  ensureConsumerDir(opts.consumer);
  const path = cachePathFor(opts.consumer, sha256(opts.url), opts.ext);

  // Content check comes FIRST: a stale entry must miss regardless of TTL policy.
  // Parts pass ttlMs: null, so previously an existing file was returned with no
  // validation whatsoever, and every catalog rebuild was invisible to any
  // consumer that had fetched the part once. Observed in the wild: after a
  // rebuild the ESP32-C3 board kept serving 11.54mm-tall geometry instead of the
  // republished 5.56mm bare board, and the 1.5" OLED served 44.5x37 instead of
  // the corrected 47x34 — silently invalidating fit checks made against them.
  if (existsSync(path) && !cachedContentIsStale(path, opts.expectedSha256)) {
    if (opts.ttlMs === null) {
      memo.set(key, path);
      return path;
    }
    try {
      const ageMs = Date.now() - statSync(path).mtimeMs;
      if (ageMs < opts.ttlMs) {
        memo.set(key, path);
        return path;
      }
    } catch {
      // fall through to re-fetch
    }
  }

  const bytes = await opts.fetcher(opts.url);
  if (opts.expectedSha256 !== undefined) {
    const got = sha256(bytes);
    if (got !== opts.expectedSha256) {
      throw new Error(
        `userCache: checksum mismatch for ${opts.url}: expected ${opts.expectedSha256}, got ${got}.`,
      );
    }
  }
  writeFileSync(path, bytes);
  memo.set(key, path);
  return path;
}

/** Read cached bytes synchronously when the file is already present. */
export function readCached(
  consumer: CacheConsumer,
  hashHex: string,
  ext: string,
): Buffer | undefined {
  const path = cachePathFor(consumer, hashHex, ext);
  if (!existsSync(path)) return undefined;
  return readFileSync(path);
}

/** Test-only memo reset. */
export function __resetUserCacheForTests(): void {
  memo.clear();
}
