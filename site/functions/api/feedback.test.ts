// site/functions/api/feedback.test.ts
//
// Vitest test for the feedback Pages Function. Mocks the D1 binding with an
// in-memory `feedback` table behind a fake prepare/bind/first/run chain. No
// Cloudflare runtime needed.

import { describe, it, expect } from 'vitest';
import {
  onRequest,
  onRequestPost,
  parseFeedbackBody,
  isAllowedOrigin,
  hashClientId,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_SEC,
} from './feedback';

interface Row {
  created_at: number;
  category: string;
  message: string;
  email: string | null;
  user_id: string | null;
  user_email: string | null;
  path: string | null;
  app_version: string | null;
  user_agent: string | null;
  ip_hash: string;
  ip_country: string | null;
}

const INSERT_COLUMNS = [
  'created_at', 'category', 'message', 'email', 'user_id', 'user_email',
  'path', 'app_version', 'user_agent', 'ip_hash', 'ip_country',
] as const;

function makeMockDB(opts?: { throwOnRun?: boolean; rows?: Row[] }) {
  const rows: Row[] = opts?.rows ?? [];
  const sql: string[] = [];
  const prepare = (query: string) => {
    sql.push(query);
    return {
      bind: (...values: unknown[]) => ({
        first: async () => {
          const m = /WHERE (ip_hash|user_id) = \? AND created_at > \?/.exec(query);
          if (!m) throw new Error(`unexpected query: ${query}`);
          const col = m[1] as 'ip_hash' | 'user_id';
          const n = rows.filter((r) => r[col] === values[0] && r.created_at > (values[1] as number)).length;
          return { n };
        },
        run: async () => {
          if (opts?.throwOnRun) throw new Error('mock D1 failure');
          if (!/^INSERT INTO feedback/.test(query)) throw new Error(`unexpected query: ${query}`);
          const row = Object.fromEntries(INSERT_COLUMNS.map((c, i) => [c, values[i]])) as unknown as Row;
          rows.push(row);
          return { success: true, meta: {} };
        },
      }),
    };
  };
  return { DB: { prepare } as unknown as D1Database, rows, sql };
}

const ORIGIN = 'https://app.kernelcad.com';

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
  method = 'POST',
): Request {
  return new Request('https://kernelcad.com/api/feedback', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      'CF-Connecting-IP': '203.0.113.7',
      ...headers,
    },
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
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
    functionPath: '/api/feedback',
  } as unknown as Parameters<typeof onRequestPost>[0];
}

const VALID = {
  message: 'The fillet preview flickers when I drag the slider.',
  category: 'bug',
  path: '/p/abc',
  appVersion: '0.42.0+deadbee',
};

describe('POST /api/feedback', () => {
  it('stores a valid submission in D1 and returns 200', async () => {
    const db = makeMockDB();
    const req = makeRequest(
      { ...VALID, email: 'me@example.com', userId: 'u-1', userEmail: 'me@example.com' },
      { 'cf-ipcountry': 'HU', 'User-Agent': 'vitest' },
    );
    const res = await onRequestPost(makeContext(req, db));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.rows).toHaveLength(1);
    const row = db.rows[0];
    expect(row).toMatchObject({
      category: 'bug',
      message: VALID.message,
      email: 'me@example.com',
      user_id: 'u-1',
      user_email: 'me@example.com',
      path: '/p/abc',
      app_version: '0.42.0+deadbee',
      user_agent: 'vitest',
      ip_hash: hashClientId('203.0.113.7'),
      ip_country: 'HU',
    });
    expect(typeof row.created_at).toBe('number');
  });

  it('defaults category to general and optional fields to null', async () => {
    const db = makeMockDB();
    const res = await onRequestPost(makeContext(makeRequest({ message: 'Just a general note here.' }), db));
    expect(res.status).toBe(200);
    expect(db.rows[0]).toMatchObject({ category: 'general', email: null, user_id: null, path: null, app_version: null });
  });

  it('never stores the raw IP', async () => {
    const db = makeMockDB();
    await onRequestPost(makeContext(makeRequest(VALID), db));
    expect(JSON.stringify(db.rows)).not.toContain('203.0.113.7');
  });

  it.each([
    [{ message: 'too short' }, 'message_too_short'],
    [{ message: 'x'.repeat(4001) }, 'message_too_long'],
    [{ ...VALID, email: 'not-an-email' }, 'invalid_email'],
    [{ ...VALID, category: 'part' }, 'invalid_category'],
    [{ ...VALID, path: 42 }, 'invalid_field'],
    [['array'], 'invalid_json'],
  ])('rejects %j with 400 %s and stores nothing', async (body, error) => {
    const db = makeMockDB();
    const res = await onRequestPost(makeContext(makeRequest(body), db));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error });
    expect(db.rows).toHaveLength(0);
  });

  it('rejects malformed JSON with 400', async () => {
    const db = makeMockDB();
    const res = await onRequestPost(makeContext(makeRequest('{nope'), db));
    expect(res.status).toBe(400);
    expect(db.rows).toHaveLength(0);
  });

  it('rejects an oversized body with 413', async () => {
    const db = makeMockDB();
    const res = await onRequestPost(makeContext(makeRequest({ ...VALID, path: 'x'.repeat(20_000) }), db));
    expect(res.status).toBe(413);
    expect(db.rows).toHaveLength(0);
  });

  it('honeypot: returns 204, stores nothing, runs no query', async () => {
    const db = makeMockDB();
    const res = await onRequestPost(makeContext(makeRequest({ ...VALID, honeypot: 'http://spam' }), db));
    expect(res.status).toBe(204);
    expect(db.rows).toHaveLength(0);
    expect(db.sql).toHaveLength(0);
  });

  it(`rate limits per IP after ${RATE_LIMIT_MAX} submissions in the window`, async () => {
    const db = makeMockDB();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const res = await onRequestPost(makeContext(makeRequest(VALID), db));
      expect(res.status).toBe(200);
    }
    const blocked = await onRequestPost(makeContext(makeRequest(VALID), db));
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: 'rate_limited' });
    expect(db.rows).toHaveLength(RATE_LIMIT_MAX);

    // A different IP is still allowed.
    const other = await onRequestPost(makeContext(makeRequest(VALID, { 'CF-Connecting-IP': '198.51.100.1' }), db));
    expect(other.status).toBe(200);
  });

  it('rate limits per user id across IPs', async () => {
    const db = makeMockDB();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const req = makeRequest({ ...VALID, userId: 'u-9' }, { 'CF-Connecting-IP': `198.51.100.${i}` });
      expect((await onRequestPost(makeContext(req, db))).status).toBe(200);
    }
    const req = makeRequest({ ...VALID, userId: 'u-9' }, { 'CF-Connecting-IP': '198.51.100.200' });
    expect((await onRequestPost(makeContext(req, db))).status).toBe(429);
  });

  it('ignores submissions older than the window', async () => {
    const old = Math.floor(Date.now() / 1000) - RATE_LIMIT_WINDOW_SEC - 10;
    const rows: Row[] = Array.from({ length: RATE_LIMIT_MAX }, () => ({
      created_at: old, category: 'general', message: 'old', email: null, user_id: null, user_email: null,
      path: null, app_version: null, user_agent: null, ip_hash: hashClientId('203.0.113.7'), ip_country: null,
    }));
    const db = makeMockDB({ rows });
    const res = await onRequestPost(makeContext(makeRequest(VALID), db));
    expect(res.status).toBe(200);
  });

  it('returns 503 when D1 throws', async () => {
    const db = makeMockDB({ throwOnRun: true });
    const res = await onRequestPost(makeContext(makeRequest(VALID), db));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'temporary' });
  });
});

describe('CORS', () => {
  it('echoes an allowed origin', async () => {
    const res = await onRequestPost(makeContext(makeRequest(VALID), makeMockDB()));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('does not allow a foreign origin', async () => {
    const res = await onRequestPost(makeContext(makeRequest(VALID, { Origin: 'https://evil.example' }), makeMockDB()));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('answers the preflight for an allowed origin with 204', async () => {
    const res = await onRequest(makeContext(makeRequest(null, {}, 'OPTIONS'), makeMockDB()));
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('rejects the preflight for a foreign origin with 403', async () => {
    const req = makeRequest(null, { Origin: 'https://evil.example' }, 'OPTIONS');
    const res = await onRequest(makeContext(req, makeMockDB()));
    expect(res.status).toBe(403);
  });

  it('returns 405 for GET', async () => {
    const res = await onRequest(makeContext(makeRequest(null, {}, 'GET'), makeMockDB()));
    expect(res.status).toBe(405);
  });

  it.each([
    ['https://app.kernelcad.com', true],
    ['https://kernelcad.com', true],
    ['https://feat-x.kernelcad-app.pages.dev', true],
    ['http://localhost:5173', true],
    ['https://kernelcad.com.evil.example', false],
    ['https://evil-kernelcad-app.pages.dev', false],
    [null, false],
  ])('isAllowedOrigin(%s) = %s', (origin, expected) => {
    expect(isAllowedOrigin(origin)).toBe(expected);
  });
});

describe('parseFeedbackBody', () => {
  it('trims the message and truncates long paths', () => {
    const r = parseFeedbackBody({ message: '   ten chars!   ', path: '/' + 'a'.repeat(600) });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.message).toBe('ten chars!');
      expect(r.value.path).toHaveLength(500);
    }
  });
});
