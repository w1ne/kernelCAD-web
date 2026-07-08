// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/stepParseCache.ts
//
// Content-addressed cache for parsed STEP geometry.
//
// Every Studio rebuild re-runs the .kcad.ts capture phase from scratch, so
// each `lib.fromSTEP` / `lib.fetchPart` call would otherwise re-run
// replicad.importSTEP — the expensive STEP-text → BREP reconstruction — even
// when the bytes are byte-identical to the previous rebuild. That repeated
// re-parse is the dominant cost behind the Studio "Computing" stall on models
// that carry imported parts.
//
// Keyed by sha256(bytes). On a hit we hand back `master.clone()`, never the
// cached master itself: the per-session backend gets parked on
// session.importedGeometry and is then consumed during lowering (replicad's
// translate/rotate/mirror destroy their source OCCT handle), so the master
// must stay independent and alive across sessions. This mirrors the
// clone-on-handback contract the lowerer already uses for importedStep
// records (occtLowerer.ts).
//
// The cache is a bounded LRU: capacity caps the number of live master BREP
// shapes held in the OCCT WASM heap; evicted masters are disposed.

import * as replicad from 'replicad';
import { createHash } from 'node:crypto';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';

/** Why a STEP byte buffer could not be turned into a 3D solid. Reported so
 *  callers map to their own KernelError code/hint — the cache stays free of
 *  caller-specific diagnostics. */
export type StepParseFailure = 'parse' | 'no-solid';

export class StepParseError extends Error {
  // erasableSyntaxOnly forbids constructor parameter properties — declare explicitly.
  readonly reason: StepParseFailure;
  constructor(reason: StepParseFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = 'StepParseError';
  }
}

/** Max distinct parsed STEP master shapes kept alive. The working set is the
 *  distinct imported parts in the current model; a few dozen covers a large
 *  assembly while bounding WASM-heap growth across a long session. */
const MAX_ENTRIES = 32;

const cache = new Map<string, OcctBackend>();
let hits = 0;
let misses = 0;

function sha256Hex(bytes: Buffer | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Parse STEP bytes into an OcctBackend, reusing a cached parse when the exact
 * same bytes were seen before. Always returns a fresh clone the caller owns
 * and may safely consume (transform / dispose) without affecting the cache.
 *
 * @throws StepParseError('parse')    replicad.importSTEP rejected the bytes
 * @throws StepParseError('no-solid') the import held no 3D solid body
 */
export async function importStepCached(bytes: Buffer | Uint8Array): Promise<OcctBackend> {
  const key = sha256Hex(bytes);

  const cached = cache.get(key);
  if (cached) {
    // LRU bump: re-insert to mark most-recently-used.
    cache.delete(key);
    cache.set(key, cached);
    hits++;
    return cached.clone();
  }

  await initOcct();
  // replicad.importSTEP wants a Blob. The bytes copy is unavoidable.
  const blob = new Blob([new Uint8Array(bytes)]);
  let imported: replicad.AnyShape;
  try {
    imported = await replicad.importSTEP(blob);
  } catch (e) {
    throw new StepParseError('parse', e instanceof Error ? e.message : String(e));
  }
  // Duck-type the Shape3D check: `meshShape` lives on replicad's `_3DShape`
  // prototype only, so a 2D Sketch import correctly fails here.
  if (!imported || typeof (imported as { meshShape?: unknown }).meshShape !== 'function') {
    throw new StepParseError('no-solid', 'STEP import contained no 3D solid body');
  }

  const master = new OcctBackend(imported as replicad.Shape3D);
  cache.set(key, master);
  misses++;

  // Evict oldest beyond capacity; dispose the evicted master's OCCT handle so
  // the WASM heap doesn't grow unbounded. Outstanding clones are independent
  // handles and are unaffected.
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    const evicted = cache.get(oldestKey);
    cache.delete(oldestKey);
    evicted?.dispose();
  }

  return master.clone();
}

/** Test-only: parse-cache instrumentation. */
export function __stepParseCacheStats(): { hits: number; misses: number; size: number } {
  return { hits, misses, size: cache.size };
}

/** Test-only: drop all cached masters (disposing their OCCT handles) and reset counters. */
export function __resetStepParseCache(): void {
  for (const v of cache.values()) v.dispose();
  cache.clear();
  hits = 0;
  misses = 0;
}
