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
 * Memory bound
 * ============
 * `prune()` evicts entries whose `lastAccessAt` is older than `ttlMs`. The
 * `vite.config.ts` plugin runs `prune()` on a `setInterval`. `get(token)`
 * bumps `lastAccessAt` so an active SSE connection keeps the session alive.
 */

import { randomUUID } from 'node:crypto';
import type { BuiltModel } from '../modeling/buildModel';

export interface SessionPoolEntry {
  readonly token: string;
  readonly scriptPath: string;
  readonly model: BuiltModel;
  /** Wall-clock ms (Date.now()) of the most recent access. */
  lastAccessAt: number;
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
}

export function createSessionPool(opts: SessionPoolOptions): SessionPool {
  const byToken = new Map<string, SessionPoolEntry>();
  const byScript = new Map<string, string>();

  function touch(entry: SessionPoolEntry): SessionPoolEntry {
    entry.lastAccessAt = Date.now();
    return entry;
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
      const entry: SessionPoolEntry = {
        token: randomUUID(),
        scriptPath,
        model,
        lastAccessAt: Date.now(),
      };
      byToken.set(entry.token, entry);
      byScript.set(scriptPath, entry.token);
      return entry;
    },

    get(token: string): SessionPoolEntry | undefined {
      const entry = byToken.get(token);
      if (!entry) return undefined;
      return touch(entry);
    },

    eject(token: string): void {
      const entry = byToken.get(token);
      if (!entry) return;
      byToken.delete(token);
      // Only drop the reverse index if it still points at this token —
      // a subsequent `getOrCreate` for the same script may have already
      // re-registered the script under a different token.
      if (byScript.get(entry.scriptPath) === token) {
        byScript.delete(entry.scriptPath);
      }
    },

    prune(): void {
      const cutoff = Date.now() - opts.ttlMs;
      for (const [token, entry] of byToken) {
        if (entry.lastAccessAt < cutoff) {
          byToken.delete(token);
          if (byScript.get(entry.scriptPath) === token) {
            byScript.delete(entry.scriptPath);
          }
        }
      }
    },

    entries(): IterableIterator<SessionPoolEntry> {
      return byToken.values();
    },
  };
}
