// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Bounded content cache for exact native BREP assets. Cached master backends
// are never handed to a caller because shape transforms consume their source.

import { createHash } from 'node:crypto';
import { OcctBackend, registerOcctResetHook } from '../../kernel/backends/occt/occtBackend';
import { approxOcctBytes } from '../../kernel/backends/occt/shapeWeight';
import { importBrepBytes } from '../../kernel/backends/occt/importBrep';

const MAX_ENTRIES = 32;
const MAX_BYTES = 128 * 1024 * 1024;
const cache = new Map<string, { master: OcctBackend; bytes: number }>();

registerOcctResetHook(() => {
  // The OCCT reset hook also runs after WASM poisoning. The old module is
  // dropped, so do not attempt to dispose handles against its invalid heap.
  cache.clear();
});

function keyOf(bytes: Uint8Array | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Parse BREP bytes or clone the exact parsed master for this caller. */
export function importBrepCached(bytes: Uint8Array | Buffer): OcctBackend {
  const key = keyOf(bytes);
  const cached = cache.get(key);
  if (cached !== undefined) {
    cache.delete(key);
    cache.set(key, cached);
    return cached.master.clone();
  }

  const master = importBrepBytes(bytes);
  const weight = approxOcctBytes(master);
  if (weight > MAX_BYTES) return master;
  cache.set(key, { master, bytes: weight });
  while (cache.size > MAX_ENTRIES || brepCacheBytes() > MAX_BYTES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    const evicted = cache.get(oldest);
    cache.delete(oldest);
    evicted?.master.dispose();
  }
  return master.clone();
}

function brepCacheBytes(): number {
  let total = 0;
  for (const entry of cache.values()) total += entry.bytes;
  return total;
}

/** Clear cached masters while the OCCT heap is healthy. */
export function clearBrepParseCache(): void {
  for (const entry of cache.values()) entry.master.dispose();
  cache.clear();
}
