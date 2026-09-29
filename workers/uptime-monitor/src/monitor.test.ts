// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/monitor.test.ts
//
// Whole monitor runs against a fake prod, a fake store and a fake mailer:
// outage -> one alert naming the deploy -> reminder -> recovery; export
// cadence; email failure retry; daily summary once per day; /status body.

import { describe, it, expect } from 'vitest';
import { CHECKS } from './checks';
import { isDue, runDailySummary, runMonitor, statusBody } from './monitor';
import { MemoryStore } from './store';
import { fakeFetch, fakeProd, type FakeProd } from './testFakes';

const MIN = 60_000;
// 2026-09-29T06:00:00Z, a :00 mark.
const T0 = Date.UTC(2026, 8, 29, 6, 0, 0);

function harness(over: Partial<FakeProd> = {}) {
  const prod = fakeProd(over);
  const store = new MemoryStore();
  const mails: Array<{ subject: string; text: string }> = [];
  let failSend = false;
  const deps = {
    store,
    fetch: fakeFetch(prod),
    send: async (subject: string, text: string) => {
      if (failSend) throw new Error('email.sending.error');
      mails.push({ subject, text });
    },
    timeoutMs: 1000,
  };
  return {
    prod,
    store,
    mails,
    deps,
    setFailSend: (v: boolean) => (failSend = v),
    run: (i: number) => runMonitor(deps, T0 + i * 5 * MIN),
  };
}

describe('uptime monitor run', () => {
  it('a healthy run stores one row per check and sends nothing', async () => {
    const h = harness();
    const out = await h.run(0);
    expect(out.results).toHaveLength(CHECKS.length);
    expect(out.results.every((r) => r.ok)).toBe(true);
    expect(h.mails).toEqual([]);
    expect(h.store.rows).toHaveLength(CHECKS.length);
    expect(h.store.meta).toMatchObject({ commit: h.prod.commit, lastRunAt: T0, lastGood: { at: T0 } });
  });

  it('runs the export check at :00 and :30 only while it passes', async () => {
    const def = CHECKS.find((c) => c.id === 'mcp_export_step')!;
    const ran = { fails: 0, alerted: false, lastRunAt: T0 };
    expect(isDue(def, T0, ran)).toBe(true);
    expect(isDue(def, T0 + 5 * MIN, ran)).toBe(false);
    expect(isDue(def, T0 + 30 * MIN, ran)).toBe(true);
    expect(isDue(def, T0 + 35 * MIN, { ...ran, fails: 1 })).toBe(true);
    expect(isDue(def, T0 + 35 * MIN, undefined)).toBe(true);
    const h = harness();
    await h.run(0);
    const second = await h.run(1);
    expect(second.results.map((r) => r.id)).not.toContain('mcp_export_step');
  });

  it('deploy then MCP failures: one alert naming the deploy, a reminder after 2 h, one recovery', async () => {
    const h = harness();
    await h.run(0);
    // Deploy: new commit, MCP evaluation broken.
    h.prod.commit = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    h.prod.evalOk = false;
    await h.run(1);
    expect(h.mails).toEqual([]);
    expect(h.store.meta.lastDeploy).toEqual({ at: T0 + 5 * MIN, from: 'a'.repeat(40), to: 'b'.repeat(40) });
    await h.run(2);
    expect(h.mails).toHaveLength(1);
    const alert = h.mails[0]!;
    expect(alert.subject).toBe('[kernelCAD DOWN] MCP initialize + tools/list + evaluate_script');
    expect(alert.text).toContain('error: evaluate_script: tool returned not ok');
    expect(alert.text).toContain('since: 2026-09-29T06:05:00Z (5 min, 2 failed runs in a row)');
    expect(alert.text).toContain('likely cause: deploy aaaaaaaaaaaa -> bbbbbbbbbbbb at 2026-09-29T06:05:00Z (0 min before the first failure)');
    expect(alert.text).toContain('Last good healthz: 2026-09-29T06:10:00Z, commit bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    expect(alert.text).toContain('pool: workers 2, warm true, busy 0, queue 0, kills 3 (memory 1, time 2, crash 0, cancelled 0), respawns 3, rssMb [265, 129]');
    // Still down for the next 2 h: no repeat, then one reminder.
    for (let i = 3; i <= 25; i++) await h.run(i);
    expect(h.mails).toHaveLength(1);
    await h.run(26);
    expect(h.mails).toHaveLength(2);
    expect(h.mails[1]!.subject).toBe('[kernelCAD STILL DOWN] MCP initialize + tools/list + evaluate_script');
    h.prod.evalOk = true;
    await h.run(27);
    expect(h.mails).toHaveLength(3);
    expect(h.mails[2]!.subject).toBe('[kernelCAD RECOVERED] MCP initialize + tools/list + evaluate_script');
    expect(h.mails[2]!.text).toContain('was down from 2026-09-29T06:05:00Z to 2026-09-29T08:15:00Z (2 h 10 min)');
    await h.run(28);
    expect(h.mails).toHaveLength(3);
  });

  it('a full outage sends ONE email listing every failing check, with the last good pool numbers', async () => {
    const h = harness();
    await h.run(0);
    Object.assign(h.prod, { healthStatus: 502, mcpStatus: 502, oauthStatus: 502 });
    await h.run(1);
    await h.run(2);
    expect(h.mails).toHaveLength(1);
    const m = h.mails[0]!;
    expect(m.subject).toContain('[kernelCAD DOWN] API /healthz, MCP initialize');
    // The export check is not due at :05/:10, so it is not in this email.
    expect(m.subject).not.toContain('export');
    expect(m.text).toContain('error: healthz: HTTP 502');
    expect(m.text).toContain(`Last good healthz: 2026-09-29T06:00:00Z, commit ${'a'.repeat(40)}`);
    expect(m.text).not.toContain('likely cause');
  });

  it('a single blip sends nothing', async () => {
    const h = harness();
    await h.run(0);
    h.prod.appStatus = 502;
    await h.run(1);
    h.prod.appStatus = 200;
    await h.run(2);
    expect(h.mails).toEqual([]);
  });

  it('slow healthz: alert after 3 slow runs', async () => {
    let slow = false;
    const h = harness();
    const inner = h.deps.fetch;
    let t = 0;
    const clock = () => t;
    // Healthz latency comes from runCheck's clock; drive it with a fake timer via fetch.
    h.deps.fetch = async (url, init) => {
      if (url.endsWith('/healthz') && slow) t += 6000;
      return inner(url, init);
    };
    const realNow = Date.now;
    Date.now = clock;
    try {
      await h.run(0);
      slow = true;
      await h.run(1);
      await h.run(2);
      expect(h.mails).toEqual([]);
      await h.run(3);
    } finally {
      Date.now = realNow;
    }
    expect(h.mails).toHaveLength(1);
    expect(h.mails[0]!.subject).toBe('[kernelCAD DOWN] healthz latency over 5 s');
    expect(h.mails[0]!.text).toContain('error: healthz took 6.0 s (limit 5 s)');
  });

  it('a failed alert email is retried on the next run', async () => {
    const h = harness();
    await h.run(0);
    h.prod.siteStatus = 500;
    await h.run(1);
    h.setFailSend(true);
    const out = await h.run(2);
    expect(out.emailError).toBe('email.sending.error');
    h.setFailSend(false);
    await h.run(3);
    expect(h.mails).toHaveLength(1);
    expect(h.mails[0]!.text).toContain('since: 2026-09-29T06:05:00Z (10 min, 3 failed runs in a row)');
  });

  it('daily summary: sent once per UTC day, covers the last 24 h', async () => {
    const h = harness();
    for (let i = 0; i < 4; i++) await h.run(i);
    const at = T0 + 60 * MIN; // 07:00 UTC
    const first = await runDailySummary(h.deps, at);
    expect(first.sent).toBe(true);
    expect(h.mails[0]!.subject).toBe('[kernelCAD daily] worst 100.00%, 0 incident(s), 0 deploy(s)');
    expect(h.mails[0]!.text).toContain('API /healthz: 4 runs, 100.00%');
    expect(h.mails[0]!.text).toContain('MCP export STEP + download: 1 runs, 100.00%');
    expect((await runDailySummary(h.deps, at + 5 * MIN)).sent).toBe(false);
    expect(h.mails).toHaveLength(1);
    expect(h.store.meta.lastSummaryDay).toBe('2026-09-29');
  });

  it('/status body: latest verdict per check, no signed URLs', async () => {
    const h = harness();
    await h.run(0);
    h.prod.appStatus = 503;
    await h.run(1);
    const body = await statusBody(h.store);
    expect(body).toMatchObject({ service: 'kernelcad-uptime', ok: false, commit: 'a'.repeat(40), lastRunAt: '2026-09-29T06:05:00Z' });
    const checks = body['checks'] as Array<Record<string, unknown>>;
    expect(checks).toHaveLength(CHECKS.length);
    expect(checks.find((c) => c['id'] === 'web_app')).toMatchObject({
      ok: false,
      error: 'app: HTTP 503 <html></html>',
      failingSince: '2026-09-29T06:05:00Z',
      failsInARow: 1,
    });
    // Not due at :05: its latest verdict is still the :00 one.
    expect(checks.find((c) => c['id'] === 'mcp_export_step')).toMatchObject({ ok: true, at: T0 });
    expect(JSON.stringify(body)).not.toContain('sig=');
  });
});
