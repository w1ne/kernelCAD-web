// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/evaluateCache.ts
//
// In-process memo of a successful evaluateAndBuildScript. Sequential
// verify({ swept-collision }) + verify({ physics }) on the same file
// currently rebuild the model (~7 s) and drop WeakMap identity, so the
// physics pass repeats work the sweep already paid for. The cache is
// keyed on file identity (path + device + inode + mtime + ctime + size)
// plus the identity of imported assets (STEP, STL, fonts, and catalog
// parts loaded through a literal fetchPart call that does not go through
// the `lib` namespace). It is skipped when the caller supplies a custom
// API factory, baseline selections, extra requirements, or skipDfmGate,
// when an import path is not a literal we can hash, or when the script
// mentions `lib` at all — aliases such as `const parts = lib` can load
// catalog geometry that cannot be hashed statically. A same-size rewrite
// that restores mtime
// still changes ctime, so the key misses and we rebuild. At most a few
// successful evaluates are kept so older models can be collected.

import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { importIdentity } from '../modeling/warm/importIdentity';

/** Sequential sweep + physics only need one live entry; keep a few more
 *  so an interactive session evaluating several files still hits. */
export const EVALUATE_CACHE_LIMIT = 4;

const cache = new Map<string, unknown>();

export function clearEvaluateCache(): void {
  cache.clear();
}

export function evaluateCacheSize(): number {
  return cache.size;
}

function fileIdentity(path: string, kernel: string): string | undefined {
  try {
    const stat = statSync(path);
    return `file:${kernel}:${path}:${stat.dev}:${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
  } catch {
    return undefined;
  }
}

function importsAreProvable(identity: string): boolean {
  if (identity.includes('unprovable:') || identity.includes('unread:')) return false;
  if (identity.includes('missing:') || identity.includes('unreadable:')) return false;
  return true;
}

/** Any use of the script `lib` namespace can load catalog geometry
 *  (including `const parts = lib; parts.part(...)`). Those paths cannot
 *  all be hashed statically, so the cache is skipped. Direct
 *  `fromSTEP('file.step')` calls without `lib.` remain eligible. */
function usesUnhashedCatalogApi(source: string): boolean {
  return /\blib\b/.test(source);
}

export async function evaluateCacheKey(
  input: { file?: string; code?: string; kernel?: string; scriptDir?: string; baseline?: unknown; requirements?: unknown },
  opts?: { apiFactory?: unknown; skipDfmGate?: boolean },
): Promise<string | undefined> {
  if (input.baseline !== undefined) return undefined;
  if (input.requirements !== undefined) return undefined;
  if (opts?.apiFactory !== undefined) return undefined;
  if (opts?.skipDfmGate === true) return undefined;
  // Inline `code` is what unit tests pass. Caching it would share one
  // Assembly across tests that expect a fresh capture. File evaluates are
  // the sequential verify({ file }) path this cache exists for.
  if (input.code !== undefined) return undefined;
  const kernel = input.kernel ?? 'occt';
  if (input.file === undefined) return undefined;
  const fileKey = fileIdentity(input.file, kernel);
  if (fileKey === undefined) return undefined;
  let source: string;
  try {
    source = readFileSync(input.file, 'utf8');
  } catch {
    return undefined;
  }
  if (usesUnhashedCatalogApi(source)) return undefined;
  const scriptDir = input.scriptDir ?? dirname(resolve(input.file));
  const imports = await importIdentity(source, scriptDir);
  if (!importsAreProvable(imports)) return undefined;
  return `${fileKey}:imports:${imports}`;
}

export function getEvaluatedScript<T>(key: string): T | undefined {
  // Same object on purpose: sequential verify passes must share Assembly
  // and OCCT shape identity so WeakMap memos (relative-pose, hull points)
  // hit. Callers must not mutate the cached result.
  const hit = cache.get(key);
  if (hit === undefined) return undefined;
  cache.delete(key);
  cache.set(key, hit);
  return hit as T;
}

export function rememberEvaluatedScript<T extends { evaluation: { exitCode: number } }>(
  key: string,
  result: T,
): void {
  if (result.evaluation.exitCode !== 0) return;
  if (cache.has(key)) cache.delete(key);
  cache.set(key, result);
  while (cache.size > EVALUATE_CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}
