// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { CheckCircle2 } from 'lucide-react';
import type { BillingPeriod, PaidTier, PlanTier } from '../lib/apiClient';
import { CONTACT_HREF, TIERS, type BadgeColor, type Feature, type Tier } from '../lib/pricingTiers';

/**
 * PhotoAI-style pricing tiers (dark cards, huge prices, green check-circles,
 * colored emoji feature badges, an orange gradient CTA, and a highlighted
 * "Most popular" tier). Tier data comes from the shared `pricingTiers` module
 * (the single source of truth also used to codegen the landing page) so numbers
 * can never drift. Supports a monthly/yearly billing toggle (yearly = 2 months
 * free).
 *
 * Tiers come in three shapes:
 *  - free      (`tier: null`)            → CTA calls onFree
 *  - paid      (`tier: 'standard'|...`)  → CTA calls onSelect (Stripe checkout)
 *  - contact   (`contact: true`)         → CTA is a mailto link, no self-serve
 *    checkout. Used for Enterprise: seats / SSO / centralized billing are sold
 *    through a conversation, not charged self-serve.
 */

const BADGE_CLASS: Record<BadgeColor, string> = {
  // On-brand tints (kernelCAD light palette): blueprint blue + copper + slate,
  // so the pricing surface matches the vellum marketing site.
  emerald: 'bg-[#1E5FA8]/12 text-[#174E8B]',
  sky: 'bg-[#1E5FA8]/12 text-[#174E8B]',
  violet: 'bg-[#B87333]/15 text-[#8A551F]',
  amber: 'bg-[#B87333]/15 text-[#8A551F]',
  slate: 'bg-[#3F4C5E]/12 text-[#3F4C5E]',
};

export interface PricingTiersProps {
  /** Selected billing cadence. */
  period: BillingPeriod;
  /** Current plan tier ('free' | 'pro') to render a "Current plan" state. */
  currentPlan?: PlanTier;
  /** Which paid tier is active, when currentPlan === 'pro'. */
  currentTier?: PaidTier | null;
  /** Fired when a paid tier's Subscribe button is clicked. */
  onSelect: (tier: PaidTier, period: BillingPeriod) => void;
  /** Fired when the free tier CTA is clicked. */
  onFree: () => void;
  /** Disables the CTAs while a checkout redirect is being fetched. */
  busy?: boolean;
}

function FeatureRow({ f }: { f: Feature }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#1E5FA8]" />
      <span className="text-sm text-[#3F4C5E] leading-snug">
        {f.badge ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASS[f.badge]}`}>
            {f.emoji && <span>{f.emoji}</span>}
            {f.text}
          </span>
        ) : (
          <>
            {f.emoji && <span className="mr-1">{f.emoji}</span>}
            {f.text}
          </>
        )}
        {f.note && <span className="ml-1.5 text-[11px] uppercase tracking-wide text-[#97A0AC]">{f.note}</span>}
      </span>
    </li>
  );
}

export function PricingTiers({ period, currentPlan, currentTier, onSelect, onFree, busy = false }: PricingTiersProps) {
  const yearly = period === 'yearly';

  const isCurrent = (t: Tier): boolean => {
    if (t.contact) return false;
    if (t.tier === null) return currentPlan === 'free' || currentPlan === undefined ? currentPlan === 'free' : false;
    return currentPlan === 'pro' && (currentTier ?? 'pro') === t.tier;
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {TIERS.map(t => {
        const current = isCurrent(t);
        const highlight = t.popular;
        const paid = t.tier !== null;
        const showYearly = yearly && paid && !!t.yearly;
        return (
          <section
            key={t.name}
            aria-label={`${t.name} plan`}
            className={`relative flex flex-col rounded-2xl p-6 bg-[#FFFDF7] ${
              highlight ? 'ring-2 ring-[#1E5FA8]' : 'ring-1 ring-[#D6CDB4]'
            }`}
          >
            {highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-[#1E5FA8] px-3 py-0.5 text-xs font-semibold text-white shadow">
                Most popular
              </span>
            )}

            <h3 className="text-2xl font-bold text-[#0A1628]">{t.name}</h3>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-extrabold tracking-tight text-[#0A1628]">
                {showYearly ? t.yearlyPerMonth : t.monthly}
              </span>
              <span className="mb-1.5 text-sm text-[#97A0AC]">
                {t.contact ? "let's talk" : paid ? (showYearly ? '/mo · billed yearly' : 'per month') : t.monthly === '$0' ? 'forever' : ''}
              </span>
            </div>
            {showYearly ? (
              <p className="mt-1 text-xs text-[#B87333]">{t.yearly}/year — 2 months free</p>
            ) : (
              <p className="mt-1 text-xs text-transparent select-none" aria-hidden="true">.</p>
            )}
            <p className="mt-3 min-h-[40px] text-sm text-[#3F4C5E]">{t.blurb}</p>

            {t.contact ? (
              <a
                href={CONTACT_HREF}
                aria-label="Contact sales about Enterprise"
                className="mt-5 w-full rounded-lg bg-[#EFE5C9] py-3 text-center text-sm font-semibold text-[#0A1628] no-underline transition-colors hover:bg-[#E3D6B4]"
              >
                Contact sales
              </a>
            ) : t.tier === null ? (
              <button
                type="button"
                onClick={onFree}
                disabled={current}
                aria-label={current ? 'Current plan (Free)' : 'Get started with Free'}
                className="mt-5 w-full rounded-lg bg-[#EFE5C9] py-3 text-sm font-semibold text-[#0A1628] transition-colors hover:bg-[#E3D6B4] disabled:cursor-default disabled:opacity-60"
              >
                {current ? 'Current plan' : 'Get started'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(t.tier as PaidTier, period)}
                disabled={current || busy}
                aria-label={current ? `Current plan (${t.name})` : `Subscribe to ${t.name}`}
                className={`mt-5 w-full rounded-lg py-3 text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-70 ${
                  highlight
                    ? 'bg-[#1E5FA8] text-white hover:bg-[#174E8B]'
                    : 'bg-[#EFE5C9] text-[#0A1628] hover:bg-[#E3D6B4]'
                }`}
              >
                {current ? 'Current plan' : busy ? 'Loading…' : 'Subscribe →'}
              </button>
            )}

            <ul className="mt-6 space-y-3">
              {t.inherits && (
                <li className="text-sm font-medium text-[#3F4C5E] underline decoration-dotted underline-offset-4">
                  ← Everything in {t.inherits}, plus:
                </li>
              )}
              {t.features.map((f, i) => (
                <FeatureRow key={i} f={f} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
