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
});
