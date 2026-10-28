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
import { OcctBackend, initOcct, registerOcctResetHook } from '../../kernel/backends/occt/occtBackend';
import { describeOcctThrow, isOcctOutOfMemory } from '../../kernel/backends/occt/occtException';
import { approxOcctBytes } from '../../kernel/backends/occt/shapeWeight';
import { healImportedStep } from './healStep';

/** Backends whose STEP import was normalized by `healImportedStep`. Weak so a
 *  disposed backend is collectable; read by `fromSTEP` to stamp metadata. */
const healedStepBackends = new WeakSet<object>();

/** Whether this backend came from a STEP import that was topology-normalized. */
export function isStepBackendHealed(backend: object): boolean {
  return healedStepBackends.has(backend);
}

/** Why a STEP byte buffer could not be turned into a 3D solid. Reported so
 *  callers map to their own KernelError code/hint — the cache stays free of
 *  caller-specific diagnostics.
 *
 *  `out-of-memory` is deliberately distinct from `parse`: it says nothing about
 *  the bytes. The OCCT wasm heap filled up, the same bytes parse fine on a
 *  healthy heap, and telling the caller their file is malformed sends them to
 *  debug the wrong thing. See occtException.ts for how we identify it. */
export type StepParseFailure = 'parse' | 'no-solid' | 'out-of-memory';

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
/** Approximate native bytes of masters. A count cap of 32 still fits a
 *  gigabyte when each master is a large assembly, and the wasm heap never
 *  shrinks back under the evaluator RSS cap. */
const MAX_BYTES = 128 * 1024 * 1024;

interface CachedMaster {
  master: OcctBackend;
  bytes: number;
}

const cache = new Map<string, CachedMaster>();
let maxEntries = MAX_ENTRIES;
let maxBytes = MAX_BYTES;
let hits = 0;
let misses = 0;

// When OCCT is reset after wasm poison, abandon cached masters WITHOUT dispose —
// dispose() would call into the poisoned heap and throw again. The old wasm
// module is being dropped; its handles are unreachable after reset.
registerOcctResetHook(() => {
  cache.clear();
});


function sha256Hex(bytes: Buffer | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Parse STEP bytes into an OcctBackend, reusing a cached parse when the exact
 * same bytes were seen before. Returns a fresh clone the caller owns, unless
 * the solid is larger than the byte budget: then the caller owns the only
 * copy and nothing is pinned.
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
    return cloneMaster(cached.master);
  }

  await initOcct();
  // replicad.importSTEP wants a Blob. The bytes copy is unavoidable.
  let imported: replicad.AnyShape;
  try {
    imported = await replicad.importSTEP(new Blob([new Uint8Array(bytes)]));
  } catch (e) {
    if (!isOcctOutOfMemory(e)) {
      throw new StepParseError('parse', describeOcctThrow(e));
    }
    // Self-heal: the masters this cache pins are, by design, the largest
    // long-lived consumers of the OCCT wasm heap (MAX_ENTRIES of them, each a
    // fully reconstructed BREP). In a long-lived host — the MCP server, a
    // Studio session — they are the reason the heap reached its ceiling, and
    // once it does EVERY subsequent import fails, permanently, until the
    // process restarts. Drop them and retry once with the same bytes.
    //
    // Outstanding clones handed to callers are independent OCCT handles, so
    // disposing the masters cannot invalidate geometry already in use.
    purgeMasters();
    try {
      imported = await replicad.importSTEP(new Blob([new Uint8Array(bytes)]));
    } catch (retryErr) {
      // Still out of memory after reclaiming every master: the heap pressure is
      // coming from outside this cache and we have nothing left to give back.
      throw new StepParseError(
        isOcctOutOfMemory(retryErr) ? 'out-of-memory' : 'parse',
        describeOcctThrow(retryErr),
      );
    }
  }
  // Duck-type the Shape3D check: `meshShape` lives on replicad's `_3DShape`
  // prototype only, so a 2D Sketch import correctly fails here.
  if (!imported || typeof (imported as { meshShape?: unknown }).meshShape !== 'function') {
    throw new StepParseError('no-solid', 'STEP import contained no 3D solid body');
  }

  // Normalize same-domain faces before handing the shape to the backend.
  // Third-party STEP re-exports carry split/duplicate patches that survive
  // `BRepCheck` but tessellate into non-manifold edges; unification collapses
  // them without moving surfaces. A failed/invalid unification returns the
  // original import untouched.
  const healed = healImportedStep(imported as replicad.Shape3D);
  const master = new OcctBackend(healed.shape);
  if (healed.unified || healed.repaired) healedStepBackends.add(master);
  misses++;
  const weight = approxOcctBytes(master);
  // A single master over the budget is handed to the caller and not pinned.
  // The next import of the same bytes parses again rather than retaining a
  // solid the evaluator cannot afford to keep.
  if (weight <= maxBytes) {
    cache.set(key, { master, bytes: weight });
    evictMasters(key);
    return cloneMaster(master);
  }
  return master;
}

function cacheBytes(): number {
  let total = 0;
  for (const entry of cache.values()) total += entry.bytes;
  return total;
}

/** Evict oldest masters past the count cap and the byte budget. */
function evictMasters(protectKey?: string): void {
  while (cache.size > maxEntries || cacheBytes() > maxBytes) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey === undefined || oldestKey === protectKey) break;
    const evicted = cache.get(oldestKey);
    cache.delete(oldestKey);
    evicted?.master.dispose();
    if (cache.size === 0) break;
  }
}

/** Clone a cached master, carrying its healed-import mark to the clone. */
function cloneMaster(master: OcctBackend): OcctBackend {
  const clone = master.clone();
  if (healedStepBackends.has(master)) healedStepBackends.add(clone);
  return clone;
}

/** Test-only: parse-cache instrumentation. */
export function __stepParseCacheStats(): { hits: number; misses: number; size: number } {
  return { hits, misses, size: cache.size };
}

/** Drop every cached master, returning its BREP to the OCCT wasm heap. Leaves
 *  the hit/miss counters alone — this runs on the OOM recovery path, where the
 *  instrumentation is what tells us reclamation happened. */
function purgeMasters(): void {
  for (const v of cache.values()) v.master.dispose();
  cache.clear();
}

/** Test-only: drop all cached masters (disposing their OCCT handles) and reset counters. */
export function __resetStepParseCache(): void {
  purgeMasters();
  hits = 0;
  misses = 0;
  maxEntries = MAX_ENTRIES;
  maxBytes = MAX_BYTES;
}

/** Test-only: tighten the cache so a unit test can force eviction. */
export function __setStepParseCacheLimitsForTests(limits: { maxEntries?: number; maxBytes?: number }): void {
  if (limits.maxEntries !== undefined) maxEntries = limits.maxEntries;
  if (limits.maxBytes !== undefined) maxBytes = limits.maxBytes;
}
