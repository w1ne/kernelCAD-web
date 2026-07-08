# Text-to-3D Preview (Paid) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paid-only "Generate concept (preview)" feature to KernelCAD Studio: a signed-in **paid** user types a prompt, the server calls Tripo's text-to-3D API, streams progress over SSE, and the Studio renders the returned GLB in a `<model-viewer>`, with a stubbed "Rebuild as parametric CAD" button.

**Architecture:** A new authenticated server route `POST /api/v1/preview/text-to-3d` gates on the existing paid-subscription check (`getUserBilling().subStatus`), then drives a thin `tripoClient` (submit job → poll → GLB URL) and streams status/done/error events using the existing `SseWriter`. **No DB persistence and no quota metering in v1** — paid users are unlimited and free users are rejected with `402` *before* any Tripo spend, so there is nothing to meter. The web side mirrors the existing `generateClient`/`useGeneration` SSE pattern (`previewClient` + `useTextTo3dPreview`) and renders the GLB URL with `@google/model-viewer` (already a dependency).

**Tech Stack:** Node/Express + Zod + Supabase (server, repo `kernelCAD-server`, TypeScript ESM with `.js` import specifiers); React + Vite + vitest + `@google/model-viewer` (web, repo `kernelCAD-web`).

## Global Constraints

- Server repo `kernelCAD-server`, branch `feat/text-to-3d-preview` off `origin/main`. ESM: **all relative imports end in `.js`** (e.g. `'../lib/auth.js'`).
- Web repo `kernelCAD-web`, branch `feat/paid-text-to-3d-preview` off `develop` (already created; this plan + the spec live there).
- Paid-only, **no free trials**. The server route MUST reject non-paid users with HTTP `402` **before** calling Tripo (no provider spend on free users).
- Paid check is verbatim the existing one: `subStatus === 'pro_active' || subStatus === 'pro_canceled'` (mirror `src/lib/agentQuota.ts:26`).
- When `TRIPO_API_KEY` is unset, the route returns `503 { error: 'feature_unavailable' }` and the Studio hides/disables the entry — the feature ships dark until the key is set in prod.
- Tests: server uses vitest with hoisted `vi.mock` (mirror `src/routes/render.test.ts`); web uses vitest + Testing Library (mirror existing `src/**/__tests__`).
- v1 returns Tripo's hosted GLB URL directly (provider URLs expire after a few hours — acceptable for an in-session preview). Re-hosting to Supabase Storage + a `preview_assets` history table are explicit **deferred** fast-follows (see "Deferred").

---

### Task 1: Server — `tripoClient` provider + env vars

**Files:**
- Modify: `kernelCAD-server/src/env.ts` (add three optional env vars to the zod schema)
- Create: `kernelCAD-server/src/lib/tripoClient.ts`
- Test: `kernelCAD-server/src/lib/tripoClient.test.ts`

**Interfaces:**
- Consumes: `loadEnv()` from `../env.js`.
- Produces:
  - `interface Text3dResult { glbUrl: string; costUsd: number | null; taskId: string }`
  - `interface Text3dProgress { status: 'queued' | 'running'; progress: number }`
  - `async function generatePreview(prompt: string, onProgress?: (p: Text3dProgress) => void): Promise<Text3dResult>` — throws `Error` on provider failure/timeout.
  - `function tripoConfigured(): boolean` — true when `TRIPO_API_KEY` is set.

- [ ] **Step 1: Add env vars.** In `kernelCAD-server/src/env.ts`, inside the `z.object({ ... })` schema (mirror the existing `STRIPE_PRICE_ID_STANDARD: z.string().optional(),` and `LLM_BASE_URL: z.string().url().default(...)` lines), add:

```ts
  TRIPO_API_KEY: z.string().optional(),
  TRIPO_BASE_URL: z.string().url().default('https://api.tripo3d.ai/v2/openapi'),
  TEXT3D_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
```

- [ ] **Step 2: Write the failing test.** Create `kernelCAD-server/src/lib/tripoClient.test.ts`. Mock `global.fetch` so the client submits a task then polls to success. (The exact Tripo JSON field names are confirmed against docs in Step 3; the test pins the shape this client expects.)

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePreview, tripoConfigured } from './tripoClient.js';

const OLD_ENV = process.env;
beforeEach(() => {
  process.env = { ...OLD_ENV, TRIPO_API_KEY: 'tk_test', TRIPO_BASE_URL: 'https://tripo.test/v2/openapi', TEXT3D_TIMEOUT_MS: '5000' };
});
afterEach(() => { process.env = OLD_ENV; vi.restoreAllMocks(); });

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('generatePreview', () => {
  it('submits a task then polls until success and returns the GLB url', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { task_id: 'task_123' } }))            // submit
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { status: 'running', progress: 40 } })) // poll 1
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { status: 'success', progress: 100, output: { pbr_model: 'https://tripo.test/out/model.glb' } } })); // poll 2

    const progress: number[] = [];
    const result = await generatePreview('a small enclosure', p => progress.push(p.progress));

    expect(result.glbUrl).toBe('https://tripo.test/out/model.glb');
    expect(result.taskId).toBe('task_123');
    expect(progress).toContain(40);
    // first call is the submit POST with the bearer key
    const [, submitInit] = fetchMock.mock.calls[0];
    expect((submitInit as RequestInit).method).toBe('POST');
    expect((submitInit as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tk_test' });
  });

  it('throws when the provider reports failure', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { task_id: 'task_x' } }))
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { status: 'failed' } }));
    await expect(generatePreview('bad')).rejects.toThrow(/failed/i);
  });

  it('tripoConfigured reflects the key presence', () => {
    expect(tripoConfigured()).toBe(true);
    delete process.env.TRIPO_API_KEY;
    expect(tripoConfigured()).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails.** Run: `cd kernelCAD-server && npx vitest run src/lib/tripoClient.test.ts`. Expected: FAIL with "Cannot find module './tripoClient.js'".

- [ ] **Step 4: Implement `tripoClient.ts`.** Create `kernelCAD-server/src/lib/tripoClient.ts`. Mirror the lazy-config style of `llmClient.ts`. **Before finalizing, confirm the request/response field names against https://docs.tripo3d.ai (task type, `output.pbr_model` vs `output.model`, status enum) — adjust the parsing accordingly; the polling/timeout structure stays the same.**

```ts
import { loadEnv } from '../env.js';

export interface Text3dResult { glbUrl: string; costUsd: number | null; taskId: string }
export interface Text3dProgress { status: 'queued' | 'running'; progress: number }

export function tripoConfigured(): boolean {
  return Boolean(process.env.TRIPO_API_KEY);
}

const POLL_INTERVAL_MS = 2_000;

export async function generatePreview(
  prompt: string,
  onProgress?: (p: Text3dProgress) => void,
): Promise<Text3dResult> {
  const env = loadEnv();
  const key = env.TRIPO_API_KEY;
  if (!key) throw new Error('tripo: TRIPO_API_KEY not configured');
  const base = env.TRIPO_BASE_URL;
  const auth = { Authorization: `Bearer ${key}` };

  // 1) Submit the text-to-model task.
  const submitRes = await fetch(`${base}/task`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'text_to_model', prompt }),
  });
  if (!submitRes.ok) throw new Error(`tripo submit: HTTP ${submitRes.status}`);
  const submit = (await submitRes.json()) as { data?: { task_id?: string } };
  const taskId = submit.data?.task_id;
  if (!taskId) throw new Error('tripo submit: no task_id');

  // 2) Poll until success/failure or timeout.
  const deadline = Date.now() + env.TEXT3D_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const pollRes = await fetch(`${base}/task/${taskId}`, { headers: auth });
    if (!pollRes.ok) throw new Error(`tripo poll: HTTP ${pollRes.status}`);
    const poll = (await pollRes.json()) as {
      data?: { status?: string; progress?: number; output?: { pbr_model?: string; model?: string } };
    };
    const status = poll.data?.status;
    if (status === 'success') {
      const glbUrl = poll.data?.output?.pbr_model ?? poll.data?.output?.model;
      if (!glbUrl) throw new Error('tripo: success but no model url');
      return { glbUrl, costUsd: null, taskId };
    }
    if (status === 'failed' || status === 'cancelled' || status === 'unknown') {
      throw new Error(`tripo: task ${status}`);
    }
    onProgress?.({ status: status === 'queued' ? 'queued' : 'running', progress: poll.data?.progress ?? 0 });
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('tripo: timed out');
}
```

- [ ] **Step 5: Run the test to verify it passes.** Run: `cd kernelCAD-server && npx vitest run src/lib/tripoClient.test.ts`. Expected: PASS (3 tests). Note: the timeout test relies on fake/real timers — the provided tests resolve before any `setTimeout`, so they pass without timer mocking.

- [ ] **Step 6: Commit.**

```bash
cd kernelCAD-server
git add src/env.ts src/lib/tripoClient.ts src/lib/tripoClient.test.ts
git commit -m "feat(text3d): add Tripo provider client + env vars"
```

---

### Task 2: Server — paid-gated SSE route `POST /api/v1/preview/text-to-3d`

**Files:**
- Create: `kernelCAD-server/src/routes/preview.ts`
- Modify: `kernelCAD-server/src/index.ts` (import + mount the router)
- Test: `kernelCAD-server/src/routes/preview.test.ts`

**Interfaces:**
- Consumes: `requireUser` (`../lib/auth.js`), `getUserBilling` (`../lib/usersRepo.js`), `SseWriter` (`../lib/sse.js`), `generatePreview`/`tripoConfigured` (`../lib/tripoClient.js`), `logger` (`../logger.js`).
- Produces: `export const previewRouter: Router`. SSE events on success path: `event: status` `{ progress }`, `event: preview_done` `{ glbUrl, costUsd, taskId }`, `event: error` `{ code, message }`. Pre-stream JSON failures: `401` (anon, written by `requireUser`), `402 { error:'not_paid' }` (free), `503 { error:'feature_unavailable' }` (no key), `400 { error:'bad_request' }` (empty prompt).

- [ ] **Step 1: Write the failing test.** Create `kernelCAD-server/src/routes/preview.test.ts`. Mock auth, billing, and the tripo client (hoisted mocks, mirror `render.test.ts:11-24`). **Drive the router with a real ephemeral express server (`app.listen(0)`) + `fetch()` — this is the existing route-test pattern (`render.test.ts`); there is NO `supertest` dependency, do not add one.**

```ts
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';

const { requireUserMock, getUserBillingMock, generatePreviewMock, tripoConfiguredMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getUserBillingMock: vi.fn(),
  generatePreviewMock: vi.fn(),
  tripoConfiguredMock: vi.fn(),
}));
vi.mock('../lib/auth.js', () => ({ requireUser: requireUserMock }));
vi.mock('../lib/usersRepo.js', () => ({ getUserBilling: getUserBillingMock }));
vi.mock('../lib/tripoClient.js', () => ({ generatePreview: generatePreviewMock, tripoConfigured: tripoConfiguredMock }));

import express from 'express';
import { previewRouter } from './preview.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(previewRouter);
  await new Promise<void>(r => { server = app.listen(0, () => r()); });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no addr');
  baseUrl = `http://127.0.0.1:${addr.port}`;
});
afterAll(() => { server?.close(); });

function post(body: unknown): Promise<Response> {
  return fetch(`${baseUrl}/api/v1/preview/text-to-3d`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  tripoConfiguredMock.mockReturnValue(true);
  // requireUser writes nothing here (handler treats a truthy return as the user).
  requireUserMock.mockImplementation(async () => ({ userId: 'u1', email: 'a@b.c' }));
  getUserBillingMock.mockResolvedValue({ subStatus: 'pro_active', stripeCustomerId: 'cus_1' });
  generatePreviewMock.mockResolvedValue({ glbUrl: 'https://t/out.glb', costUsd: 0.2, taskId: 'task_1' });
});

describe('POST /api/v1/preview/text-to-3d', () => {
  it('503 when tripo not configured', async () => {
    tripoConfiguredMock.mockReturnValue(false);
    const res = await post({ prompt: 'x' });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('feature_unavailable');
  });

  it('402 for a free (non-paid) user — and does NOT call tripo', async () => {
    getUserBillingMock.mockResolvedValue({ subStatus: 'free', stripeCustomerId: null });
    const res = await post({ prompt: 'x' });
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe('not_paid');
    expect(generatePreviewMock).not.toHaveBeenCalled();
  });

  it('400 for an empty prompt', async () => {
    const res = await post({ prompt: '   ' });
    expect(res.status).toBe(400);
  });

  it('streams preview_done with the glb url for a paid user', async () => {
    const res = await post({ prompt: 'a bracket' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toContain('event: preview_done');
    expect(text).toContain('https://t/out.glb');
    expect(generatePreviewMock).toHaveBeenCalledWith('a bracket', expect.any(Function));
  });

  it('streams an error event when the provider throws', async () => {
    generatePreviewMock.mockRejectedValue(new Error('tripo: task failed'));
    const res = await post({ prompt: 'a bracket' });
    expect(res.status).toBe(200); // SSE opened before the failure
    expect(await res.text()).toContain('event: error');
  });
});
```

Note: `requireUser` is mocked to return a user object directly. Because the handler does `const user = await requireUser(req, res); if (!user) return;`, the mock returning a truthy object is sufficient — the 401-writing path isn't exercised in these tests (an anonymous-path test would need the mock to write the response and return null; out of scope here).

- [ ] **Step 2: Run the test to verify it fails.** Run: `cd kernelCAD-server && npx vitest run src/routes/preview.test.ts`. Expected: FAIL with "Cannot find module './preview.js'".

- [ ] **Step 3: Implement `preview.ts`.** Create `kernelCAD-server/src/routes/preview.ts`:

```ts
import { Router, type Request, type Response } from 'express';
import { requireUser } from '../lib/auth.js';
import { getUserBilling } from '../lib/usersRepo.js';
import { SseWriter } from '../lib/sse.js';
import { generatePreview, tripoConfigured } from '../lib/tripoClient.js';
import { logger } from '../logger.js';

export const previewRouter = Router();

previewRouter.post('/api/v1/preview/text-to-3d', async (req: Request, res: Response) => {
  // Feature is dark until a provider key is set.
  if (!tripoConfigured()) {
    res.status(503).json({ error: 'feature_unavailable' });
    return;
  }

  // Authenticated only — requireUser writes 401 for anonymous.
  const user = await requireUser(req, res);
  if (!user) return;

  const prompt = typeof (req.body as { prompt?: unknown })?.prompt === 'string'
    ? (req.body as { prompt: string }).prompt.trim()
    : '';
  if (!prompt) {
    res.status(400).json({ error: 'bad_request', message: 'prompt is required' });
    return;
  }

  // Paid-only. Reject free users BEFORE any provider spend. Same paid check as
  // the agent quota gate (agentQuota.ts).
  let billing;
  try {
    billing = await getUserBilling(user.userId);
  } catch (err) {
    logger.error({ err, userId: user.userId }, 'preview: getUserBilling failed');
    res.status(500).json({ error: 'billing_error' });
    return;
  }
  const paid = billing.subStatus === 'pro_active' || billing.subStatus === 'pro_canceled';
  if (!paid) {
    res.status(402).json({ error: 'not_paid', message: 'Text-to-3D preview is a paid feature.' });
    return;
  }

  // Open the SSE stream and drive the provider.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const sse = new SseWriter(res);

  try {
    const result = await generatePreview(prompt, p => sse.send('status', { progress: p.progress }));
    sse.send('preview_done', { glbUrl: result.glbUrl, costUsd: result.costUsd, taskId: result.taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err: message, userId: user.userId }, 'preview: provider failed');
    sse.send('error', { code: 'provider_failed', message });
  }
  await sse.end();
});
```

- [ ] **Step 4: Mount the router.** In `kernelCAD-server/src/index.ts`, mirror the billing router wiring (`import { billingRouter } from './routes/billing.js'` … `app.use(billingRouter)`). Add:

```ts
import { previewRouter } from './routes/preview.js';
// ...near app.use(billingRouter):
app.use(previewRouter);
```

- [ ] **Step 5: Run the test to verify it passes.** Run: `cd kernelCAD-server && npx vitest run src/routes/preview.test.ts`. Expected: PASS (5 tests). Uses only `express` + `fetch` (no `supertest`).

- [ ] **Step 6: Typecheck + commit.**

```bash
cd kernelCAD-server
npx tsc -b
git add src/routes/preview.ts src/routes/preview.test.ts src/index.ts
git commit -m "feat(text3d): paid-gated POST /api/v1/preview/text-to-3d SSE route"
```

---

### Task 3: Web — `previewClient` (SSE parse + authed POST)

**Files:**
- Create: `kernelCAD-web/src/funnel/lib/previewClient.ts`
- Test: `kernelCAD-web/src/funnel/lib/previewClient.test.ts`

**Interfaces:**
- Consumes: `getSupabase`, `isAuthConfigured` from `./supabaseClient` (same as `generateClient.ts`).
- Produces:
  - `type PreviewEvent = { kind: 'status'; progress: number } | { kind: 'preview_done'; glbUrl: string; costUsd: number | null; taskId: string } | { kind: 'error'; code: string; message: string }`
  - `async function* parsePreviewStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<PreviewEvent>`
  - `async function startPreview(prompt: string): Promise<Response>`

- [ ] **Step 1: Write the failing test.** Create `kernelCAD-web/src/funnel/lib/previewClient.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parsePreviewStream } from './previewClient';

function streamOf(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({ start(c) { c.enqueue(bytes); c.close(); } });
}

describe('parsePreviewStream', () => {
  it('parses status then preview_done', async () => {
    const sse =
      'event: status\ndata: {"progress":40}\n\n' +
      'event: preview_done\ndata: {"glbUrl":"https://t/out.glb","costUsd":0.2,"taskId":"task_1"}\n\n';
    const events = [];
    for await (const e of parsePreviewStream(streamOf(sse))) events.push(e);
    expect(events[0]).toEqual({ kind: 'status', progress: 40 });
    expect(events[1]).toEqual({ kind: 'preview_done', glbUrl: 'https://t/out.glb', costUsd: 0.2, taskId: 'task_1' });
  });

  it('parses an error event', async () => {
    const sse = 'event: error\ndata: {"code":"provider_failed","message":"boom"}\n\n';
    const events = [];
    for await (const e of parsePreviewStream(streamOf(sse))) events.push(e);
    expect(events[0]).toEqual({ kind: 'error', code: 'provider_failed', message: 'boom' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `cd kernelCAD-web && npx vitest run src/funnel/lib/previewClient.test.ts`. Expected: FAIL ("Cannot find module './previewClient'").

- [ ] **Step 3: Implement `previewClient.ts`.** Create `kernelCAD-web/src/funnel/lib/previewClient.ts`, mirroring `generateClient.ts` (same SSE block-splitting; `startPreview` mirrors `startGeneration`'s token-forwarding verbatim):

```ts
// SPDX-License-Identifier: MIT
import { getSupabase, isAuthConfigured } from './supabaseClient';

export type PreviewEvent =
  | { kind: 'status'; progress: number }
  | { kind: 'preview_done'; glbUrl: string; costUsd: number | null; taskId: string }
  | { kind: 'error'; code: string; message: string };

export async function* parsePreviewStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<PreviewEvent, void, void> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const parsed = parseBlock(raw);
        if (parsed) yield parsed;
      }
    }
    const tail = buffer.trim();
    if (tail) { const p = parseBlock(tail); if (p) yield p; }
  } finally {
    reader.releaseLock();
  }
}

function parseBlock(raw: string): PreviewEvent | null {
  let name = '', dataLine = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event: ')) name = line.slice(7).trim();
    else if (line.startsWith('data: ')) dataLine = line.slice(6);
  }
  if (!name || !dataLine) return null;
  let p: Record<string, unknown>;
  try { p = JSON.parse(dataLine); } catch { return null; }
  switch (name) {
    case 'status': return { kind: 'status', progress: Number(p.progress ?? 0) };
    case 'preview_done': return {
      kind: 'preview_done',
      glbUrl: typeof p.glbUrl === 'string' ? p.glbUrl : '',
      costUsd: typeof p.costUsd === 'number' ? p.costUsd : null,
      taskId: typeof p.taskId === 'string' ? p.taskId : '',
    };
    case 'error': return {
      kind: 'error',
      code: typeof p.code === 'string' ? p.code : 'error',
      message: typeof p.message === 'string' ? p.message : '',
    };
    default: return null;
  }
}

export async function startPreview(prompt: string): Promise<Response> {
  const base = import.meta.env.VITE_API_BASE_URL;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isAuthConfigured()) {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    } catch { /* anonymous → server 401 */ }
  }
  return fetch(`${base}/api/v1/preview/text-to-3d`, { method: 'POST', headers, body: JSON.stringify({ prompt }) });
}
```

- [ ] **Step 4: Run the test to verify it passes.** Run: `cd kernelCAD-web && npx vitest run src/funnel/lib/previewClient.test.ts`. Expected: PASS (2 tests).

- [ ] **Step 5: Commit.**

```bash
cd kernelCAD-web
git add src/funnel/lib/previewClient.ts src/funnel/lib/previewClient.test.ts
git commit -m "feat(text3d): web SSE preview client"
```

---

### Task 4: Web — `useTextTo3dPreview` hook

**Files:**
- Create: `kernelCAD-web/src/funnel/hooks/useTextTo3dPreview.ts`
- Test: `kernelCAD-web/src/funnel/hooks/useTextTo3dPreview.test.ts`

**Interfaces:**
- Consumes: `parsePreviewStream`, `startPreview` from `../lib/previewClient`.
- Produces: `function useTextTo3dPreview(): { phase: PreviewPhase; submit: (prompt: string) => Promise<void> }` where
  `type PreviewPhase = { state: 'idle' } | { state: 'running'; progress: number } | { state: 'done'; glbUrl: string; costUsd: number | null } | { state: 'error'; code: string; message: string } | { state: 'upgrade' }`.
  `state: 'upgrade'` is set on HTTP `402` (free user) so the UI shows the upgrade CTA; `401` also maps to `'upgrade'` (sign-in handled by the same panel).

- [ ] **Step 1: Write the failing test.** Create `kernelCAD-web/src/funnel/hooks/useTextTo3dPreview.test.ts` (mirror existing hook tests using `@testing-library/react`'s `renderHook`/`act`):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTextTo3dPreview } from './useTextTo3dPreview';
import * as client from '../lib/previewClient';

function sseResponse(text: string): Response {
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close(); } });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

beforeEach(() => vi.restoreAllMocks());

describe('useTextTo3dPreview', () => {
  it('reaches done with the glb url', async () => {
    vi.spyOn(client, 'startPreview').mockResolvedValue(
      sseResponse('event: preview_done\ndata: {"glbUrl":"https://t/out.glb","costUsd":0.2,"taskId":"t1"}\n\n'),
    );
    const { result } = renderHook(() => useTextTo3dPreview());
    await act(async () => { await result.current.submit('a bracket'); });
    await waitFor(() => expect(result.current.phase.state).toBe('done'));
    expect(result.current.phase).toMatchObject({ state: 'done', glbUrl: 'https://t/out.glb' });
  });

  it('maps 402 to the upgrade state', async () => {
    vi.spyOn(client, 'startPreview').mockResolvedValue(new Response('{"error":"not_paid"}', { status: 402 }));
    const { result } = renderHook(() => useTextTo3dPreview());
    await act(async () => { await result.current.submit('x'); });
    expect(result.current.phase.state).toBe('upgrade');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `cd kernelCAD-web && npx vitest run src/funnel/hooks/useTextTo3dPreview.test.ts`. Expected: FAIL ("Cannot find module './useTextTo3dPreview'").

- [ ] **Step 3: Implement the hook.** Create `kernelCAD-web/src/funnel/hooks/useTextTo3dPreview.ts` (mirror `useGeneration.ts`'s structure and its 401/402 mapping comment):

```ts
// SPDX-License-Identifier: MIT
import { useCallback, useState } from 'react';
import { parsePreviewStream, startPreview } from '../lib/previewClient';

export type PreviewPhase =
  | { state: 'idle' }
  | { state: 'running'; progress: number }
  | { state: 'done'; glbUrl: string; costUsd: number | null }
  | { state: 'error'; code: string; message: string }
  | { state: 'upgrade' };

export function useTextTo3dPreview() {
  const [phase, setPhase] = useState<PreviewPhase>({ state: 'idle' });

  const submit = useCallback(async (prompt: string) => {
    setPhase({ state: 'running', progress: 0 });
    let res: Response;
    try {
      res = await startPreview(prompt);
    } catch (err) {
      setPhase({ state: 'error', code: 'network', message: err instanceof Error ? err.message : String(err) });
      return;
    }
    // 401 = anonymous (sign in), 402 = signed-in free user (upgrade), 403/503 also
    // surface as an actionable state. Both 401/402 route to the same upgrade panel.
    if (res.status === 401 || res.status === 402) { setPhase({ state: 'upgrade' }); return; }
    if (!res.ok || !res.body) {
      setPhase({ state: 'error', code: `http_${res.status}`, message: await res.text().catch(() => `HTTP ${res.status}`) });
      return;
    }
    for await (const e of parsePreviewStream(res.body)) {
      if (e.kind === 'status') setPhase({ state: 'running', progress: e.progress });
      else if (e.kind === 'preview_done') { setPhase({ state: 'done', glbUrl: e.glbUrl, costUsd: e.costUsd }); return; }
      else if (e.kind === 'error') { setPhase({ state: 'error', code: e.code, message: e.message }); return; }
    }
    setPhase({ state: 'error', code: 'stream_closed', message: 'Connection closed before the preview finished.' });
  }, []);

  return { phase, submit };
}
```

- [ ] **Step 4: Run the test to verify it passes.** Run: `cd kernelCAD-web && npx vitest run src/funnel/hooks/useTextTo3dPreview.test.ts`. Expected: PASS (2 tests).

- [ ] **Step 5: Commit.**

```bash
cd kernelCAD-web
git add src/funnel/hooks/useTextTo3dPreview.ts src/funnel/hooks/useTextTo3dPreview.test.ts
git commit -m "feat(text3d): useTextTo3dPreview hook"
```

---

### Task 5: Web — Studio "Generate concept (preview)" panel + GLB viewer

**Files:**
- Create: `kernelCAD-web/src/studio/components/PreviewConceptPanel.tsx`
- Create: `kernelCAD-web/src/studio/components/PreviewConceptPanel.test.tsx`
- Modify: the Studio surface that hosts the agent entry (confirm exact host: `grep -n "useGeneration" kernelCAD-web/src/studio/StudioGenerate.tsx src/studio/routes/generate.tsx`) — add `<PreviewConceptPanel />` as a sibling entry.

**Interfaces:**
- Consumes: `useTextTo3dPreview` (`../../funnel/hooks/useTextTo3dPreview`); the `@google/model-viewer` custom element (mirror its import/usage in `src/funnel/components/GallerySection.tsx` — confirm with `grep -n "model-viewer" src/funnel/components/GallerySection.tsx`).
- Produces: `export function PreviewConceptPanel(): JSX.Element`.

- [ ] **Step 1: Write the failing test.** Create `kernelCAD-web/src/studio/components/PreviewConceptPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewConceptPanel } from './PreviewConceptPanel';
import * as hook from '../../funnel/hooks/useTextTo3dPreview';

beforeEach(() => vi.restoreAllMocks());

describe('PreviewConceptPanel', () => {
  it('renders the model-viewer with the glb url when done', () => {
    vi.spyOn(hook, 'useTextTo3dPreview').mockReturnValue({
      phase: { state: 'done', glbUrl: 'https://t/out.glb', costUsd: 0.2 },
      submit: vi.fn(),
    });
    const { container } = render(<PreviewConceptPanel />);
    const mv = container.querySelector('model-viewer');
    expect(mv).not.toBeNull();
    expect(mv?.getAttribute('src')).toBe('https://t/out.glb');
    // The parametric-rebuild seam is present but stubbed.
    expect(screen.getByRole('button', { name: /rebuild as parametric cad/i })).toBeDisabled();
  });

  it('shows the upgrade CTA for a free user (upgrade state)', () => {
    vi.spyOn(hook, 'useTextTo3dPreview').mockReturnValue({ phase: { state: 'upgrade' }, submit: vi.fn() });
    render(<PreviewConceptPanel />);
    expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
  });

  it('calls submit with the typed prompt', () => {
    const submit = vi.fn();
    vi.spyOn(hook, 'useTextTo3dPreview').mockReturnValue({ phase: { state: 'idle' }, submit });
    render(<PreviewConceptPanel />);
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'a small enclosure' } });
    fireEvent.click(screen.getByRole('button', { name: /generate concept/i }));
    expect(submit).toHaveBeenCalledWith('a small enclosure');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `cd kernelCAD-web && npx vitest run src/studio/components/PreviewConceptPanel.test.tsx`. Expected: FAIL ("Cannot find module './PreviewConceptPanel'").

- [ ] **Step 3: Implement the panel.** Create `kernelCAD-web/src/studio/components/PreviewConceptPanel.tsx`. Import the model-viewer side-effect module the same way `GallerySection.tsx` does (confirm the exact import line first; typically `import '@google/model-viewer';`). Use a plain `<model-viewer>` element (already a global custom element after that import):

```tsx
// SPDX-License-Identifier: MIT
import { useState } from 'react';
import '@google/model-viewer';
import { useTextTo3dPreview } from '../../funnel/hooks/useTextTo3dPreview';

export function PreviewConceptPanel(): JSX.Element {
  const { phase, submit } = useTextTo3dPreview();
  const [prompt, setPrompt] = useState('');
  const busy = phase.state === 'running';

  return (
    <section aria-label="Generate concept preview">
      <textarea
        placeholder="Describe the concept to preview (e.g. a compact ESP32 enclosure)…"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        disabled={busy}
      />
      <button onClick={() => submit(prompt)} disabled={busy || prompt.trim().length === 0}>
        {busy ? `Generating… ${phase.state === 'running' ? phase.progress : 0}%` : 'Generate concept (preview)'}
      </button>

      {phase.state === 'upgrade' && (
        <p role="alert">Text-to-3D preview is a paid feature. <a href="/me">Upgrade</a> to use it.</p>
      )}
      {phase.state === 'error' && <p role="alert">Preview failed: {phase.message}</p>}

      {phase.state === 'done' && (
        <div>
          {/* @ts-expect-error — model-viewer is a custom element registered by the import above */}
          <model-viewer src={phase.glbUrl} camera-controls auto-rotate style={{ width: '100%', height: '360px' }} />
          <button type="button" disabled title="Coming soon — rebuilds an exact, manufacturable CAD model from this concept">
            Rebuild as parametric CAD
          </button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes.** Run: `cd kernelCAD-web && npx vitest run src/studio/components/PreviewConceptPanel.test.tsx`. Expected: PASS (3 tests). If the test runner doesn't register the `model-viewer` element under jsdom, the `container.querySelector('model-viewer')` assertion still works (it's just an unknown element in the DOM) — no custom-element registration needed for the test.

- [ ] **Step 5: Mount the panel in the Studio.** Run `grep -n "useGeneration\|StudioGenerate\|Generate" kernelCAD-web/src/studio/StudioGenerate.tsx` to find where the agent entry renders, and add `<PreviewConceptPanel />` as a sibling (e.g. a tab or a section beside the agent prompt). Keep the change minimal — one import + one element.

- [ ] **Step 6: Typecheck + commit.**

```bash
cd kernelCAD-web
npx tsr generate >/dev/null 2>&1 || true   # routeTree.gen.ts is generated (pretypecheck hook)
npx tsc -b
git add src/studio/components/PreviewConceptPanel.tsx src/studio/components/PreviewConceptPanel.test.tsx src/studio/StudioGenerate.tsx
git commit -m "feat(text3d): Studio preview panel + model-viewer + stubbed parametric-rebuild button"
```

---

## Deferred (explicitly NOT in v1)

- **Persistence / history** — a `preview_assets` table (prompt, user_id, provider, glb_url, cost_usd) so users can revisit past previews and so we track provider spend. v1 returns the URL ephemerally.
- **Re-hosting the GLB** to Supabase Storage (`signedUrl`/`saveRender` exist in `render.ts`/`reviewPaint.ts`) so the model survives Tripo's URL expiry.
- **Weighted shared-pool metering** — only needed if a paid tier ever gets a finite monthly cap; would add `generations.weight` + change `countDoneGenerationsThisMonth` to a summed select.
- **Spec extraction (stage 3) + KernelCAD parametric rebuild (stage 4)** — the "Rebuild as parametric CAD" button is the seam; its implementation is a separate spec.
- **Meshy/Rodin providers** — `tripoClient` is behind a single function; a provider switch (`TEXT_3D_PROVIDER`) slots in later.

## Self-Review notes

- Spec coverage: paid-gate (Task 2, server-side before spend) ✓; Tripo provider (Task 1) ✓; SSE streaming (Tasks 2–4) ✓; viewer (Task 5) ✓; stubbed rebuild button (Task 5) ✓; feature-dark-without-key 503 (Tasks 1–2) ✓; no trials / no metering rationale (Global Constraints + Deferred) ✓.
- Type consistency: `PreviewEvent`/`PreviewPhase` shapes match across `previewClient` → `useTextTo3dPreview` → `PreviewConceptPanel`; server `preview_done` payload `{ glbUrl, costUsd, taskId }` matches the web `parseBlock` mapping.
- Known verification points flagged inline: exact Tripo API field names (Task 1 Step 4), the `model-viewer` import line + Studio host file (Task 5). Route tests use `express` + `app.listen(0)` + `fetch` (the existing `render.test.ts` pattern), no `supertest`.
