import { describe, it, expect, vi } from 'vitest';
import { createSessionEndpoint } from '../../../src/server/middleware/sessionEndpoint';
import type { BuiltModel } from '../../../src/modeling/buildModel';
import { createSessionPool } from '../../../src/server/sessionPool';
import { createFakeRes, type FakeRes } from './testHelpers/fakeHttp';

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

/**
 * Slice 2E.bridge — GET /__kernelcad/session?script=<path>
 *
 * The endpoint validates the script path lives under `examples/`, then asks
 * the pool for an existing-or-fresh session token. The handler stays pure —
 * the pool + script resolver are injected so tests don't touch the
 * filesystem or boot OCCT.
 */
describe('sessionEndpoint', () => {
  it('returns { sessionToken } for a valid script path', async () => {
    const pool = createSessionPool({ build: async () => fakeBuiltModel(), ttlMs: 60_000 });
    const handler = createSessionEndpoint({
      pool,
      resolveScript: (s) => (s === 'examples/ok.kcad.ts' ? '/abs/examples/ok.kcad.ts' : null),
    });
    const res: FakeRes = createFakeRes();
    await handler({ url: '/__kernelcad/session?script=examples%2Fok.kcad.ts' }, res);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.sessionToken).toBe('string');
    expect(body.sessionToken.length).toBeGreaterThan(10);
  });

  it('returns the same token for the same script (pool reuse)', async () => {
    const builder = vi.fn(async () => fakeBuiltModel());
    const pool = createSessionPool({ build: builder, ttlMs: 60_000 });
    const handler = createSessionEndpoint({
      pool,
      resolveScript: (s) => `/abs/${s}`,
    });
    const r1 = createFakeRes();
    await handler({ url: '/__kernelcad/session?script=examples%2Fa.kcad.ts' }, r1);
    const r2 = createFakeRes();
    await handler({ url: '/__kernelcad/session?script=examples%2Fa.kcad.ts' }, r2);

    expect(JSON.parse(r1.body).sessionToken).toBe(JSON.parse(r2.body).sessionToken);
    expect(builder).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when script query param is missing', async () => {
    const pool = createSessionPool({ build: async () => fakeBuiltModel(), ttlMs: 60_000 });
    const handler = createSessionEndpoint({ pool, resolveScript: () => null });
    const res = createFakeRes();
    await handler({ url: '/__kernelcad/session' }, res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/script/);
  });

  it('returns 400 when script resolution fails', async () => {
    const pool = createSessionPool({ build: async () => fakeBuiltModel(), ttlMs: 60_000 });
    const handler = createSessionEndpoint({ pool, resolveScript: () => null });
    const res = createFakeRes();
    await handler({ url: '/__kernelcad/session?script=../../etc/passwd' }, res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/examples/);
  });

  it('returns 500 when the builder throws', async () => {
    const pool = createSessionPool({
      build: async () => { throw new Error('compile boom'); },
      ttlMs: 60_000,
    });
    const handler = createSessionEndpoint({
      pool,
      resolveScript: () => '/abs/script.kcad.ts',
    });
    const res = createFakeRes();
    await handler({ url: '/__kernelcad/session?script=examples%2Fa.kcad.ts' }, res);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toMatch(/compile boom/);
  });
});
