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
    expect(engine.subscribers).toHaveLength(1);

    req.triggerClose();
    expect(engine.subscribers).toHaveLength(0);
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
