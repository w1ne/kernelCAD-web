// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/store.test.ts
//
// D1Store and the Worker entry against the real migration SQL, on a local
// SQLite database behind a minimal D1-shaped adapter.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { D1Store, type D1Like, type D1StatementLike } from './store';
import worker, { isSummaryRun, emailSender, monitorFetch, type Env } from './index';
import { runMonitor } from './monitor';
import { fakeFetch, fakeProd } from './testFakes';

const MIGRATION = fileURLToPath(new URL('../migrations/0001_uptime.sql', import.meta.url));

function sqliteD1(): D1Like {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(MIGRATION, 'utf8'));
  const stmt = (sql: string, values: unknown[] = []): D1StatementLike => ({
    bind: (...v) => stmt(sql, v),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(values as never[])) as T[] }),
    first: async <T,>() => (db.prepare(sql).get(...(values as never[])) as T | undefined) ?? null,
    run: async () => db.prepare(sql).run(...(values as never[])),
  });
  return {
    prepare: (sql) => stmt(sql),
    batch: async (list) => {
      for (const s of list) await s.run();
      return [];
    },
  };
}

const T0 = Date.UTC(2026, 8, 29, 6, 0, 0);

describe('D1Store on the migration schema', () => {
  it('round-trips results, latest per check, states and meta, and prunes', async () => {
    const store = new D1Store(sqliteD1());
    await store.addResults([
      { ts: 1, checkId: 'mcp', ok: false, latencyMs: 10.4, error: 'boom' },
      { ts: 2, checkId: 'mcp', ok: true, latencyMs: 20 },
      { ts: 2, checkId: 'healthz', ok: true, latencyMs: 5, detail: { commit: 'c', warm: true, workers: 2, busy: 0, queueDepth: 0, kills: 0, killsByCause: {}, respawns: 0, rssMb: [1] } },
    ]);
    expect(await store.resultsSince(0)).toEqual([
      { ts: 1, checkId: 'mcp', ok: false, latencyMs: 10, error: 'boom' },
      { ts: 2, checkId: 'healthz', ok: true, latencyMs: 5, detail: expect.objectContaining({ commit: 'c' }) },
      { ts: 2, checkId: 'mcp', ok: true, latencyMs: 20 },
    ]);
    expect((await store.latest()).map((r) => [r.checkId, r.ts])).toEqual([
      ['healthz', 2],
      ['mcp', 2],
    ]);
    expect(await store.getStates()).toEqual({});
    await store.putStates({ mcp: { fails: 1, alerted: false, since: 1 } });
    await store.putStates({ mcp: { fails: 2, alerted: true, since: 1 } });
    expect(await store.getStates()).toEqual({ mcp: { fails: 2, alerted: true, since: 1 } });
    await store.putMeta({ commit: 'c' });
    expect(await store.getMeta()).toEqual({ commit: 'c' });
    await store.prune(2);
    expect((await store.resultsSince(0)).map((r) => r.ts)).toEqual([2, 2]);
  });
});

describe('Worker entry', () => {
  it('GET /status serves the latest results as public JSON; other paths 404', async () => {
    const DB = sqliteD1();
    const env: Env = {
      DB,
      EMAIL: { send: async () => ({ messageId: 'm' }) },
      ALERT_TO: 'andrii@kernelcad.com',
      ALERT_FROM: 'uptime@kernelcad.com',
    };
    await runMonitor({ store: new D1Store(DB), fetch: fakeFetch(fakeProd()), send: async () => {} }, T0);
    const res = await worker.fetch(new Request('https://kernelcad-uptime.example.workers.dev/status'), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const body = (await res.json()) as { ok: boolean; checks: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.checks).toHaveLength(8);
    expect((await worker.fetch(new Request('https://x.workers.dev/'), env)).status).toBe(404);
    expect((await worker.fetch(new Request('https://x.workers.dev/status', { method: 'POST' }), env)).status).toBe(405);
  });

  it('GET /summary?days=N serves per-check uptime over the window, numbers only', async () => {
    const DB = sqliteD1();
    const env: Env = {
      DB,
      EMAIL: { send: async () => ({ messageId: 'm' }) },
      ALERT_TO: 'andrii@kernelcad.com',
      ALERT_FROM: 'uptime@kernelcad.com',
    };
    await runMonitor({ store: new D1Store(DB), fetch: fakeFetch(fakeProd()), send: async () => {} }, Date.now() - 60_000);
    const res = await worker.fetch(new Request('https://x.workers.dev/summary?days=99'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { days: number; checks: Array<{ checkId: string; runs: number; okRuns: number; uptimePct: number | null }> };
    expect(body.days).toBe(7);
    expect(body.checks).toHaveLength(8);
    expect(body.checks.find((c) => c.checkId === 'healthz')).toMatchObject({ runs: 1, okRuns: 1, uptimePct: 100 });
  });

  it('sends from the fixed sender to the fixed recipient', async () => {
    const calls: unknown[] = [];
    const env = {
      EMAIL: { send: async (m: unknown) => (calls.push(m), { messageId: 'm' }) },
      ALERT_TO: 'andrii@kernelcad.com',
      ALERT_FROM: 'uptime@kernelcad.com',
    } as unknown as Env;
    await emailSender(env)('s', 't');
    expect(calls).toEqual([{ to: 'andrii@kernelcad.com', from: { email: 'uptime@kernelcad.com', name: 'kernelCAD uptime' }, subject: 's', text: 't' }]);
  });

  it('the 07:00 UTC run is the summary run', () => {
    expect(isSummaryRun(Date.UTC(2026, 8, 29, 7, 0, 0))).toBe(true);
    expect(isSummaryRun(Date.UTC(2026, 8, 29, 7, 5, 0))).toBe(false);
    expect(isSummaryRun(Date.UTC(2026, 8, 29, 6, 55, 0))).toBe(false);
  });
});

describe('monitorFetch', () => {
  it('adds the secret to MCP-origin requests only', async () => {
    const seen: Array<[string, string | null]> = [];
    const base = async (url: string, init?: RequestInit) => {
      seen.push([url, new Headers(init?.headers).get('x-kernelcad-monitor')]);
      return new Response('{}');
    };
    const f = monitorFetch(base, 's3cret-token-0123456789');
    await f('https://mcp.kernelcad.com/mcp', { headers: { 'User-Agent': 'u' } });
    await f('https://api.kernelcad.com/healthz');
    await f('https://mcp.kernelcad.com.evil.example/mcp');
    expect(seen).toEqual([
      ['https://mcp.kernelcad.com/mcp', 's3cret-token-0123456789'],
      ['https://api.kernelcad.com/healthz', null],
      ['https://mcp.kernelcad.com.evil.example/mcp', null],
    ]);
    expect(monitorFetch(base, undefined)).toBe(base);
  });
});
