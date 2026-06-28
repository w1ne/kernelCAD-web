// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export interface RateLimitedPanelProps {
  /** Whether the visitor is currently signed in. When false, the panel
   * routes the click to the existing SignInModal flow rather than Stripe. */
  authenticated: boolean;
  /** Signed-in: fires onUpgrade (parent calls createCheckoutSession +
   * window.location.href = url). Unauthenticated: fires the same callback;
   * the parent decides whether to open SignInModal or Stripe. */
  onUpgrade: () => void;
  /** Disables the button while a redirect URL is being fetched. */
  busy?: boolean;
}

/**
 * Shown in place of the generic error block when the landing page sees
 * `phase.state === 'error' && phase.code === 'rate_limited'` from
 * useGeneration — i.e. the free-tier user hit HTTP 429 on /api/v1/generate.
 */
export function RateLimitedPanel({
  authenticated,
  onUpgrade,
  busy = false,
}: RateLimitedPanelProps) {
  const buttonCopy = authenticated
    ? busy
      ? 'Loading…'
      : 'Upgrade — $20/mo'
    : 'Sign in to upgrade';
  return (
    <div
      role="alert"
      className="mt-6 mx-auto max-w-2xl rounded-lg border border-blueprint bg-vellum-soft p-5 text-ink text-left"
    >
      <p className="font-serif font-medium text-lg">
        {authenticated
          ? "You've used your free generations this month"
          : 'Sign in to build with the agent'}
      </p>
      <p className="text-sm text-ink-soft mt-2">
        {authenticated
          ? 'Upgrade to keep generating — $20/mo, cancel anytime.'
          : 'The build agent is free to start once you sign in — 5 builds a month, no card needed.'}
      </p>
      <div className="mt-4">
        <button
          type="button"
          onClick={onUpgrade}
          disabled={busy}
          className="rounded-md bg-blueprint px-4 py-2 font-mono text-xs tracking-wide text-white hover:bg-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buttonCopy}
        </button>
      </div>
    </div>
  );
}
