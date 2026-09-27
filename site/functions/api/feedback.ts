// site/functions/api/feedback.ts
//
// Cloudflare Pages Function — handles POST /api/feedback from the Studio's
// in-app Feedback button (src/studio/components/Layout/FeedbackButton.tsx).
//
// Every accepted submission is stored in the D1 table `feedback` (binding
// `DB`, schema in site/migrations/0002_feedback.sql). D1 is the source of
// truth; there is no email notification yet (kernelCAD has no outbound mail
// path).
//
// The Studio runs on app.kernelcad.com and this function on kernelcad.com, so
// the request is cross-origin: CORS allows only the kernelCAD origins below.
//
// Behaviour follows LabWired's POST /v1/feedback:
//   - JSON body { message (10–4000 chars), email?, category?, path?,
//     appVersion?, userId?, userEmail?, honeypot? }
//   - honeypot filled → silent 204, nothing stored
//   - 5 submissions per hour per IP, and per user id when one is sent → 429

interface Env {
  DB: D1Database;
}

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 4000;
export const PATH_MAX = 500;
export const SHORT_FIELD_MAX = 200;
export const BODY_MAX_BYTES = 16 * 1024;
export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_SEC = 60 * 60;

export const FEEDBACK_CATEGORIES = ['general', 'bug', 'idea', 'modeling'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

const EXACT_ORIGINS = new Set([
  'https://app.kernelcad.com',
  'https://kernelcad.com',
  'https://www.kernelcad.com',
]);
// Pages preview deploys of the Studio and the marketing site, and local dev.
const ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.kernelcad-app\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]+\.kernelcad-marketing\.pages\.dev$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];

export function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  return EXACT_ORIGINS.has(origin) || ORIGIN_PATTERNS.some((re) => re.test(origin));
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = { Vary: 'Origin' };
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(request: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

function empty(request: Request, status: number, extra: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { ...corsHeaders(request), ...extra } });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

/** FNV-1a. Keeps raw IPs out of the table; good enough for a rate-limit key. */
export function hashClientId(raw: string): string {
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function clientIp(request: Request): string {
  const cf = request.headers.get('CF-Connecting-IP')?.trim();
  if (cf) return cf;
  const xff = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim();
  if (xff) return xff;
  return 'unknown';
}

export interface ParsedFeedback {
  message: string;
  email: string | null;
  category: FeedbackCategory;
  path: string | null;
  appVersion: string | null;
  userId: string | null;
  userEmail: string | null;
  honeypot: string;
}

export type ParseResult =
  | { ok: true; value: ParsedFeedback }
  | { ok: false; error: string };

/** Optional short string: absent/empty → null, non-string → invalid. */
function optionalString(value: unknown, max: number): string | null | undefined {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed.slice(0, max);
}

export function parseFeedbackBody(raw: unknown): ParseResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'invalid_json' };
  }
  const body = raw as Record<string, unknown>;

  const honeypot = typeof body.honeypot === 'string' ? body.honeypot : '';

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < MESSAGE_MIN) return { ok: false, error: 'message_too_short' };
  if (message.length > MESSAGE_MAX) return { ok: false, error: 'message_too_long' };

  const email = optionalString(body.email, 254);
  if (email === undefined || (email !== null && !isValidEmail(email))) {
    return { ok: false, error: 'invalid_email' };
  }

  let category: FeedbackCategory = 'general';
  if (body.category != null && body.category !== '') {
    if (!FEEDBACK_CATEGORIES.includes(body.category as FeedbackCategory)) {
      return { ok: false, error: 'invalid_category' };
    }
    category = body.category as FeedbackCategory;
  }

  const path = optionalString(body.path, PATH_MAX);
  const appVersion = optionalString(body.appVersion, SHORT_FIELD_MAX);
  const userId = optionalString(body.userId, SHORT_FIELD_MAX);
  const userEmail = optionalString(body.userEmail, 254);
  if (path === undefined || appVersion === undefined || userId === undefined || userEmail === undefined) {
    return { ok: false, error: 'invalid_field' };
  }

  return {
    ok: true,
    value: { message, email, category, path, appVersion, userId, userEmail, honeypot },
  };
}

async function countSince(env: Env, column: 'ip_hash' | 'user_id', value: string, since: number): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM feedback WHERE ${column} = ? AND created_at > ?`,
  )
    .bind(value, since)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
  if (declaredLength > BODY_MAX_BYTES) {
    return json(request, { error: 'payload_too_large' }, 413);
  }

  let text: string;
  let raw: unknown;
  try {
    text = await request.text();
    if (text.length > BODY_MAX_BYTES) return json(request, { error: 'payload_too_large' }, 413);
    raw = JSON.parse(text);
  } catch {
    return json(request, { error: 'invalid_json' }, 400);
  }

  const parsed = parseFeedbackBody(raw);
  if (!parsed.ok) return json(request, { error: parsed.error }, 400);
  const fb = parsed.value;

  // Bots fill the hidden field. Pretend success; store nothing.
  if (fb.honeypot.trim() !== '') return empty(request, 204);

  const now = Math.floor(Date.now() / 1000);
  const since = now - RATE_LIMIT_WINDOW_SEC;
  const ipHash = hashClientId(clientIp(request));

  try {
    if ((await countSince(env, 'ip_hash', ipHash, since)) >= RATE_LIMIT_MAX) {
      return json(request, { error: 'rate_limited' }, 429);
    }
    if (fb.userId && (await countSince(env, 'user_id', fb.userId, since)) >= RATE_LIMIT_MAX) {
      return json(request, { error: 'rate_limited' }, 429);
    }

    await env.DB.prepare(
      'INSERT INTO feedback (created_at, category, message, email, user_id, user_email, path, app_version, user_agent, ip_hash, ip_country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        now,
        fb.category,
        fb.message,
        fb.email,
        fb.userId,
        fb.userEmail,
        fb.path,
        fb.appVersion,
        request.headers.get('User-Agent')?.slice(0, 500) ?? null,
        ipHash,
        request.headers.get('cf-ipcountry') ?? null,
      )
      .run();
  } catch (err) {
    // Don't leak DB internals. `wrangler pages deployment tail` shows the error.
    console.error('feedback.d1', err);
    return json(request, { error: 'temporary' }, 503);
  }

  return json(request, { ok: true }, 200);
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  if (!isAllowedOrigin(request.headers.get('Origin'))) return empty(request, 403);
  return empty(request, 204);
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'POST') return onRequestPost(context);
  if (context.request.method === 'OPTIONS') return onRequestOptions(context);
  return empty(context.request, 405, { Allow: 'POST, OPTIONS' });
};
