import { describe, it, expect, vi } from 'vitest';
import { createEventsEndpoint } from '../../../src/server/middleware/eventsEndpoint';
import type { BuiltModel } from '../../../src/modeling/buildModel';
import type { SessionRecomputeEngineHandle } from '../../../src/modeling/capture/captureSession';
import { createSessionPool } from '../../../src/server/sessionPool';
import { createFakeRes, createFakeReqWithClose } from './testHelpers/fakeHttp';

/**
 * Slice 2E.bridge — GET /__kernelcad/events?session=<token> (SSE).
 *
 * Holds the connection open, subscribes to the session's
 * `RecomputeEngine.onRelower` emitter, and writes one `data: {...}\n\n` frame
 * per event. Critical correctness assertion: on connection close the handler
 * MUST call the unsubscribe function so the engine doesn't accumulate dead
 * callbacks.
 */

interface FakeEngine extends SessionRecomputeEngineHandle {
  subscribers: Array<(ids: string[]) => void>;
}

function fakeEngine(): FakeEngine {
  const subs: Array<(ids: string[]) => void> = [];
  return {
    subscribers: subs,
    onRelower(cb) {
      subs.push(cb);
      return () => {
        const i = subs.indexOf(cb);
        if (i >= 0) subs.splice(i, 1);
      };
    },
    emitRelower(ids) {
      for (const cb of [...subs]) cb([...ids]);
    },
  };
}

function fakeBuiltModelWithEngine(engine: FakeEngine): BuiltModel {
  return {
    session: { engine } as unknown as BuiltModel['session'],
    records: [],
    shapes: new Map(),
    diagnostics: [],
    health: new Map(),
    warnings: [],
  };
}

describe('eventsEndpoint', () => {
  it('opens an SSE stream and writes the SSE preamble', async () => {
    const engine = fakeEngine();
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithEngine(engine),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createEventsEndpoint({ pool });
    const req = createFakeReqWithClose(`/__kernelcad/events?session=${entry.token}`);
    const res = createFakeRes();

    void handler(req, res);
    await Promise.resolve();

    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['connection']).toBe('keep-alive');
    expect(res.writes.some((c) => c.startsWith(': connected'))).toBe(true);
  });

  it('forwards onRelower events to the SSE stream as data frames', async () => {
    const engine = fakeEngine();
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithEngine(engine),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createEventsEndpoint({ pool });
    const req = createFakeReqWithClose(`/__kernelcad/events?session=${entry.token}`);
    const res = createFakeRes();

    void handler(req, res);
    await Promise.resolve();

    engine.emitRelower(['feat_1', 'feat_2']);

    const dataFrames = res.writes.filter((c) => c.startsWith('event: relower\n'));
    expect(dataFrames).toHaveLength(1);
    expect(dataFrames[0]).toContain('"affectedIds":["feat_1","feat_2"]');
    expect(dataFrames[0].endsWith('\n\n')).toBe(true);
  });

  it('unsubscribes when the connection closes (no leaked callbacks)', async () => {
    const engine = fakeEngine();
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithEngine(engine),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createEventsEndpoint({ pool });
    const req = createFakeReqWithClose(`/__kernelcad/events?session=${entry.token}`);
    const res = createFakeRes();

    void handler(req, res);
    await Promise.resolve();
    // The single engine-level subscriber is the pool entry's relower hub
    // (it owns the engine subscription so it can survive in-place model
    // swaps); the SSE connection subscribes to the hub, not the engine.
    expect(engine.subscribers).toHaveLength(1);

    req.triggerClose();
    // The hub's engine subscription stays (it belongs to the pool entry,
    // not the connection) — the per-connection invariant is that a closed
    // connection receives no further frames.
    expect(engine.subscribers).toHaveLength(1);
    const writesBeforeEmit = res.writes.length;
    engine.emitRelower(['feat_after_close']);
    expect(res.writes.length).toBe(writesBeforeEmit);
  });

  it('returns 400 when session token is missing', async () => {
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithEngine(fakeEngine()),
      ttlMs: 60_000,
    });
    const handler = createEventsEndpoint({ pool });
    const req = createFakeReqWithClose('/__kernelcad/events');
    const res = createFakeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/session/);
  });

  it('returns 404 when session token is unknown', async () => {
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithEngine(fakeEngine()),
      ttlMs: 60_000,
    });
    const handler = createEventsEndpoint({ pool });
    const req = createFakeReqWithClose('/__kernelcad/events?session=does-not-exist');
    const res = createFakeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toMatch(/unknown session/i);
  });

  it('returns 409 when session has no engine attached', async () => {
    const pool = createSessionPool({
      build: async () => ({
        session: { engine: undefined } as unknown as BuiltModel['session'],
        records: [], shapes: new Map(), diagnostics: [], health: new Map(), warnings: [],
      }),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createEventsEndpoint({ pool });
    const req = createFakeReqWithClose(`/__kernelcad/events?session=${entry.token}`);
    const res = createFakeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toMatch(/engine/i);
  });

  it('streams as today when no authenticate dep is supplied (vite path)', async () => {
    const engine = fakeEngine();
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithEngine(engine),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const handler = createEventsEndpoint({ pool });
    const req = createFakeReqWithClose(`/__kernelcad/events?session=${entry.token}`);
    const res = createFakeRes();

    void handler(req, res);
    await Promise.resolve();

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(res.writes.some((c) => c.startsWith(': connected'))).toBe(true);
  });

  it('rejects with 401 and does NOT open the stream when authenticate denies', async () => {
    const engine = fakeEngine();
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithEngine(engine),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const authenticate = vi.fn(async () => ({ ok: false }));
    const handler = createEventsEndpoint({ pool, authenticate });
    const req = createFakeReqWithClose(
      `/__kernelcad/events?session=${entry.token}&access_token=bad`,
    );
    const res = createFakeRes();

    await handler(req, res);

    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(401);
    // No SSE preamble, no subscription — the stream never opened. (writeJson
    // sets a JSON content-type for the error body; the stream content-type is
    // text/event-stream, which must NOT have been set.)
    expect(res.headers['content-type']).not.toBe('text/event-stream');
    expect(res.writes).toHaveLength(0);
    expect(engine.subscribers).toHaveLength(1); // only the pool entry's hub
  });

  it('honors a custom status/error from a denying authenticate hook', async () => {
    const engine = fakeEngine();
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithEngine(engine),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const authenticate = vi.fn(async () => ({
      ok: false,
      status: 403,
      error: 'token owner mismatch',
    }));
    const handler = createEventsEndpoint({ pool, authenticate });
    const req = createFakeReqWithClose(`/__kernelcad/events?session=${entry.token}`);
    const res = createFakeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('token owner mismatch');
    expect(res.writes).toHaveLength(0);
  });

  it('streams when authenticate allows', async () => {
    const engine = fakeEngine();
    const pool = createSessionPool({
      build: async () => fakeBuiltModelWithEngine(engine),
      ttlMs: 60_000,
    });
    const entry = await pool.getOrCreate('/abs/x.kcad.ts');
    const authenticate = vi.fn(async () => ({ ok: true }));
    const handler = createEventsEndpoint({ pool, authenticate });
    const req = createFakeReqWithClose(
      `/__kernelcad/events?session=${entry.token}&access_token=good-jwt`,
    );
    const res = createFakeRes();

    void handler(req, res);
    await Promise.resolve();

    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(res.writes.some((c) => c.startsWith(': connected'))).toBe(true);

    engine.emitRelower(['feat_1']);
    expect(res.writes.some((c) => c.startsWith('event: relower\n'))).toBe(true);
  });

  it('writes periodic keep-alive comments when heartbeatMs is set', async () => {
    vi.useFakeTimers();
    try {
      const engine = fakeEngine();
      const pool = createSessionPool({
        build: async () => fakeBuiltModelWithEngine(engine),
        ttlMs: 60_000,
      });
      const entry = await pool.getOrCreate('/abs/x.kcad.ts');
      const handler = createEventsEndpoint({ pool, heartbeatMs: 1_000 });
      const req = createFakeReqWithClose(`/__kernelcad/events?session=${entry.token}`);
      const res = createFakeRes();

      void handler(req, res);
      await Promise.resolve();

      vi.advanceTimersByTime(2_500);

      const heartbeats = res.writes.filter((c) => c.startsWith(': keepalive'));
      expect(heartbeats.length).toBeGreaterThanOrEqual(2);

      req.triggerClose();
    } finally {
      vi.useRealTimers();
    }
  });
});
