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
import { describeOcctThrow, isOcctOutOfMemory } from '../../kernel/backends/occt/occtException';

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

const cache = new Map<string, OcctBackend>();
/** One parse master per content hash while its async import is in progress.
 *  It must be reserved before `initOcct()` / `importSTEP()` yield so concurrent
 *  callers do not all observe the cold cache and build duplicate masters. */
const pending = new Map<string, Promise<OcctBackend>>();
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
async function parseMaster(key: string, bytes: Buffer | Uint8Array): Promise<OcctBackend> {
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

  const master = new OcctBackend(imported as replicad.Shape3D);
  // A pending entry makes this branch unreachable in normal operation. Keep
  // the guard because a reset/recovery boundary can retire an in-flight entry:
  // never overwrite a live master or orphan the just-parsed OCCT handle.
  const existing = cache.get(key);
  if (existing) {
    master.dispose();
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }

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

  return master;
}

/** Reserve the per-hash promise before parsing can yield. The completion
 *  handlers clear only their own entry, so a later retry cannot be erased by
 *  an older failed import finishing afterwards. */
function reservePendingParse(key: string, bytes: Buffer | Uint8Array): Promise<OcctBackend> {
  let resolveMaster!: (master: OcctBackend) => void;
  let rejectMaster!: (reason?: unknown) => void;
  const inFlight = new Promise<OcctBackend>((resolve, reject) => {
    resolveMaster = resolve;
    rejectMaster = reject;
  });
  pending.set(key, inFlight);

  void parseMaster(key, bytes).then(
    (master) => {
      if (pending.get(key) === inFlight) pending.delete(key);
      resolveMaster(master);
    },
    (error: unknown) => {
      if (pending.get(key) === inFlight) pending.delete(key);
      rejectMaster(error);
    },
  );

  return inFlight;
}

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

  const inFlight = pending.get(key);
  if (inFlight) {
    // A pending parse is a logical cache hit: it has already reserved the one
    // master this content hash may create, and each waiter still clones it.
    hits++;
    return (await inFlight).clone();
  }

  const master = await reservePendingParse(key, bytes);
  return master.clone();
}

/** Test-only: parse-cache instrumentation. */
export function __stepParseCacheStats(): { hits: number; misses: number; size: number } {
  return { hits, misses, size: cache.size };
}

/** Drop every cached master, returning its BREP to the OCCT wasm heap. Leaves
 *  the hit/miss counters alone — this runs on the OOM recovery path, where the
 *  instrumentation is what tells us reclamation happened. */
function purgeMasters(): void {
  for (const v of cache.values()) v.dispose();
  cache.clear();
}

/** Test-only: drop all cached masters (disposing their OCCT handles) and reset counters. */
export function __resetStepParseCache(): void {
  purgeMasters();
  pending.clear();
  hits = 0;
  misses = 0;
}
