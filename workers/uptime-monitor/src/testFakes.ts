// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/testFakes.ts
//
// A fake kernelCAD prod for the unit tests: a `fetch` that answers every URL
// the checks call, with knobs to break each part.

import type { FetchLike } from './checks';

export const DOWNLOAD_URL = 'https://api.kernelcad.com/api/v1/exports/20260929-abc/uptime-cube.step?exp=1&sig=x';

export interface FakeProd {
  commit: string;
  healthStatus: number;
  healthBody?: unknown;
  warm: boolean;
  kills: Record<string, number>;
  respawns: number;
  mcpStatus: number;
  tools: string[];
  evalOk: boolean;
  exportUrl: string;
  stepBody: string;
  oauthStatus: number;
  appStatus: number;
  siteStatus: number;
  subscribeStatus: number;
  subscribeLocation: string;
  /** Replies with SSE instead of JSON on /mcp. */
  sse: boolean;
  /** Never answers healthz (for timeouts). */
  hangHealthz: boolean;
  calls: Array<{ url: string; method: string; body?: string }>;
}

export function fakeProd(over: Partial<FakeProd> = {}): FakeProd {
  return {
    commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    healthStatus: 200,
    warm: true,
    kills: { memory: 1, time: 2, crash: 0, cancelled: 0 },
    respawns: 3,
    mcpStatus: 200,
    tools: ['evaluate_script', 'export', 'inspect', 'verify', 'lookup_api', 'query'],
    evalOk: true,
    exportUrl: DOWNLOAD_URL,
    stepBody: 'ISO-10303-21;\nHEADER;\n',
    oauthStatus: 200,
    appStatus: 200,
    siteStatus: 200,
    subscribeStatus: 303,
    subscribeLocation: 'https://kernelcad.com/?error=invalid_email#signup',
    sse: false,
    hangHealthz: false,
    calls: [],
    ...over,
  };
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function rpcReply(p: FakeProd, id: unknown, result: unknown, headers: Record<string, string> = {}): Response {
  const msg = { jsonrpc: '2.0', id, result };
  if (p.sse) {
    return new Response(`event: message\ndata: ${JSON.stringify(msg)}\n\n`, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', ...headers },
    });
  }
  return json(msg, 200, headers);
}

export function fakeFetch(p: FakeProd): FetchLike {
  return async (input, init) => {
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? init.body : undefined;
    p.calls.push({ url: input, method, body });
    const url = new URL(input);
    const at = `${url.host}${url.pathname}`;
    if (at === 'api.kernelcad.com/healthz') {
      if (p.hangHealthz) {
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      }
      if (p.healthStatus !== 200) return new Response('<html>502 Bad Gateway</html>', { status: p.healthStatus });
      return json(
        p.healthBody ?? {
          status: 'ok',
          commit: p.commit,
          occtPool: { workers: 2, busy: 0, queueDepth: 0, respawns: p.respawns, kills: p.kills, rssMb: [265, 129], warm: p.warm },
        },
      );
    }
    if (at === 'mcp.kernelcad.com/mcp') {
      if (p.mcpStatus !== 200) return new Response('bad gateway', { status: p.mcpStatus });
      const msg = JSON.parse(body ?? '{}') as { id?: unknown; method: string; params?: { name?: string } };
      if (msg.id === undefined) return new Response(null, { status: 202 });
      if (msg.method === 'initialize') {
        return rpcReply(p, msg.id, { protocolVersion: '2025-06-18', serverInfo: { name: 'kernelcad' } }, { 'mcp-session-id': 'kc1.test' });
      }
      if (msg.method === 'tools/list') return rpcReply(p, msg.id, { tools: p.tools.map((name) => ({ name })) });
      if (msg.method === 'tools/call' && msg.params?.name === 'evaluate_script') {
        const payload = p.evalOk ? { ok: true, featureCount: 1 } : { ok: false, error: 'occt pool exhausted' };
        return rpcReply(p, msg.id, { content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload });
      }
      if (msg.method === 'tools/call' && msg.params?.name === 'export') {
        const payload = { ok: true, format: 'step', downloads: [{ filename: 'uptime-cube.step', url: p.exportUrl }] };
        return rpcReply(p, msg.id, {
          content: [
            { type: 'text', text: `Download: ${p.exportUrl}` },
            { type: 'text', text: JSON.stringify(payload) },
          ],
        });
      }
      return json({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'not found' } });
    }
    if (at === 'api.kernelcad.com/api/v1/exports/20260929-abc/uptime-cube.step') {
      return new Response(p.stepBody, { status: 200, headers: { 'Content-Type': 'model/step' } });
    }
    if (at.startsWith('mcp.kernelcad.com/.well-known/')) {
      return p.oauthStatus === 200 ? json({ issuer: 'https://mcp.kernelcad.com' }) : new Response('x', { status: p.oauthStatus });
    }
    if (at === 'app.kernelcad.com/') return new Response('<html></html>', { status: p.appStatus });
    if (at === 'kernelcad.com/api/subscribe') {
      const h: Record<string, string> = p.subscribeLocation ? { Location: p.subscribeLocation } : {};
      return new Response(null, { status: p.subscribeStatus, headers: h });
    }
    if (at === 'kernelcad.com/') return new Response('<html></html>', { status: p.siteStatus });
    return new Response('not found', { status: 404 });
  };
}
