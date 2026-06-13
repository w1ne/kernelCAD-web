// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Slice 2E.bridge — long-lived session pool keyed by sessionToken.
 *
 * Why this exists
 * ===============
 * The Vite dev middleware spawns a fresh `loadScriptFeatures` + `CaptureSession`
 * on every HTTP request. That worked for read-only `/__kernelcad/mesh` calls
 * but it makes server-side `RecomputeEngine.onRelower` subscribers unreachable:
 * the SSE handler would attach to one engine, while `POST /__kernelcad/params`
 * would build and mutate a different engine. The browser would never see the
 * re-lower events the kernel emits.
 *
 * SessionPool fixes this by holding the `BuiltModel` (with its attached
 * `CaptureSession` + `RecomputeEngine`) across requests. A reverse index
 * (`scriptPath → token`) lets multiple browser tabs viewing the same script
 * share one session so parameter edits in one tab fan out to all SSE
 * subscribers.
 *
 * Relower hub
 * ===========
 * SSE subscribers attach to `entry.onRelower(...)`, an entry-level hub that
 * is stable across model rebuilds. The pool forwards the live engine's
 * `onRelower` events into the hub, and `rebuildByScript` re-wires the hub to
 * the freshly-built engine before emitting a synthetic relower — so an open
 * SSE connection survives a disk-edit rebuild and tells the browser to
 * re-fetch mesh + review.
 *
 * Memory bound
 * ============
 * `prune()` evicts entries whose `lastAccessAt` is older than `ttlMs`. The
 * `vite.config.ts` plugin runs `prune()` on a `setInterval`. `get(token)`
 * bumps `lastAccessAt` so an active SSE connection keeps the session alive.
 *
 * An optional `maxEntries` count cap is the hard memory backstop for the
 * hosted server: each entry pins a whole `BuiltModel` in the OCCT WASM heap, so
 * an unbounded pool of N authenticated users would eventually OOM the single
 * WASM instance. When inserting a new entry would exceed `maxEntries`, the
 * least-recently-accessed entry is evicted first via the SAME drop path TTL
 * uses, so SSE clients see identical `session.evicted` semantics. Default
 * (undefined) = unbounded, preserving the single-user vite dev behavior.
 *
 * Multi-user scoping + global kernel lock
 * =======================================
 * The pool keys entries by an opaque `key` the caller composes, NOT by the
 * bare `scriptPath`. The vite dev path passes only a `scriptPath` (so the key
 * IS the path — unchanged single-user behavior); the hosted server composes a
 * per-user key like `${userId}|${scriptPath}` so two users opening the same
 * script get DIFFERENT tokens/entries and a leaked/guessed token can't reach
 * another user's live model. The owner is carried on the entry as `ownerId`
 * (the pool does NOT enforce auth — it just records the owner so the server
 * route can 403 on a token/owner mismatch).
 *
 * The hosted server shares ONE OCCT WASM instance across the pool AND its
 * stateless `/__kernelcad/mesh` route, so every kernel-touching op must be
 * serialized behind a global mutex the CALLER injects via `runExclusive`. The
 * pool wraps its OWN kernel calls (the `build(...)` in `getOrCreate`/rebuild)
 * in `runExclusive`, and re-exposes it as `pool.runExclusive` so the ENDPOINTS
 * (param-update drain, per-frame bake solves — which live in the endpoint
 * files, not the pool) route their kernel work through the same lock. The
 * default `runExclusive` is an identity passthrough (`fn => fn()`), so the vite
 * dev path runs unlocked exactly as before.
 */

import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { BuiltModel } from '../modeling/buildModel';

export interface SessionPoolEntry {
  readonly token: string;
  readonly scriptPath: string;
  /** Opaque identity key the caller composed (e.g. `${userId}|${scriptPath}`
   *  on the hosted server, or just `scriptPath` on the vite dev path). Two
   *  `getOrCreate` calls with the same key share one entry; different keys get
   *  distinct entries even for the same `scriptPath`. */
  readonly key: string;
  /** Owner this session belongs to (the hosted server's authenticated user
   *  id), or `undefined` in single-user dev mode. The pool only RECORDS this —
   *  it does NOT enforce auth. The server route reads `entry.ownerId` to 403 on
   *  a token/owner mismatch (a leaked/guessed token from another user). */
  readonly ownerId?: string;
  /** Swapped in place by `rebuildByScript` — always read, never cache. */
  model: BuiltModel;
  /** Wall-clock ms (Date.now()) of the most recent access. */
  lastAccessAt: number;
  /** Entry-level relower hub. Stable across `rebuildByScript` model swaps —
   *  prefer this over `model.session.engine.onRelower` for any subscriber
   *  that outlives a single request (SSE). */
  onRelower(cb: (affectedIds: string[]) => void): () => void;
}

export interface SessionPoolOptions {
  /** Builder that produces a `BuiltModel` for a script path. Injected so
   *  tests can substitute a fake without booting OCCT. */
  build: (scriptPath: string) => Promise<BuiltModel>;
  /** Time-to-live for idle sessions, in milliseconds. Entries whose
   *  `lastAccessAt` is older than `now - ttlMs` are evicted on `prune()`. */
  ttlMs: number;
  /** Hard cap on live entries. Inserting a new entry past this evicts the
   *  least-recently-accessed entry first (same drop path TTL uses). Default
   *  (undefined) = unbounded, preserving single-user vite behavior. The hosted
   *  server sets this as the OCCT-heap memory backstop across N users. */
  maxEntries?: number;
  /** Caller-provided global mutex. Every kernel-touching op (the pool's
   *  `build(...)`, plus endpoint param-update/bake solves routed through
   *  `pool.runExclusive`) runs inside this so a single shared OCCT WASM
   *  instance is never re-entered concurrently. Default = identity passthrough
   *  (`fn => fn()`), i.e. no locking — the vite dev path is single-user. */
  runExclusive?: <T>(fn: () => Promise<T>) => Promise<T>;
}

/** Options for a single `getOrCreate` call. `key` defaults to the bare
 *  `scriptPath` (single-user dev behavior); the hosted server composes a
 *  per-user key and passes `ownerId` so the route can later authorize. */
export interface GetOrCreateOptions {
  /** Opaque identity key. Defaults to `scriptPath` when omitted. */
  key?: string;
  /** Owner recorded on the entry (the authenticated user id). */
  ownerId?: string;
}

export interface SessionPool {
  /**
   * Look up or build a session for the given script path. Sessions are keyed by
   * `opts.key` (defaulting to `scriptPath`): if a live entry already exists for
   * that key, the same token is returned so multiple browser tabs sharing the
   * key share a session. The hosted server passes a per-user `key`
   * (`${userId}|${scriptPath}`) and an `ownerId` so distinct users never share
   * an entry; the vite dev path passes just `scriptPath` (key === scriptPath,
   * ownerId undefined) — unchanged single-user behavior.
   *
   * `scriptPath` is always the real path used to build/load the model.
   */
  getOrCreate(scriptPath: string, opts?: GetOrCreateOptions): Promise<SessionPoolEntry>;
  /** Run `fn` under the pool's global kernel lock. Endpoints (param-update
   *  drain, per-frame bake solves) MUST route their kernel work through this so
   *  it serializes against the pool's own `build(...)` on the shared OCCT WASM
   *  instance. Default impl is an identity passthrough (no locking). */
  runExclusive<T>(fn: () => Promise<T>): Promise<T>;
  /** Get the entry by token. Side effect: bumps `lastAccessAt`. */
  get(token: string): SessionPoolEntry | undefined;
  /** Drop the entry (e.g. when the user closes the tab or rebuilds). */
  eject(token: string): void;
  /** Evict all entries whose `lastAccessAt` is older than `ttlMs`. */
  prune(): void;
  /** Iterate live entries (for SSE broadcast / diagnostics). */
  entries(): IterableIterator<SessionPoolEntry>;
  /**
   * Rebuild the model for any live session whose scriptPath matches `file`
   * (path-resolved comparison), swap it into the entry, and fan a synthetic
   * relower out to the entry's hub subscribers. Used by the dev server's
   * file watcher so disk edits to a `.kcad.ts` reach open Studio tabs.
   *
   * Returns true when a matching session existed and was rebuilt. A failed
   * build (e.g. mid-edit syntax error) keeps the previous model and
   * rethrows so the caller can log; the session stays usable.
   *
   * Concurrent calls for the same entry are serialized; at most one extra
   * rebuild is queued (rapid successive saves coalesce onto the trailing
   * rebuild, which reads the newest file state anyway).
   */
  rebuildByScript(file: string): Promise<boolean>;
}

interface EntryInternals {
  listeners: Set<(affectedIds: string[]) => void>;
  detachEngine: (() => void) | null;
  rebuildInFlight: Promise<void> | null;
  rebuildQueued: boolean;
}

export function createSessionPool(opts: SessionPoolOptions): SessionPool {
  const byToken = new Map<string, SessionPoolEntry>();
  // Reverse index from the opaque identity key (NOT the bare scriptPath) to
  // the token, so same-key requests share a session and different keys (e.g.
  // two users on the same script) get distinct entries.
  const byKey = new Map<string, string>();
  const internals = new Map<string, EntryInternals>();
  // Identity passthrough by default — the vite dev path is single-user and
  // runs the kernel unlocked exactly as before.
  const runExclusive: <T>(fn: () => Promise<T>) => Promise<T> =
    opts.runExclusive ?? ((fn) => fn());

  function touch(entry: SessionPoolEntry): SessionPoolEntry {
    entry.lastAccessAt = Date.now();
    return entry;
  }

  function fanout(token: string, affectedIds: string[]): void {
    const ints = internals.get(token);
    if (!ints) return;
    for (const cb of ints.listeners) cb(affectedIds);
  }

  /** Forward the entry's CURRENT engine relower events into the hub. */
  function wireEngine(entry: SessionPoolEntry): void {
    const ints = internals.get(entry.token);
    if (!ints) return;
    ints.detachEngine?.();
    const engine = entry.model.session.engine;
    ints.detachEngine = engine
      ? engine.onRelower((affectedIds: string[]) => fanout(entry.token, affectedIds))
      : null;
  }

  function drop(token: string): void {
    const entry = byToken.get(token);
    if (!entry) return;
    internals.get(token)?.detachEngine?.();
    internals.delete(token);
    byToken.delete(token);
    // Only drop the reverse index if it still points at this token —
    // a subsequent `getOrCreate` for the same key may have already
    // re-registered the key under a different token.
    if (byKey.get(entry.key) === token) {
      byKey.delete(entry.key);
    }
  }

  /** Evict the single least-recently-accessed entry. Used as the `maxEntries`
   *  backstop on insert. Same drop path as TTL eviction → identical
   *  `session.evicted` semantics for SSE clients. */
  function evictLru(): void {
    let oldestToken: string | undefined;
    let oldestAt = Infinity;
    for (const [token, entry] of byToken) {
      if (entry.lastAccessAt < oldestAt) {
        oldestAt = entry.lastAccessAt;
        oldestToken = token;
      }
    }
    if (oldestToken !== undefined) drop(oldestToken);
  }

  async function rebuildEntry(entry: SessionPoolEntry): Promise<void> {
    const model = await runExclusive(() => opts.build(entry.scriptPath));
    entry.model = model;
    touch(entry);
    wireEngine(entry);
    // Synthetic relower: the whole model may have changed, so signal with an
    // empty affected set — subscribers re-fetch mesh + review wholesale.
    fanout(entry.token, []);
  }

  return {
    runExclusive,

    async getOrCreate(scriptPath: string, options?: GetOrCreateOptions): Promise<SessionPoolEntry> {
      const key = options?.key ?? scriptPath;
      const ownerId = options?.ownerId;
      const existingToken = byKey.get(key);
      if (existingToken !== undefined) {
        const existing = byToken.get(existingToken);
        if (existing) return touch(existing);
        // Stale reverse-index entry (entry was pruned/evicted between accesses).
        byKey.delete(key);
      }
      const model = await runExclusive(() => opts.build(scriptPath));
      // Enforce the count cap AFTER the (awaited) build but BEFORE inserting,
      // so a fresh insert never pushes the live count past maxEntries. Evict
      // the LRU entry first — never the one we're about to add.
      if (opts.maxEntries !== undefined) {
        while (byToken.size >= opts.maxEntries) {
          const before = byToken.size;
          evictLru();
          if (byToken.size >= before) break; // safety: nothing evictable
        }
      }
      const token = randomUUID();
      const listeners = new Set<(affectedIds: string[]) => void>();
      const entry: SessionPoolEntry = {
        token,
        scriptPath,
        key,
        ownerId,
        model,
        lastAccessAt: Date.now(),
        onRelower(cb) {
          listeners.add(cb);
          return () => {
            listeners.delete(cb);
          };
        },
      };
      internals.set(token, {
        listeners,
        detachEngine: null,
        rebuildInFlight: null,
        rebuildQueued: false,
      });
      byToken.set(token, entry);
      byKey.set(key, token);
      wireEngine(entry);
      return entry;
    },

    get(token: string): SessionPoolEntry | undefined {
      const entry = byToken.get(token);
      if (!entry) return undefined;
      return touch(entry);
    },

    eject(token: string): void {
      drop(token);
    },

    prune(): void {
      const cutoff = Date.now() - opts.ttlMs;
      for (const [token, entry] of byToken) {
        if (entry.lastAccessAt < cutoff) {
          drop(token);
        }
      }
    },

    entries(): IterableIterator<SessionPoolEntry> {
      return byToken.values();
    },

    async rebuildByScript(file: string): Promise<boolean> {
      const resolved = resolve(file);
      let rebuilt = false;
      for (const entry of byToken.values()) {
        if (resolve(entry.scriptPath) !== resolved) continue;
        const ints = internals.get(entry.token);
        if (!ints) continue;
        if (ints.rebuildInFlight) {
          // Coalesce: the queued rebuild reads the newest file state, so
          // any number of saves during an in-flight rebuild need exactly
          // one trailing rebuild.
          ints.rebuildQueued = true;
          await ints.rebuildInFlight;
          if (!ints.rebuildQueued) {
            rebuilt = true;
            continue;
          }
        }
        ints.rebuildQueued = false;
        const run = rebuildEntry(entry).finally(() => {
          ints.rebuildInFlight = null;
        });
        ints.rebuildInFlight = run;
        await run;
        rebuilt = true;
      }
      return rebuilt;
    },
  };
}
