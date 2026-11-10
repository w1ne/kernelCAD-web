// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/evaluateCache.ts
//
// In-process memo of a successful evaluateAndBuildScript. Sequential
// verify({ swept-collision }) + verify({ physics }) on the same file
// currently rebuild the model (~7 s) and drop WeakMap identity, so the
// physics pass repeats work the sweep already paid for. The cache is
// keyed on file identity (path + device + inode + mtime + ctime + size)
// and is skipped when the caller supplies a custom API factory, baseline
// selections, extra requirements, or skipDfmGate. A same-size rewrite
// that restores mtime still changes ctime, so the key misses and we
// rebuild.

import { statSync } from 'node:fs';

const cache = new Map<string, unknown>();

export function clearEvaluateCache(): void {
  cache.clear();
}

export function evaluateCacheKey(
  input: { file?: string; code?: string; kernel?: string; scriptDir?: string; baseline?: unknown; requirements?: unknown },
  opts?: { apiFactory?: unknown; skipDfmGate?: boolean },
): string | undefined {
  if (input.baseline !== undefined) return undefined;
  if (input.requirements !== undefined) return undefined;
  if (opts?.apiFactory !== undefined) return undefined;
  if (opts?.skipDfmGate === true) return undefined;
  // Inline `code` is what unit tests pass. Caching it would share one
  // Assembly across tests that expect a fresh capture. File evaluates are
  // the sequential verify({ file }) path this cache exists for.
  if (input.code !== undefined) return undefined;
  const kernel = input.kernel ?? 'occt';
  if (input.file !== undefined) {
    try {
      const stat = statSync(input.file);
      return `file:${kernel}:${input.file}:${stat.dev}:${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function getEvaluatedScript<T>(key: string): T | undefined {
  // Same object on purpose: sequential verify passes must share Assembly
  // and OCCT shape identity so WeakMap memos (relative-pose, hull points)
  // hit. Callers must not mutate the cached result.
  return cache.get(key) as T | undefined;
}

export function rememberEvaluatedScript<T extends { evaluation: { exitCode: number } }>(
  key: string,
  result: T,
): void {
  if (result.evaluation.exitCode !== 0) return;
  cache.set(key, result);
}
