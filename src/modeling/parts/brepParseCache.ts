// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Bounded content cache for exact native BREP assets. Cached master backends
// are never handed to a caller because shape transforms consume their source.

import { createHash } from 'node:crypto';
import { OcctBackend, registerOcctResetHook } from '../../kernel/backends/occt/occtBackend';
import { importBrepBytes } from '../../kernel/backends/occt/importBrep';

const MAX_ENTRIES = 32;
const cache = new Map<string, OcctBackend>();

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
    return cached.clone();
  }

  const master = importBrepBytes(bytes);
  cache.set(key, master);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    const evicted = cache.get(oldest);
    cache.delete(oldest);
    evicted?.dispose();
  }
  return master.clone();
}

/** Clear cached masters while the OCCT heap is healthy. */
export function clearBrepParseCache(): void {
  for (const backend of cache.values()) backend.dispose();
  cache.clear();
}
