import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BuiltModel } from '../../../src/modeling/buildModel';
import type { SessionPoolEntry } from '../../../src/server/sessionPool';

/**
 * Slice 2E.bridge — session pool unit tests.
 *
 * The pool keeps a long-lived `BuiltModel` per script path so multiple HTTP
 * requests from the browser (mesh fetch, params update, SSE subscribers) can
 * all act on the same `CaptureSession` / `RecomputeEngine`. Without this,
 * `onRelower` subscribers added by an SSE handler never see `params.update`
 * events because each request would spawn a fresh session.
 *
 * Tests use a tiny fake `BuiltModel` (no OCCT) — pool semantics don't depend
 * on the model's internals.
 */

function fakeBuiltModel(): BuiltModel {
  return {
    session: {} as BuiltModel['session'],
    records: [],
    shapes: new Map(),
    diagnostics: [],
    health: new Map(),
    warnings: [],
  };
}

async function loadPoolModule() {
  // Re-import each test so the module-level pool state is fresh.
  vi.resetModules();
  return await import('../../../src/server/sessionPool');
}

describe('SessionPool', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('getOrCreate returns a sessionToken + model for a fresh script path', async () => {
    const { createSessionPool } = await loadPoolModule();
    const builder = vi.fn(async () => fakeBuiltModel());
    const pool = createSessionPool({ build: builder, ttlMs: 60_000 });

    const entry = await pool.getOrCreate('/abs/path/script.kcad.ts');

    expect(entry.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(builder).toHaveBeenCalledTimes(1);
    expect(builder).toHaveBeenCalledWith('/abs/path/script.kcad.ts');
  });

  it('getOrCreate reuses the same session for the same script path', async () => {
    const { createSessionPool } = await loadPoolModule();
    const builder = vi.fn(async () => fakeBuiltModel());
    const pool = createSessionPool({ build: builder, ttlMs: 60_000 });

    const a = await pool.getOrCreate('/abs/path/script.kcad.ts');
    const b = await pool.getOrCreate('/abs/path/script.kcad.ts');

    expect(b.token).toBe(a.token);
    expect(builder).toHaveBeenCalledTimes(1);
  });

  it('get(token) returns the pool entry with the same BuiltModel ref', async () => {
    const { createSessionPool } = await loadPoolModule();
    const model = fakeBuiltModel();
    const builder = vi.fn(async () => model);
    const pool = createSessionPool({ build: builder, ttlMs: 60_000 });

    const created = await pool.getOrCreate('/abs/path/script.kcad.ts');
    const fetched = pool.get(created.token);

    expect(fetched).toBeDefined();
    expect(fetched!.model).toBe(model);
    expect(fetched!.scriptPath).toBe('/abs/path/script.kcad.ts');
  });

  it('get(unknownToken) returns undefined', async () => {
    const { createSessionPool } = await loadPoolModule();
    const pool = createSessionPool({ build: async () => fakeBuiltModel(), ttlMs: 60_000 });
    expect(pool.get('not-a-real-token')).toBeUndefined();
  });

  it('eject(token) removes the entry; subsequent getOrCreate rebuilds', async () => {
    const { createSessionPool } = await loadPoolModule();
    const builder = vi.fn(async () => fakeBuiltModel());
    const pool = createSessionPool({ build: builder, ttlMs: 60_000 });

    const a = await pool.getOrCreate('/abs/path/script.kcad.ts');
    pool.eject(a.token);
    expect(pool.get(a.token)).toBeUndefined();

    const b = await pool.getOrCreate('/abs/path/script.kcad.ts');
    expect(b.token).not.toBe(a.token);
    expect(builder).toHaveBeenCalledTimes(2);
  });

  it('prune removes entries idle longer than ttlMs', async () => {
    const { createSessionPool } = await loadPoolModule();
    const builder = vi.fn(async () => fakeBuiltModel());
    const pool = createSessionPool({ build: builder, ttlMs: 1_000 });

    const a = await pool.getOrCreate('/abs/path/script.kcad.ts');
    vi.advanceTimersByTime(1_500);
    pool.prune();

    expect(pool.get(a.token)).toBeUndefined();
  });

  it('get(token) bumps lastAccessAt so prune does not evict active sessions', async () => {
    const { createSessionPool } = await loadPoolModule();
    const builder = vi.fn(async () => fakeBuiltModel());
    const pool = createSessionPool({ build: builder, ttlMs: 1_000 });

    const a = await pool.getOrCreate('/abs/path/script.kcad.ts');
    vi.advanceTimersByTime(800);
    // Touch via get(); pool extends TTL
    expect(pool.get(a.token)).toBeDefined();
    vi.advanceTimersByTime(800);
    pool.prune();

    expect(pool.get(a.token)).toBeDefined();
  });

  it('exposes entries() for the events endpoint to enumerate live sessions', async () => {
    const { createSessionPool } = await loadPoolModule();
    const builder = vi.fn(async () => fakeBuiltModel());
    const pool = createSessionPool({ build: builder, ttlMs: 60_000 });

    await pool.getOrCreate('/abs/path/a.kcad.ts');
    await pool.getOrCreate('/abs/path/b.kcad.ts');

    const all: SessionPoolEntry[] = [...pool.entries()];
    expect(all).toHaveLength(2);
  });

  describe('maxEntries LRU cap', () => {
    it('is unbounded by default (no maxEntries)', async () => {
      const { createSessionPool } = await loadPoolModule();
      const pool = createSessionPool({ build: async () => fakeBuiltModel(), ttlMs: 60_000 });

      await pool.getOrCreate('/abs/a.kcad.ts');
      await pool.getOrCreate('/abs/b.kcad.ts');
      await pool.getOrCreate('/abs/c.kcad.ts');

      expect([...pool.entries()]).toHaveLength(3);
    });

    it('evicts the least-recently-accessed entry on insert past the cap', async () => {
      const { createSessionPool } = await loadPoolModule();
      const pool = createSessionPool({ build: async () => fakeBuiltModel(), ttlMs: 60_000, maxEntries: 2 });

      const a = await pool.getOrCreate('/abs/a.kcad.ts');
      vi.advanceTimersByTime(10);
      const b = await pool.getOrCreate('/abs/b.kcad.ts');
      vi.advanceTimersByTime(10);
      // Inserting c exceeds the cap of 2 → the LRU (a) is evicted.
      const c = await pool.getOrCreate('/abs/c.kcad.ts');

      expect([...pool.entries()]).toHaveLength(2);
      // The evicted token now misses — same as the TTL `session.evicted` path.
      expect(pool.get(a.token)).toBeUndefined();
      expect(pool.get(b.token)).toBeDefined();
      expect(pool.get(c.token)).toBeDefined();
    });

    it('keeps a recently-touched entry alive and evicts a colder one instead', async () => {
      const { createSessionPool } = await loadPoolModule();
      const pool = createSessionPool({ build: async () => fakeBuiltModel(), ttlMs: 60_000, maxEntries: 2 });

      const a = await pool.getOrCreate('/abs/a.kcad.ts');
      vi.advanceTimersByTime(10);
      const b = await pool.getOrCreate('/abs/b.kcad.ts');
      vi.advanceTimersByTime(10);
      // Touch a so b becomes the coldest.
      pool.get(a.token);
      vi.advanceTimersByTime(10);
      const c = await pool.getOrCreate('/abs/c.kcad.ts');

      expect(pool.get(a.token)).toBeDefined();
      expect(pool.get(b.token)).toBeUndefined();
      expect(pool.get(c.token)).toBeDefined();
    });
  });

  describe('runExclusive global lock hook', () => {
    it('defaults to identity passthrough (kernel build still runs)', async () => {
      const { createSessionPool } = await loadPoolModule();
      const builder = vi.fn(async () => fakeBuiltModel());
      const pool = createSessionPool({ build: builder, ttlMs: 60_000 });

      const entry = await pool.getOrCreate('/abs/a.kcad.ts');
      expect(entry.token).toBeDefined();
      expect(builder).toHaveBeenCalledTimes(1);
      // Exposed for endpoints to route their own kernel ops through.
      await expect(pool.runExclusive(async () => 42)).resolves.toBe(42);
    });

    it('serializes the pool\'s own build() calls when a real mutex is injected', async () => {
      const { createSessionPool } = await loadPoolModule();
      vi.useRealTimers(); // need real microtask/timer ordering for overlap probe

      // Simple promise-chained mutex.
      let chain: Promise<unknown> = Promise.resolve();
      const runExclusive = <T>(fn: () => Promise<T>): Promise<T> => {
        const run = chain.then(fn, fn);
        chain = run.then(
          () => undefined,
          () => undefined,
        );
        return run as Promise<T>;
      };

      let active = 0;
      let maxConcurrent = 0;
      const builder = vi.fn(async () => {
        active += 1;
        maxConcurrent = Math.max(maxConcurrent, active);
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
        return fakeBuiltModel();
      });

      const pool = createSessionPool({ build: builder, ttlMs: 60_000, runExclusive });

      // Fire three distinct-key builds concurrently; the mutex must serialize.
      await Promise.all([
        pool.getOrCreate('/abs/a.kcad.ts'),
        pool.getOrCreate('/abs/b.kcad.ts'),
        pool.getOrCreate('/abs/c.kcad.ts'),
      ]);

      expect(builder).toHaveBeenCalledTimes(3);
      expect(maxConcurrent).toBe(1); // never overlapped

      vi.useFakeTimers();
    });
  });

  describe('per-user session scoping', () => {
    it('same scriptPath + different keys/owners get DIFFERENT tokens and entries', async () => {
      const { createSessionPool } = await loadPoolModule();
      const builder = vi.fn(async () => fakeBuiltModel());
      const pool = createSessionPool({ build: builder, ttlMs: 60_000 });

      const userA = await pool.getOrCreate('/abs/shared.kcad.ts', {
        key: 'userA|/abs/shared.kcad.ts',
        ownerId: 'userA',
      });
      const userB = await pool.getOrCreate('/abs/shared.kcad.ts', {
        key: 'userB|/abs/shared.kcad.ts',
        ownerId: 'userB',
      });

      expect(userA.token).not.toBe(userB.token);
      expect(builder).toHaveBeenCalledTimes(2);
      expect(userA.scriptPath).toBe('/abs/shared.kcad.ts');
      expect(userB.scriptPath).toBe('/abs/shared.kcad.ts');
    });

    it('same key reuses the same entry', async () => {
      const { createSessionPool } = await loadPoolModule();
      const builder = vi.fn(async () => fakeBuiltModel());
      const pool = createSessionPool({ build: builder, ttlMs: 60_000 });

      const a = await pool.getOrCreate('/abs/shared.kcad.ts', {
        key: 'userA|/abs/shared.kcad.ts',
        ownerId: 'userA',
      });
      const b = await pool.getOrCreate('/abs/shared.kcad.ts', {
        key: 'userA|/abs/shared.kcad.ts',
        ownerId: 'userA',
      });

      expect(b.token).toBe(a.token);
      expect(builder).toHaveBeenCalledTimes(1);
    });

    it('carries ownerId on the entry so the server route can authorize', async () => {
      const { createSessionPool } = await loadPoolModule();
      const pool = createSessionPool({ build: async () => fakeBuiltModel(), ttlMs: 60_000 });

      const entry = await pool.getOrCreate('/abs/x.kcad.ts', {
        key: 'userA|/abs/x.kcad.ts',
        ownerId: 'userA',
      });
      expect(entry.ownerId).toBe('userA');
      expect(pool.get(entry.token)!.ownerId).toBe('userA');
    });

    it('defaults key to scriptPath and ownerId to undefined (single-user dev mode)', async () => {
      const { createSessionPool } = await loadPoolModule();
      const builder = vi.fn(async () => fakeBuiltModel());
      const pool = createSessionPool({ build: builder, ttlMs: 60_000 });

      const a = await pool.getOrCreate('/abs/dev.kcad.ts');
      const b = await pool.getOrCreate('/abs/dev.kcad.ts');

      expect(a.key).toBe('/abs/dev.kcad.ts');
      expect(a.ownerId).toBeUndefined();
      expect(b.token).toBe(a.token); // bare path reuse unchanged
      expect(builder).toHaveBeenCalledTimes(1);
    });
  });
});
