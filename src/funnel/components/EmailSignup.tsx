// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { buttonClass } from '../../ui';

/**
 * Release-notes email opt-in: one compact row for a page footer.
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
    <section id="signup" aria-labelledby="signup-title" className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
      <div className="min-w-0 md:max-w-md">
        <h2 id="signup-title" className="text-ui font-semibold text-fg">
          Release notes by email
        </h2>
        <p className="text-ui text-fg-2">
          About one email per release. We store your address in a Cloudflare database and use it only for these emails.
        </p>
      </div>
      <form action="/api/subscribe" method="POST" className="flex w-full gap-2 md:w-auto">
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          aria-label="Email address"
          aria-describedby="signup-status"
          className="focus-ring h-control-lg min-w-0 flex-1 rounded-control border border-border-strong bg-surface-1 px-3 font-sans text-ui text-fg placeholder:text-fg-3 md:w-64"
        />
        <input type="hidden" name="source" value={source} />
        <button type="submit" className={buttonClass('secondary', 'lg')}>
          Subscribe
        </button>
      </form>
      <p id="signup-status" role="status" aria-live="polite" className={error ? 'text-ui text-danger md:basis-full' : 'sr-only'}>
        {error}
      </p>
    </section>
  );
}
