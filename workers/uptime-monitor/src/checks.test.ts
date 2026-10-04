// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/checks.test.ts
//
// Check evaluation against a mocked prod. No network.

import { describe, it, expect } from 'vitest';
import { CHECKS, isOwnDownloadUrl, parseHealth, runCheck, type CheckId } from './checks';
import { fakeFetch, fakeProd, type FakeProd } from './testFakes';

function def(id: CheckId) {
  return CHECKS.find((c) => c.id === id)!;
}

async function run(id: CheckId, over: Partial<FakeProd> = {}, timeoutMs?: number) {
  const p = fakeProd(over);
  const r = await runCheck(def(id), fakeFetch(p), { timeoutMs });
  return { r, p };
}

describe('uptime checks', () => {
  it('all checks pass against a healthy prod', async () => {
    const p = fakeProd();
    const results = await Promise.all(CHECKS.map((c) => runCheck(c, fakeFetch(p))));
    expect(results.filter((r) => !r.ok)).toEqual([]);
  });

  it('healthz: reads commit, kills, respawns and rssMb', async () => {
    const { r } = await run('healthz');
    expect(r.ok).toBe(true);
    expect(r.detail).toMatchObject({
      commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      warm: true,
      kills: 3,
      killsByCause: { memory: 1, time: 2, crash: 0, cancelled: 0 },
      respawns: 3,
      rssMb: [265, 129],
    });
  });

  it('healthz: fails on 502, on status != ok, and on a cold pool', async () => {
    expect((await run('healthz', { healthStatus: 502 })).r).toMatchObject({ ok: false, error: expect.stringContaining('HTTP 502') });
    const notOk = await run('healthz', { healthBody: { status: 'degraded', occtPool: { warm: true } } });
    expect(notOk.r).toMatchObject({ ok: false, error: 'healthz: status is "degraded"' });
    const cold = await run('healthz', { warm: false });
    expect(cold.r).toMatchObject({ ok: false, error: 'healthz: occtPool.warm is false' });
    // The pool numbers are still kept for the email.
    expect(cold.r.detail?.commit).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('healthz: a hang fails with a timeout', async () => {
    const { r } = await run('healthz', { hangHealthz: true }, 50);
    expect(r).toMatchObject({ ok: false, error: 'timeout after 0 s' });
  });

  it('parseHealth accepts a numeric kills counter', () => {
    expect(parseHealth({ occtPool: { kills: 4 } }).kills).toBe(4);
    expect(parseHealth(null).commit).toBe('unknown');
  });

  it('mcp: initialize, tools/list, evaluate_script in one session', async () => {
    const { r, p } = await run('mcp');
    expect(r.ok).toBe(true);
    const methods = p.calls.map((c) => (c.body ? JSON.parse(c.body).method : c.method));
    expect(methods).toEqual(['initialize', 'notifications/initialized', 'tools/list', 'tools/call']);
    const call = JSON.parse(p.calls[3]!.body!);
    expect(call.params).toEqual({ name: 'evaluate_script', arguments: { code: 'return box(10, 10, 10);' } });
  });

  it('mcp: reads SSE replies too', async () => {
    expect((await run('mcp', { sse: true })).r.ok).toBe(true);
  });

  it('mcp: fails on a missing core tool, a failed eval and a 502', async () => {
    expect((await run('mcp', { tools: ['evaluate_script', 'inspect'] })).r.error).toContain(
      'tools/list: missing core tools export, verify, lookup_api',
    );
    expect((await run('mcp', { evalOk: false })).r.error).toContain('evaluate_script: tool returned not ok');
    expect((await run('mcp', { mcpStatus: 502 })).r.error).toBe('initialize: HTTP 502 bad gateway');
  });

  it('export: exports a STEP and downloads it', async () => {
    const { r, p } = await run('mcp_export_step');
    expect(r.ok).toBe(true);
    const call = JSON.parse(p.calls.find((c) => c.body?.includes('"export"'))!.body!);
    expect(call.params.arguments).toMatchObject({ target: 'model', format: 'step' });
    expect(p.calls.at(-1)!.url).toContain('/api/v1/exports/');
  });

  it('export: fails when the download is not a STEP file, without leaking the signed URL', async () => {
    const { r } = await run('mcp_export_step', { stepBody: '<html>Not found</html>' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('does not start with ISO-10303-21');
    expect(r.error).not.toContain('sig=');
  });

  it('export: refuses to follow a download URL off our API', async () => {
    const { r, p } = await run('mcp_export_step', { exportUrl: 'https://evil.example/x.step' });
    expect(r.error).toBe('export: download URL is not on api.kernelcad.com/api/v1/exports/');
    expect(p.calls.some((c) => c.url.startsWith('https://evil.example'))).toBe(false);
    expect(isOwnDownloadUrl('https://api.kernelcad.com/api/v1/exports/a/b.step')).toBe(true);
  });

  it('oauth and web pages: 200 passes, 5xx fails', async () => {
    expect((await run('oauth_as')).r.ok).toBe(true);
    expect((await run('oauth_prm', { oauthStatus: 404 })).r.error).toContain('HTTP 404');
    expect((await run('web_app', { appStatus: 522 })).r.error).toBe('app: HTTP 522 <html></html>');
    expect((await run('web_site')).r.ok).toBe(true);
  });

  it('subscribe: an error redirect or a 4xx passes; 5xx, 405, 2xx and a success redirect fail', async () => {
    expect((await run('web_subscribe')).r.ok).toBe(true);
    const sent = (await run('web_subscribe')).p.calls[0]!;
    expect(sent).toMatchObject({ method: 'POST', body: 'email=' });
    expect((await run('web_subscribe', { subscribeStatus: 400, subscribeLocation: '' })).r.ok).toBe(true);
    expect((await run('web_subscribe', { subscribeStatus: 500 })).r.ok).toBe(false);
    expect((await run('web_subscribe', { subscribeStatus: 405 })).r.ok).toBe(false);
    expect((await run('web_subscribe', { subscribeStatus: 200 })).r.ok).toBe(false);
    expect((await run('web_subscribe', { subscribeLocation: 'https://kernelcad.com/thanks' })).r.ok).toBe(false);
  });

  it('a network error becomes a failed result, not a throw', async () => {
    const r = await runCheck(def('web_site'), async () => {
      throw new TypeError('fetch failed');
    });
    expect(r).toMatchObject({ ok: false, error: 'web_site: fetch failed' });
  });
});
