// site/functions/api/subscribe.ts
//
// Cloudflare Pages Function — handles POST /api/subscribe from the landing
// page email-opt-in form. Inserts (email, source, ip_country, created_at)
// into the D1 database bound as `DB` in wrangler.toml. Always returns a 303
// redirect so the no-JS path renders correctly via the browser's native form
// flow. Inline JS on the home page reads ?error=... after the redirect to
// surface an error message.
//
// Spec: docs/superpowers/specs/2026-05-04-user-tracking-design.md §A2.

interface Env {
  DB: D1Database;
}

const RFC5322_LITE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function redirect(url: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: url },
  });
}

function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  if (email.length < 3 || email.length > 254) return false;
  return RFC5322_LITE.test(email);
}

function isValidSource(source: unknown): boolean {
  if (typeof source !== 'string') return false;
  if (source.length === 0 || source.length > 32) return false;
  return /^[a-zA-Z0-9_-]+$/.test(source);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect('/?error=invalid_form#signup');
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const sourceRaw = String(formData.get('source') ?? 'direct').trim();
  const source = isValidSource(sourceRaw) ? sourceRaw : 'direct';

  if (!isValidEmail(email)) {
    return redirect('/?error=invalid_email#signup');
  }

  const ipCountry = request.headers.get('cf-ipcountry') ?? null;
  const now = Math.floor(Date.now() / 1000);

  try {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO subscribers (email, source, ip_country, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(email, source, ipCountry, now)
      .run();
  } catch (err) {
    // Don't leak DB internals to the public response. Cloudflare's request log
    // captures the error for the operator to inspect via `wrangler pages
    // deployment tail`.
    console.error('subscribe.d1.insert', err);
    return redirect('/?error=temporary#signup');
  }

  return redirect('/thanks');
};

// onRequest handles every method other than POST — fall through to a 405
// rather than expose the route as a GET.
export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });
};
