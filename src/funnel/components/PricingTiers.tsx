// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Check } from 'lucide-react';
import type { BillingPeriod, PaidTier, PlanTier } from '../lib/apiClient';
import { CONTACT_HREF, TIERS, type Feature, type Tier } from '../lib/pricingTiers';

/**
 * Pricing tier cards. Tier data comes from the shared `pricingTiers` module
 * (the single source of truth also used to codegen the landing page) so numbers
 * can never drift. Supports a monthly/yearly billing toggle (yearly = 2 months
 * free). One list style: a check icon and plain text; the data's emoji and
 * badge colours are not shown.
 *
 * Tiers come in three shapes:
 *  - free      (`tier: null`)            → CTA calls onFree
 *  - paid      (`tier: 'standard'|...`)  → CTA calls onSelect (Stripe checkout)
 *  - contact   (`contact: true`)         → CTA is a mailto link, no self-serve
 *    checkout. Used for Enterprise: seats / SSO / centralized billing are sold
 *    through a conversation, not charged self-serve.
 */

/**
 * Colours. This component also renders in the landing's pricing island, which
 * does not load the app's token stylesheet, and whose Tailwind build scans only
 * this file and PricingSection.tsx. So every colour is a literal class here that
 * reads the semantic token with its light value as the fallback: in the app it
 * follows the theme, on the landing it is the same vellum palette.
 */
const C = {
  surface: 'bg-[var(--kc-surface-1,#FFFDF7)]',
  hoverSurface2: 'hover:bg-[var(--kc-surface-2,#EFE5C9)]',
  fg: 'text-[var(--kc-fg,#0A1628)]',
  fg2: 'text-[var(--kc-fg-2,#3F4C5E)]',
  fg3: 'text-[var(--kc-fg-3,#566072)]',
  accentText: 'text-[var(--kc-accent,#1E5FA8)]',
  accentBg: 'bg-[var(--kc-accent,#1E5FA8)] text-[var(--kc-on-accent,#FFFFFF)] hover:bg-[var(--kc-accent-hover,#174E8B)]',
  ring: 'ring-1 ring-inset ring-[var(--kc-border,#D6CDB4)]',
  ringStrong: 'ring-1 ring-inset ring-[var(--kc-border-strong,#8A7F62)]',
  ringAccent: 'ring-2 ring-[var(--kc-accent,#1E5FA8)]',
  focus: 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kc-accent,#1E5FA8)]',
} as const;

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

/** One feature: check icon and text. The first feature (the allowance) is bold. */
function FeatureRow({ f, lead }: { f: Feature; lead: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check size={16} strokeWidth={2.25} aria-hidden="true" className={`mt-0.5 shrink-0 ${C.accentText}`} />
      <span className={`text-sm leading-snug ${lead ? `font-semibold ${C.fg}` : C.fg2}`}>
        {f.text}
        {f.note && <span className={`ml-1.5 text-[11px] uppercase tracking-wide ${C.fg3}`}>{f.note}</span>}
      </span>
    </li>
  );
}

interface TierCtaProps {
  t: Tier;
  current: boolean;
  highlight?: boolean;
  busy: boolean;
  period: BillingPeriod;
  onSelect: (tier: PaidTier, period: BillingPeriod) => void;
  onFree: () => void;
}

const CTA_BASE = `mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold no-underline transition-colors ${C.focus} disabled:cursor-default disabled:opacity-60`;
const CTA_SECONDARY = `${C.surface} ${C.fg} ${C.ringStrong} ${C.hoverSurface2}`;

function TierCta({ t, current, highlight, busy, period, onSelect, onFree }: TierCtaProps) {
  if (t.contact) {
    return (
      <a href={CONTACT_HREF} aria-label="Contact sales about Enterprise" className={`${CTA_BASE} ${CTA_SECONDARY}`}>
        Contact sales
      </a>
    );
  }
  if (t.tier === null) {
    return (
      <button
        type="button"
        onClick={onFree}
        disabled={current}
        aria-label={current ? 'Current plan (Free)' : 'Get started with Free'}
        className={`${CTA_BASE} ${CTA_SECONDARY}`}
      >
        {current ? 'Current plan' : 'Get started'}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSelect(t.tier as PaidTier, period)}
      disabled={current || busy}
      aria-label={current ? `Current plan (${t.name})` : `Subscribe to ${t.name}`}
      className={`${CTA_BASE} ${highlight ? C.accentBg : CTA_SECONDARY}`}
    >
      {current ? 'Current plan' : busy ? 'Loading…' : 'Subscribe'}
    </button>
  );
}

function billingLabel(t: Tier, paid: boolean, showYearly: boolean): string {
  return t.contact ? "let's talk" : paid ? (showYearly ? '/mo · billed yearly' : 'per month') : t.monthly === '$0' ? 'forever' : '';
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
            className={`relative flex flex-col rounded-lg p-6 ${C.surface} ${highlight ? C.ringAccent : C.ring}`}
          >
            {highlight && (
              <span className={`absolute -top-3 left-6 rounded-full px-3 py-0.5 text-xs font-semibold ${C.accentBg}`}>
                Most popular
              </span>
            )}

            <h3 className={`text-xl font-semibold ${C.fg}`}>{t.name}</h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-5xl font-semibold tracking-tight ${C.fg}`}>
                {showYearly ? t.yearlyPerMonth : t.monthly}
              </span>
              <span className={`text-sm ${C.fg3}`}>{billingLabel(t, paid, showYearly)}</span>
            </div>
            {/* Always one line tall, so the three cards stay aligned. */}
            <p className={`mt-1 min-h-4 text-xs ${C.fg2}`}>{showYearly ? `${t.yearly}/year — 2 months free` : ' '}</p>
            <p className={`mt-3 min-h-[40px] text-sm ${C.fg2}`}>{t.blurb}</p>

            <TierCta
              t={t}
              current={current}
              highlight={highlight}
              busy={busy}
              period={period}
              onSelect={onSelect}
              onFree={onFree}
            />

            <ul className="mt-6 list-none space-y-3 pl-0">
              {t.inherits && <li className={`text-sm font-medium ${C.fg}`}>Everything in {t.inherits}, plus:</li>}
              {t.features.map((f, i) => (
                <FeatureRow key={i} f={f} lead={i === 0} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
