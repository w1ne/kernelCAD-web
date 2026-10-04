// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/checks.ts
//
// The prod checks the uptime monitor runs. Each check is anonymous and
// read-only: no account, no project, no subscriber row. A check returns
// { ok, latencyMs, error?, detail? }; it never throws. `fetch` is injected so
// the tests run against a mocked network.

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const API_ORIGIN = 'https://api.kernelcad.com';
export const MCP_ORIGIN = 'https://mcp.kernelcad.com';
export const APP_ORIGIN = 'https://app.kernelcad.com';
export const SITE_ORIGIN = 'https://kernelcad.com';

/** Per-check wall-clock budget. A check that runs longer fails with a timeout. */
export const CHECK_TIMEOUT_MS = 20_000;
/** MCP `clientInfo.name` and User-Agent: lets server logs and analytics exclude monitor traffic. */
export const MONITOR_CLIENT = 'kernelcad-uptime';
export const USER_AGENT = `${MONITOR_CLIENT}/1 (+https://kernelcad.com)`;

/** The tools an agent needs for the basic loop. tools/list must list all of them. */
export const CORE_TOOLS = ['evaluate_script', 'export', 'inspect', 'verify', 'lookup_api'];
/** The cheapest real model: one 10 mm cube through the full OCCT evaluation. */
export const CUBE_CODE = 'return box(10, 10, 10);';

/** Pool numbers from /healthz, kept with every healthz result. */
export interface HealthDetail {
  commit: string;
  warm: boolean;
  workers: number;
  busy: number;
  queueDepth: number;
  /** Sum of occtPool.kills over all causes (memory, time, crash, ...). */
  kills: number;
  killsByCause: Record<string, number>;
  respawns: number;
  rssMb: number[];
}

export interface CheckResult {
  id: CheckId;
  ok: boolean;
  latencyMs: number;
  error?: string;
  detail?: HealthDetail;
}

export type CheckId =
  | 'healthz'
  | 'mcp'
  | 'mcp_export_step'
  | 'oauth_as'
  | 'oauth_prm'
  | 'web_app'
  | 'web_site'
  | 'web_subscribe';

export interface CheckDef {
  id: CheckId;
  name: string;
  /** Minutes between runs. The cron fires every 5 minutes. */
  everyMin: 5 | 30;
  run: (fetch: FetchLike) => Promise<Omit<CheckResult, 'id' | 'latencyMs'>>;
}

class CheckError extends Error {}

function fail(message: string): never {
  throw new CheckError(message);
}

function snippet(text: string, max = 120): string {
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

async function expectStatus(res: Response, want: number, what: string): Promise<void> {
  if (res.status !== want) {
    const body = await res.text().catch(() => '');
    fail(`${what}: HTTP ${res.status}${body ? ` ${snippet(body)}` : ''}`);
  }
}

async function readJson(res: Response, what: string): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    fail(`${what}: body is not JSON: ${snippet(text)}`);
  }
}

/** Parse the /healthz body into the numbers the alerts and the summary use. */
export function parseHealth(body: unknown): HealthDetail {
  const b = isRecord(body) ? body : {};
  const pool = isRecord(b['occtPool']) ? b['occtPool'] : {};
  const rawKills = pool['kills'];
  const killsByCause: Record<string, number> = {};
  if (isRecord(rawKills)) {
    for (const [k, v] of Object.entries(rawKills)) killsByCause[k] = num(v);
  }
  const kills = isRecord(rawKills)
    ? Object.values(killsByCause).reduce((a, n) => a + n, 0)
    : num(rawKills);
  return {
    commit: typeof b['commit'] === 'string' ? b['commit'] : 'unknown',
    warm: pool['warm'] === true,
    workers: num(pool['workers']),
    busy: num(pool['busy']),
    queueDepth: num(pool['queueDepth']),
    kills,
    killsByCause,
    respawns: num(pool['respawns']),
    rssMb: Array.isArray(pool['rssMb']) ? pool['rssMb'].map(num) : [],
  };
}

async function checkHealthz(fetch: FetchLike): Promise<Omit<CheckResult, 'id' | 'latencyMs'>> {
  const res = await fetch(`${API_ORIGIN}/healthz`, { headers: { Accept: 'application/json' } });
  await expectStatus(res, 200, 'healthz');
  const body = await readJson(res, 'healthz');
  const detail = parseHealth(body);
  const status = isRecord(body) ? body['status'] : undefined;
  if (status !== 'ok') return { ok: false, error: `healthz: status is ${JSON.stringify(status)}`, detail };
  if (!detail.warm) return { ok: false, error: 'healthz: occtPool.warm is false', detail };
  return { ok: true, detail };
}

// ---------------------------------------------------------------------------
// MCP over streamable HTTP, as a client sees it
// ---------------------------------------------------------------------------

interface McpSession {
  fetch: FetchLike;
  sessionId?: string;
  nextId: number;
}

/** Read a JSON-RPC reply that came back either as JSON or as one SSE message. */
function parseRpcBody(text: string, contentType: string): unknown {
  if (contentType.includes('text/event-stream')) {
    const data = text
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .filter(Boolean);
    const last = data[data.length - 1];
    if (!last) fail(`empty event stream`);
    return JSON.parse(last);
  }
  return JSON.parse(text);
}

async function rpc(s: McpSession, method: string, params?: unknown): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': USER_AGENT,
  };
  if (s.sessionId) headers['mcp-session-id'] = s.sessionId;
  const id = s.nextId++;
  const res = await s.fetch(`${MCP_ORIGIN}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) }),
  });
  await expectStatus(res, 200, method);
  const sid = res.headers.get('mcp-session-id');
  if (sid) s.sessionId = sid;
  const text = await res.text();
  let msg: unknown;
  try {
    msg = parseRpcBody(text, res.headers.get('content-type') ?? '');
  } catch (err) {
    if (err instanceof CheckError) throw new CheckError(`${method}: ${err.message}`);
    fail(`${method}: reply is not JSON-RPC: ${snippet(text)}`);
  }
  if (!isRecord(msg)) fail(`${method}: reply is not an object`);
  if (isRecord(msg['error'])) fail(`${method}: JSON-RPC error ${snippet(JSON.stringify(msg['error']))}`);
  if (!isRecord(msg['result'])) fail(`${method}: reply has no result`);
  return msg['result'];
}

async function notify(s: McpSession, method: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': USER_AGENT,
  };
  if (s.sessionId) headers['mcp-session-id'] = s.sessionId;
  const res = await s.fetch(`${MCP_ORIGIN}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', method }),
  });
  await res.text().catch(() => '');
  if (res.status >= 400) fail(`${method}: HTTP ${res.status}`);
}

async function openSession(fetch: FetchLike): Promise<McpSession> {
  const s: McpSession = { fetch, nextId: 1 };
  const init = await rpc(s, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: MONITOR_CLIENT, version: '1' },
  });
  if (!isRecord(init['serverInfo'])) fail('initialize: no serverInfo');
  await notify(s, 'notifications/initialized');
  return s;
}

/** The tool's own JSON payload: structuredContent, else the first JSON text block. */
export function toolPayload(result: Record<string, unknown>): Record<string, unknown> | undefined {
  if (isRecord(result['structuredContent'])) return result['structuredContent'];
  const content = Array.isArray(result['content']) ? result['content'] : [];
  for (const c of content) {
    if (!isRecord(c) || c['type'] !== 'text' || typeof c['text'] !== 'string') continue;
    try {
      const parsed = JSON.parse(c['text']);
      if (isRecord(parsed)) return parsed;
    } catch {
      // Prose block (e.g. the "Download: ..." line); keep looking.
    }
  }
  return undefined;
}

async function callTool(s: McpSession, name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const result = await rpc(s, 'tools/call', { name, arguments: args });
  const payload = toolPayload(result);
  if (result['isError'] === true || !payload || payload['ok'] !== true) {
    const why = payload ? JSON.stringify(payload['error'] ?? payload['diagnostics'] ?? payload) : JSON.stringify(result);
    fail(`${name}: tool returned not ok: ${snippet(why)}`);
  }
  return payload;
}

async function checkMcp(fetch: FetchLike): Promise<Omit<CheckResult, 'id' | 'latencyMs'>> {
  const s = await openSession(fetch);
  const list = await rpc(s, 'tools/list');
  const tools = Array.isArray(list['tools']) ? list['tools'] : [];
  const names = new Set(tools.map((t) => (isRecord(t) ? t['name'] : undefined)));
  const missing = CORE_TOOLS.filter((t) => !names.has(t));
  if (missing.length) fail(`tools/list: missing core tools ${missing.join(', ')} (got ${names.size} tools)`);
  await callTool(s, 'evaluate_script', { code: CUBE_CODE });
  return { ok: true };
}

/** Only follow download links that point back at our own API. */
export function isOwnDownloadUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.host === new URL(API_ORIGIN).host && u.pathname.startsWith('/api/v1/exports/');
  } catch {
    return false;
  }
}

function downloadUrlOf(payload: Record<string, unknown>): string | undefined {
  const downloads = Array.isArray(payload['downloads']) ? payload['downloads'] : [];
  for (const d of downloads) if (isRecord(d) && typeof d['url'] === 'string') return d['url'];
  return typeof payload['download_url'] === 'string' ? payload['download_url'] : undefined;
}

async function checkExportStep(fetch: FetchLike): Promise<Omit<CheckResult, 'id' | 'latencyMs'>> {
  const s = await openSession(fetch);
  const payload = await callTool(s, 'export', {
    target: 'model',
    code: CUBE_CODE,
    format: 'step',
    output_path: 'uptime-cube.step',
  });
  const url = downloadUrlOf(payload);
  // The signed URL is a secret-ish capability; never put it in an error.
  if (!url) fail('export: no download URL in the result');
  if (!isOwnDownloadUrl(url)) fail('export: download URL is not on api.kernelcad.com/api/v1/exports/');
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  await expectStatus(res, 200, 'download');
  const head = (await res.text()).slice(0, 64);
  if (!head.startsWith('ISO-10303-21')) fail(`download: body does not start with ISO-10303-21: ${snippet(head, 40)}`);
  return { ok: true };
}

function jsonDoc(url: string, what: string) {
  return async (fetch: FetchLike): Promise<Omit<CheckResult, 'id' | 'latencyMs'>> => {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } });
    await expectStatus(res, 200, what);
    const body = await readJson(res, what);
    if (!isRecord(body)) fail(`${what}: body is not a JSON object`);
    return { ok: true };
  };
}

function page(url: string, what: string) {
  return async (fetch: FetchLike): Promise<Omit<CheckResult, 'id' | 'latencyMs'>> => {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    await expectStatus(res, 200, what);
    return { ok: true };
  };
}

/**
 * POST an empty signup form. The Pages Function rejects it before any D1 write.
 * Its contract is a 303 to `/?error=...` (the no-JS form flow); a plain 4xx also
 * counts as a correct rejection. 5xx, 405 (route not deployed) and 2xx fail.
 */
async function checkSubscribe(fetch: FetchLike): Promise<Omit<CheckResult, 'id' | 'latencyMs'>> {
  const res = await fetch(`${SITE_ORIGIN}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
    body: 'email=',
    redirect: 'manual',
  });
  await res.text().catch(() => '');
  const loc = res.headers.get('location') ?? '';
  if (res.status >= 300 && res.status < 400) {
    if (!loc.includes('error=')) fail(`subscribe: HTTP ${res.status} to ${snippet(loc, 80)} (expected an ?error= redirect)`);
    return { ok: true };
  }
  if (res.status >= 400 && res.status < 500 && res.status !== 405) return { ok: true };
  fail(`subscribe: HTTP ${res.status} for an invalid body (expected a rejection)`);
}

export const CHECKS: CheckDef[] = [
  { id: 'healthz', name: 'API /healthz', everyMin: 5, run: checkHealthz },
  { id: 'mcp', name: 'MCP initialize + tools/list + evaluate_script', everyMin: 5, run: checkMcp },
  { id: 'mcp_export_step', name: 'MCP export STEP + download', everyMin: 30, run: checkExportStep },
  {
    id: 'oauth_as',
    name: 'OAuth authorization server metadata',
    everyMin: 5,
    run: jsonDoc(`${MCP_ORIGIN}/.well-known/oauth-authorization-server`, 'oauth-authorization-server'),
  },
  {
    id: 'oauth_prm',
    name: 'OAuth protected resource metadata',
    everyMin: 5,
    run: jsonDoc(`${MCP_ORIGIN}/.well-known/oauth-protected-resource/mcp`, 'oauth-protected-resource'),
  },
  { id: 'web_app', name: 'app.kernelcad.com', everyMin: 5, run: page(`${APP_ORIGIN}/`, 'app') },
  { id: 'web_site', name: 'kernelcad.com', everyMin: 5, run: page(`${SITE_ORIGIN}/`, 'site') },
  { id: 'web_subscribe', name: 'kernelcad.com /api/subscribe rejects bad input', everyMin: 5, run: checkSubscribe },
];

export function checkName(id: string): string {
  if (id === LATENCY_ID) return 'healthz latency over 5 s';
  return CHECKS.find((c) => c.id === id)?.name ?? id;
}

/** Pseudo-check id for the healthz latency alert. */
export const LATENCY_ID = 'healthz_latency';

/** Wrap `fetch` so every request of one check shares one deadline. */
function withDeadline(fetch: FetchLike, signal: AbortSignal): FetchLike {
  return (input, init) => fetch(input, { ...init, signal });
}

/** Run one check with the timeout. Never throws. */
export async function runCheck(
  def: CheckDef,
  fetch: FetchLike,
  opts: { timeoutMs?: number; now?: () => number } = {},
): Promise<CheckResult> {
  const now = opts.now ?? Date.now;
  const timeoutMs = opts.timeoutMs ?? CHECK_TIMEOUT_MS;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new CheckError(`timeout after ${Math.round(timeoutMs / 1000)} s`));
    }, timeoutMs);
  });
  const t0 = now();
  try {
    const r = await Promise.race([def.run(withDeadline(fetch, controller.signal)), timeout]);
    return { id: def.id, latencyMs: now() - t0, ...r };
  } catch (err) {
    const message = err instanceof CheckError ? err.message : `${def.id}: ${err instanceof Error ? err.message : String(err)}`;
    return { id: def.id, ok: false, latencyMs: now() - t0, error: snippet(message, 300) };
  } finally {
    clearTimeout(timer);
  }
}
