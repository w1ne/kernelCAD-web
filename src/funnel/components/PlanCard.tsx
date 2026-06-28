// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { PlanTier, PaidTier } from '../lib/apiClient';

export interface PlanCardProps {
  plan: PlanTier;
  /** Which paid plan, when plan === 'pro' ('standard' $20 | 'pro' $100). */
  tier?: PaidTier | null;
  generationsRemaining: number;
  /** ISO date string for the end of the current billing period (pro only). */
  currentPeriodEnd: string | null;
  /** Fires when the free-tier user clicks "Upgrade to Pro". The parent
   * should call createCheckoutSession() and window.location.href = url. */
  onUpgrade: () => void;
  /** Fires when the pro user clicks "Manage subscription". The parent
   * should call openBillingPortal() and window.location.href = url. */
  onManage: () => void;
  /** Disables both buttons while a redirect URL is being fetched. */
  busy?: boolean;
}

/**
 * Plan + usage card shown above the project grid on /me.
 *
 * Free tier: "Free plan · {N} generations remaining" + Upgrade CTA.
 * Pro tier:  "Pro · renews {date}" + Manage CTA.
 *
 * Styling intentionally matches the existing project-grid card aesthetic
 * (rounded-xl border-rule on white) so it reads as part of the same surface,
 * not a marketing intrusion.
 */
export function PlanCard({
  plan,
  tier,
  generationsRemaining,
  currentPeriodEnd,
  onUpgrade,
  onManage,
  busy = false,
}: PlanCardProps) {
  if (plan === 'pro') {
    const planName = tier === 'pro' ? 'Pro plan' : 'Standard plan';
    const planPrice = tier === 'pro' ? '$100/mo' : '$20/mo';
    const renewsCopy = currentPeriodEnd
      ? `renews ${new Date(currentPeriodEnd).toLocaleDateString()}`
      : 'active subscription';
    return (
      <section
        aria-label="Subscription"
        className="rounded-xl border border-rule bg-white p-5 flex items-center justify-between gap-4"
      >
        <div>
          <p className="font-serif font-medium text-ink text-base">
            {planName} <span className="text-blueprint">·</span> {planPrice}
          </p>
          <p className="font-mono text-[11px] text-ink-faint mt-1.5 tracking-wide">
            {renewsCopy}
          </p>
        </div>
        <button
          type="button"
          onClick={onManage}
          disabled={busy}
          className="rounded-md border border-rule px-4 py-2 font-mono text-xs tracking-wide text-ink-soft hover:border-ink hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Loading…' : 'Manage subscription'}
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Subscription"
      className="rounded-xl border border-rule bg-white p-5 flex items-center justify-between gap-4"
    >
      <div>
        <p className="font-serif font-medium text-ink text-base">
          Free plan
        </p>
        <p className="font-mono text-[11px] text-ink-faint mt-1.5 tracking-wide">
          {generationsRemaining} generation{generationsRemaining === 1 ? '' : 's'} remaining
        </p>
      </div>
      <button
        type="button"
        onClick={onUpgrade}
        disabled={busy}
        className="rounded-md bg-blueprint px-4 py-2 font-mono text-xs tracking-wide text-white hover:bg-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Loading…' : 'Upgrade — $20/mo'}
      </button>
    </section>
  );
}
