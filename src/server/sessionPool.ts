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
 */

import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { BuiltModel } from '../modeling/buildModel';

export interface SessionPoolEntry {
  readonly token: string;
  readonly scriptPath: string;
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
}

export interface SessionPool {
  /**
   * Look up or build a session for the given script path. If an entry already
   * exists for the script and hasn't been pruned, returns the same token so
   * multiple browser tabs on the same script share a session.
   */
  getOrCreate(scriptPath: string): Promise<SessionPoolEntry>;
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
  const byScript = new Map<string, string>();
  const internals = new Map<string, EntryInternals>();

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
    // a subsequent `getOrCreate` for the same script may have already
    // re-registered the script under a different token.
    if (byScript.get(entry.scriptPath) === token) {
      byScript.delete(entry.scriptPath);
    }
  }

  async function rebuildEntry(entry: SessionPoolEntry): Promise<void> {
    const model = await opts.build(entry.scriptPath);
    entry.model = model;
    touch(entry);
    wireEngine(entry);
    // Synthetic relower: the whole model may have changed, so signal with an
    // empty affected set — subscribers re-fetch mesh + review wholesale.
    fanout(entry.token, []);
  }

  return {
    async getOrCreate(scriptPath: string): Promise<SessionPoolEntry> {
      const existingToken = byScript.get(scriptPath);
      if (existingToken !== undefined) {
        const existing = byToken.get(existingToken);
        if (existing) return touch(existing);
        // Stale reverse-index entry (entry was pruned between accesses).
        byScript.delete(scriptPath);
      }
      const model = await opts.build(scriptPath);
      const token = randomUUID();
      const listeners = new Set<(affectedIds: string[]) => void>();
      const entry: SessionPoolEntry = {
        token,
        scriptPath,
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
      byScript.set(scriptPath, token);
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
