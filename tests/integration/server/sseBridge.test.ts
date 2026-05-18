import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { createSessionPool } from '../../../src/server/sessionPool';
import { createSessionEndpoint } from '../../../src/server/middleware/sessionEndpoint';
import { createEventsEndpoint } from '../../../src/server/middleware/eventsEndpoint';
import { createParamsEndpoint } from '../../../src/server/middleware/paramsEndpoint';
import type { BuiltModel } from '../../../src/modeling/buildModel';
import type { SessionRecomputeEngineHandle } from '../../../src/modeling/capture/captureSession';

/**
 * Slice 2E.bridge — full round-trip:
 *
 *   GET  /__kernelcad/session?script=…  → { sessionToken }
 *   GET  /__kernelcad/events?session=…  → SSE stream (still open)
 *   POST /__kernelcad/params?session=…  → relower fires inside .update,
 *                                          fanning out to SSE subscribers
 *
 * Uses a fake `CaptureSession` so no OCCT boot is required; the kernel-level
 * `RecomputeEngine.onRelower` semantics are already covered by
 * `tests/integration/modeling/sessionParamsRelowerEmit.test.ts`. This test
 * proves the HTTP transport correctly carries that emit through to a
 * connected `text/event-stream` client.
 */

interface FakeSession {
  engine: SessionRecomputeEngineHandle;
  params: { update: (edits: Array<{ name: string; value: number | boolean }>) => Promise<unknown> };
}

function makeFakeBuiltModel(): BuiltModel {
  const subs: Array<(ids: string[]) => void> = [];
  const engine: SessionRecomputeEngineHandle = {
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
  const session: FakeSession = {
    engine,
    params: {
      update: async (edits) => {
        // Mirror what `updateModelParams` does at the end: emit a relower
        // for the affected ids. Our fake re-lowers every edit by name.
        const ids = edits.map((e) => `feat_${e.name}`);
        engine.emitRelower(ids);
        return { shape: {}, relowered: ids, skipped: [], warnings: [] };
      },
    },
  };
  return {
    session: session as unknown as BuiltModel['session'],
    records: [],
    shapes: new Map(),
    diagnostics: [],
    health: new Map(),
    warnings: [],
  };
}

let server: Server;
let baseUrl: string;
let pool: ReturnType<typeof createSessionPool>;

beforeAll(async () => {
  pool = createSessionPool({
    build: async () => makeFakeBuiltModel(),
    ttlMs: 60_000,
  });
  const sessionH = createSessionEndpoint({ pool, resolveScript: (s) => `/abs/${s}` });
  const eventsH = createEventsEndpoint({ pool });
  const paramsH = createParamsEndpoint({ pool });

  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '';
    if (url.startsWith('/__kernelcad/session')) return sessionH(req, res);
    if (url.startsWith('/__kernelcad/events')) return eventsH(req, res);
    if (url.startsWith('/__kernelcad/params')) return paramsH(req, res);
    res.statusCode = 404;
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Slice 2E.bridge SSE round-trip', () => {
  it('GET /session + GET /events + POST /params delivers SSE event end-to-end', async () => {
    // 1. Acquire a session token for the script.
    const tokenRes = await fetch(`${baseUrl}/__kernelcad/session?script=examples%2Fx.kcad.ts`);
    expect(tokenRes.status).toBe(200);
    const { sessionToken } = await tokenRes.json() as { sessionToken: string };
    expect(sessionToken).toBeTruthy();

    // 2. Open the SSE stream (don't await — we want to read while it's live).
    const sseAbort = new AbortController();
    const ssePromise = fetch(`${baseUrl}/__kernelcad/events?session=${sessionToken}`, {
      signal: sseAbort.signal,
    });
    const sseRes = await ssePromise;
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get('content-type')).toBe('text/event-stream');

    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    // Read the preamble (`: connected\n\n`) so the test can clearly detect
    // when the relower frame later arrives by waiting for a fresh chunk.
    const first = await reader.read();
    accumulated += decoder.decode(first.value);
    expect(accumulated).toContain(': connected');

    // 3. POST params → triggers `params.update` → emits relower → SSE.
    const paramsRes = await fetch(`${baseUrl}/__kernelcad/params?session=${sessionToken}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ edits: [{ name: 'w', value: 70 }] }),
    });
    expect(paramsRes.status).toBe(200);
    const paramsBody = await paramsRes.json() as { relowered: string[] };
    expect(paramsBody.relowered).toEqual(['feat_w']);

    // 4. Drain the SSE stream until we see the relower frame (bounded loop).
    const start = Date.now();
    while (!accumulated.includes('event: relower') && Date.now() - start < 5_000) {
      const next = await reader.read();
      if (next.done) break;
      accumulated += decoder.decode(next.value);
    }

    expect(accumulated).toContain('event: relower');
    expect(accumulated).toContain('"affectedIds":["feat_w"]');

    sseAbort.abort();
  });

  it('rejects POST /params for an unknown session token (404)', async () => {
    const res = await fetch(`${baseUrl}/__kernelcad/params?session=does-not-exist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ edits: [] }),
    });
    expect(res.status).toBe(404);
  });
});
