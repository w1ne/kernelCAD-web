import { useState } from 'react';

/**
 * Email opt-in form for the landing page — until the prompt funnel reaches
 * "fully working slice" status, we keep a credible "get notified" fallback.
 *
 * Posts to /api/subscribe (Cloudflare Pages Function backed by D1; lives in
 * site/functions/api/subscribe.ts and is uploaded into dist/functions/ by the
 * private deploy workflow). On success the function redirects to /thanks; on
 * failure it redirects back to /?error=<code>#signup and the effect below
 * surfaces the message.
 */
export interface EmailSignupProps {
  /** Override the default `direct` source value (e.g. `?ref=hn`). */
  sourceParam?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: 'Please enter a valid email address.',
  invalid_form: 'Something went wrong on our end. Try again.',
  temporary: 'Something went wrong on our end. Try again in a moment.',
};

function readSourceFromUrl(override?: string): string {
  if (override) return override;
  if (typeof window === 'undefined') return 'direct';
  const ref = new URLSearchParams(window.location.search).get('ref');
  return ref && /^[a-zA-Z0-9_-]{1,32}$/.test(ref) ? ref : 'direct';
}

function readErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const err = new URLSearchParams(window.location.search).get('error');
  if (!err) return null;
  return ERROR_MESSAGES[err] ?? 'Could not subscribe — please try again.';
}

export function EmailSignup({ sourceParam }: EmailSignupProps) {
  const [source] = useState(() => readSourceFromUrl(sourceParam));
  const [error] = useState(() => readErrorFromUrl());

  return (
    <section
      id="signup"
      className="mx-auto mt-20 mb-16 max-w-xl rounded border border-rule bg-vellum-soft/40 px-8 py-10 text-center"
    >
      <h2 className="font-serif text-3xl font-medium text-ink">
        Get notified when we ship
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        ~1 email per release. No spam. Unsubscribe anytime.
      </p>
      <form
        action="/api/subscribe"
        method="POST"
        className="mx-auto mt-6 flex max-w-md gap-2"
      >
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          aria-label="Email address"
          className="flex-1 rounded border border-rule bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-blueprint focus:outline-none font-sans"
        />
        <input type="hidden" name="source" value={source} />
        <button
          type="submit"
          className="whitespace-nowrap rounded-lg bg-blueprint px-5 py-2.5 text-sm font-medium text-white hover:bg-blueprint-hover transition-colors font-sans"
        >
          Subscribe
        </button>
      </form>
      <p
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-[1.2em] text-sm ${error ? 'text-copper' : 'text-ink-soft'}`}
      >
        {error}
      </p>
      <p className="mt-2 text-xs text-ink-faint">
        We use Cloudflare Web Analytics for visitor counts — no cookies, no IP storage. Your email is stored in a Cloudflare D1 database; we'll only email you when a major version ships.
      </p>
    </section>
  );
}
