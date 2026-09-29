// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { buttonClass } from '../../ui';

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
      : 'Upgrade — $19/mo'
    : 'Sign in to upgrade';
  return (
    <div role="alert" className="mt-6 rounded-panel border border-accent bg-accent-soft p-4 text-left text-fg sm:p-5">
      <p className="text-body font-semibold">
        {authenticated
          ? "You've used your free generations this month"
          : 'Sign in to build with the agent'}
      </p>
      <p className="mt-1 text-ui text-fg-2">
        {authenticated
          ? 'Upgrade to keep generating — $19/mo, cancel anytime.'
          : 'The build agent is free to start once you sign in — 5 builds a month, no card needed.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onUpgrade} disabled={busy} className={buttonClass('primary', 'lg')}>
          {buttonCopy}
        </button>
        <a href="/connect" className={`${buttonClass('secondary', 'lg')} no-underline`}>
          Use your own agent
        </a>
      </div>
    </div>
  );
}
