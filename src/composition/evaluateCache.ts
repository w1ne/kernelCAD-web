// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/evaluateCache.ts
//
// In-process memo of a successful evaluateAndBuildScript. Sequential
// verify({ swept-collision }) + verify({ physics }) on the same file
// currently rebuild the model (~7 s) and drop WeakMap identity, so the
// physics pass repeats work the sweep already paid for. The cache is
// keyed on file identity (path + mtime + size), and is
// skipped when the caller supplies a custom API factory, baseline
// selections, or skipDfmGate.

import { statSync } from 'node:fs';

const cache = new Map<string, unknown>();

export function clearEvaluateCache(): void {
  cache.clear();
}

export function evaluateCacheKey(
  input: { file?: string; code?: string; kernel?: string; scriptDir?: string; baseline?: unknown },
  opts?: { apiFactory?: unknown; skipDfmGate?: boolean },
): string | undefined {
  if (input.baseline !== undefined) return undefined;
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
      return `file:${kernel}:${input.file}:${stat.mtimeMs}:${stat.size}`;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function getEvaluatedScript<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function rememberEvaluatedScript<T extends { evaluation: { exitCode: number } }>(
  key: string,
  result: T,
): void {
  if (result.evaluation.exitCode !== 0) return;
  cache.set(key, result);
}
