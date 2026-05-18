import { describe, it, expect, vi } from 'vitest';
import { Readable } from 'node:stream';
import { createParamsEndpoint } from '../../../src/server/middleware/paramsEndpoint';
import type { BuiltModel } from '../../../src/modeling/buildModel';
import { createSessionPool } from '../../../src/server/sessionPool';
import { createFakeRes } from './testHelpers/fakeHttp';

/**
 * Slice 2E.bridge — POST /__kernelcad/params?session=<token>
 *
 * Body: `{ edits: [{ name, value }] }`. The handler calls
 * `session.params.update(edits)` and returns the resulting `{ relowered,
 * skipped, warnings }`. The `RecomputeEngine.onRelower` emit happens as a
 * side effect inside `params.update`, so SSE subscribers automatically see
 * the change without the params handler needing to know about them.
 *
 * The handler validates: token present + known, body is JSON with an
 * `edits` array, and that `edits[*].value` is a primitive (number|boolean).
 * Anything malformed returns 4xx; kernel-level invalid args (e.g. value
 * out of range) are caught and reported as 422.
 */

function reqWith(url: string, body: unknown) {
  const stream = Readable.from([JSON.stringify(body)]);
  return Object.assign(stream, {
    url,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    socket: { setTimeout: () => {}, setNoDelay: () => {} },
  });
}

function fakeBuiltModelWithUpdate(
  update: (edits: Array<{ name: string; value: number | boolean }>) => Promise<unknown>,
): BuiltModel {
  const session = {
    params: { update },
  } as unknown as BuiltModel['session'];
  return {
    session,
    records: [],
    shapes: new Map(),
    diagnostics: [],
    health: new Map(),
    warnings: [],
  };
}

describe('paramsEndpoint', () => {
  it('calls session.params.update with the edits and returns the result', async () => {
    const update = vi.fn(async () => ({
      shape: {} as unknown,
      relowered: ['feat_1'],
      skipped: ['feat_0'],
      warnings: [],
    }));
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithUpdate(update),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createParamsEndpoint({ pool });
    const res = createFakeRes();

    await handler(reqWith(
      `/__kernelcad/params?session=${entry.token}`,
      { edits: [{ name: 'w', value: 70 }] },
    ), res);

    expect(update).toHaveBeenCalledWith([{ name: 'w', value: 70 }]);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.relowered).toEqual(['feat_1']);
    expect(body.skipped).toEqual(['feat_0']);
    expect(body.shape).toBeUndefined(); // shapes are not JSON-safe; don't echo them
  });

  it('returns 400 when session token is missing', async () => {
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithUpdate(async () => ({})),
      ttlMs: 60_000,
    });
    const handler = createParamsEndpoint({ pool });
    const res = createFakeRes();
    await handler(reqWith('/__kernelcad/params', { edits: [] }), res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/session/);
  });

  it('returns 404 when session token is unknown', async () => {
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithUpdate(async () => ({})),
      ttlMs: 60_000,
    });
    const handler = createParamsEndpoint({ pool });
    const res = createFakeRes();
    await handler(reqWith('/__kernelcad/params?session=nope', { edits: [] }), res);

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toMatch(/unknown session/i);
  });

  it('returns 400 when body is not valid JSON', async () => {
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithUpdate(async () => ({})),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createParamsEndpoint({ pool });
    const res = createFakeRes();
    const stream = Readable.from(['not json {']);
    await handler(Object.assign(stream, {
      url: `/__kernelcad/params?session=${entry.token}`,
      method: 'POST',
      socket: { setTimeout: () => {}, setNoDelay: () => {} },
    }), res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/json/i);
  });

  it('returns 400 when edits is missing or not an array', async () => {
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithUpdate(async () => ({})),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createParamsEndpoint({ pool });
    const res = createFakeRes();
    await handler(reqWith(
      `/__kernelcad/params?session=${entry.token}`,
      { notEdits: 'wrong' },
    ), res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/edits/);
  });

  it('returns 400 when an edit value is not number or boolean', async () => {
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithUpdate(async () => ({})),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createParamsEndpoint({ pool });
    const res = createFakeRes();
    await handler(reqWith(
      `/__kernelcad/params?session=${entry.token}`,
      { edits: [{ name: 'w', value: 'big' }] },
    ), res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/value/);
  });

  it('returns 422 with hint when params.update throws KernelError-shaped error', async () => {
    const update = vi.fn(async () => {
      const err = Object.assign(new Error('value out of range'), {
        code: 'feature.invalid-args',
        hint: 'invalid-args.param.value-out-of-range — param w value 999 above max 100',
      });
      throw err;
    });
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithUpdate(update),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createParamsEndpoint({ pool });
    const res = createFakeRes();
    await handler(reqWith(
      `/__kernelcad/params?session=${entry.token}`,
      { edits: [{ name: 'w', value: 999 }] },
    ), res);

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/value out of range/);
    expect(body.code).toBe('feature.invalid-args');
    expect(body.hint).toMatch(/value-out-of-range/);
  });

  it('survives params.update throwing a generic Error (returns 500)', async () => {
    const update = vi.fn(async () => { throw new Error('lowering exploded'); });
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithUpdate(update),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createParamsEndpoint({ pool });
    const res = createFakeRes();
    await handler(reqWith(
      `/__kernelcad/params?session=${entry.token}`,
      { edits: [{ name: 'w', value: 70 }] },
    ), res);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toMatch(/lowering exploded/);
  });
});
