// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { PlanTier, PaidTier } from '../lib/apiClient';
import { planLabel, paidTierOf, tierMonthlyPrice } from '../lib/planLabels';

export interface PlanCardProps {
  plan: PlanTier;
  /** Which paid plan, when plan === 'pro' ('basic' $19 | 'pro' $39). */
  tier?: PaidTier | null;
  /** Free plan only: builds left this month (null on paid). */
  generationsRemaining: number | null;
  /** Paid plan: monthly token-budget usage. */
  tokensUsed?: number | null;
  tokensBudget?: number | null;
  /** ISO date string for the end of the current billing period (pro only). */
  currentPeriodEnd: string | null;
  /** Fires when the free-tier user clicks "Upgrade". The parent should call
   * createCheckoutSession() and window.location.href = url. */
  onUpgrade: () => void;
  /** Fires when the user clicks "Manage subscription" (paid) or "Billing
   * history & invoices" (free with a Stripe customer). The parent should call
   * openBillingPortal() and window.location.href = url. */
  onManage: () => void;
  /** Free plan: the user has a Stripe customer (e.g. cancelled earlier), so
   * the portal can still show past invoices. */
  hasBillingAccount?: boolean;
  /** Disables both buttons while a redirect URL is being fetched. */
  busy?: boolean;
}

const fmtTokens = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`;

/**
 * Plan + usage card shown above the project grid on /me and on /billing.
 *
 * Free tier: "Free plan · {N} generations remaining" + Upgrade CTA, plus a
 * "Billing history & invoices" button when the user has a Stripe customer.
 * Paid tier: "{Basic|Pro} plan · $X/mo" + a monthly token-usage meter + Manage CTA.
 */
export function PlanCard({
  plan,
  tier,
  generationsRemaining,
  tokensUsed,
  tokensBudget,
  currentPeriodEnd,
  onUpgrade,
  onManage,
  hasBillingAccount = false,
  busy = false,
}: PlanCardProps) {
  const paidTier = paidTierOf({ plan, tier });
  if (paidTier) {
    const planName = planLabel({ plan, tier });
    const planPrice = tierMonthlyPrice(paidTier);
    const renewsCopy = currentPeriodEnd
      ? `renews ${new Date(currentPeriodEnd).toLocaleDateString()}`
      : 'active subscription';
    const hasMeter = typeof tokensBudget === 'number' && tokensBudget > 0;
    const used = tokensUsed ?? 0;
    const pct = hasMeter ? Math.min(100, Math.round((used / tokensBudget!) * 100)) : 0;
    return (
      <section aria-label="Subscription" className="rounded-xl border border-rule bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-serif font-medium text-ink text-base">
              {planName} <span className="text-blueprint">·</span> {planPrice}
            </p>
            <p className="font-mono text-[11px] text-ink-faint mt-1.5 tracking-wide">{renewsCopy}</p>
          </div>
          <button
            type="button"
            onClick={onManage}
            disabled={busy}
            className="rounded-md border border-rule px-4 py-2 font-mono text-xs tracking-wide text-ink-soft hover:border-ink hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Loading…' : 'Manage subscription'}
          </button>
        </div>
        {hasMeter && (
          <div className="mt-4">
            <div className="flex justify-between font-mono text-[11px] text-ink-faint tracking-wide mb-1.5">
              <span>{fmtTokens(used)} / {fmtTokens(tokensBudget!)} tokens this month</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-vellum-soft overflow-hidden">
              <div className="h-full rounded-full bg-blueprint" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Subscription"
      className="rounded-xl border border-rule bg-white p-5 flex items-center justify-between gap-4"
    >
      <div>
        <p className="font-serif font-medium text-ink text-base">{planLabel({ plan, tier })}</p>
        <p className="font-mono text-[11px] text-ink-faint mt-1.5 tracking-wide">
          {generationsRemaining ?? 0} generation{(generationsRemaining ?? 0) === 1 ? '' : 's'} remaining
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
        {hasBillingAccount && (
          <button
            type="button"
            onClick={onManage}
            disabled={busy}
            className="rounded-md border border-rule px-4 py-2 font-mono text-xs tracking-wide text-ink-soft hover:border-ink hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Billing history &amp; invoices
          </button>
        )}
        <button
          type="button"
          onClick={onUpgrade}
          disabled={busy}
          className="rounded-md bg-blueprint px-4 py-2 font-mono text-xs tracking-wide text-white hover:bg-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Loading…' : `Upgrade — ${tierMonthlyPrice('basic')}`}
        </button>
      </div>
    </section>
  );
}
