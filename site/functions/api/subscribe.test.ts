// site/functions/api/subscribe.test.ts
//
// Vitest test for the subscribe Pages Function. Mocks the D1 binding via a
// fake prepare/bind/run chain. No Cloudflare runtime needed.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequestPost } from './subscribe';

interface RunCall {
  sql: string;
  values: unknown[];
}

function makeMockDB(opts?: { throwOnRun?: boolean }) {
  const calls: RunCall[] = [];
  const run = vi.fn(async () => {
    if (opts?.throwOnRun) throw new Error('mock D1 failure');
    return { success: true, meta: {} };
  });
  const bind = vi.fn((...values: unknown[]) => ({ run }));
  const prepare = vi.fn((sql: string) => {
    calls.push({ sql, values: [] });
    return {
      bind: (...values: unknown[]) => {
        calls[calls.length - 1].values = values;
        return { run };
      },
    };
  });
  return { DB: { prepare } as unknown as D1Database, calls, run };
}

function makeRequest(body: Record<string, string>, headers: Record<string, string> = {}): Request {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.append(k, v);
  return new Request('https://kernelcad.com/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    },
    body: form.toString(),
  });
}

function makeContext(request: Request, db: ReturnType<typeof makeMockDB>) {
  return {
    request,
    env: { DB: db.DB },
    params: {},
    next: () => Promise.resolve(new Response()),
    waitUntil: () => undefined,
    data: {},
    functionPath: '/api/subscribe',
  } as unknown as Parameters<typeof onRequestPost>[0];
}

describe('POST /api/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /thanks on valid email', async () => {
    const db = makeMockDB();
    const req = makeRequest({ email: 'someone@example.com', source: 'hn' });
    const res = await onRequestPost(makeContext(req, db));
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/thanks');
    expect(db.run).toHaveBeenCalledTimes(1);
  });

  it('lowercases email + binds correct values', async () => {
    const db = makeMockDB();
    const req = makeRequest(
      { email: 'Alice@Example.COM', source: 'x' },
      { 'cf-ipcountry': 'NL' },
    );
    await onRequestPost(makeContext(req, db));
    const { sql, values } = db.calls[0];
    expect(sql).toMatch(/INSERT OR IGNORE INTO subscribers/);
    expect(values[0]).toBe('alice@example.com');
    expect(values[1]).toBe('x');
    expect(values[2]).toBe('NL');
    expect(typeof values[3]).toBe('number');
  });

  it('redirects with invalid_email when email is malformed', async () => {
    const db = makeMockDB();
    const req = makeRequest({ email: 'not-an-email', source: 'direct' });
    const res = await onRequestPost(makeContext(req, db));
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/?error=invalid_email#signup');
    expect(db.run).not.toHaveBeenCalled();
  });

  it('redirects with invalid_email when email is missing', async () => {
    const db = makeMockDB();
    const req = makeRequest({ source: 'direct' });
    const res = await onRequestPost(makeContext(req, db));
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/?error=invalid_email#signup');
  });

  it('falls back to source=direct when source is missing or malformed', async () => {
    const db = makeMockDB();
    const req = makeRequest({ email: 'x@y.com', source: 'has spaces!' });
    await onRequestPost(makeContext(req, db));
    expect(db.calls[0].values[1]).toBe('direct');
  });

  it('redirects with temporary error when D1 throws', async () => {
    const db = makeMockDB({ throwOnRun: true });
    const req = makeRequest({ email: 'good@email.com', source: 'direct' });
    const res = await onRequestPost(makeContext(req, db));
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/?error=temporary#signup');
  });

  it('treats duplicate email as success (INSERT OR IGNORE handles it)', async () => {
    const db = makeMockDB(); // run resolves successfully whether or not row was inserted
    const req = makeRequest({ email: 'dup@example.com', source: 'direct' });
    const res = await onRequestPost(makeContext(req, db));
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/thanks');
  });
});
