// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { CheckCircle2 } from 'lucide-react';
import type { BillingPeriod, PaidTier, PlanTier } from '../lib/apiClient';

/**
 * PhotoAI-style pricing tiers (dark cards, huge prices, green check-circles,
 * colored emoji feature badges, an orange gradient CTA, and a highlighted
 * "Most popular" tier). Data-driven so copy is easy to tune. Supports a
 * monthly/yearly billing toggle (yearly = 2 months free).
 *
 * Tiers come in three shapes:
 *  - free      (`tier: null`)            → CTA calls onFree
 *  - paid      (`tier: 'standard'|...`)  → CTA calls onSelect (Stripe checkout)
 *  - contact   (`contact: true`)         → CTA is a mailto link, no self-serve
 *    checkout. Used for Enterprise: seats / SSO / centralized billing are sold
 *    through a conversation, not charged self-serve.
 */

type BadgeColor = 'emerald' | 'violet' | 'amber' | 'sky' | 'slate';

/** Where the Enterprise "Contact sales" CTA points. */
const CONTACT_HREF = 'mailto:support@kernelcad.com?subject=kernelCAD%20for%20teams';

interface Feature {
  text: string;
  emoji?: string;
  badge?: BadgeColor;
  note?: string;
}

interface Tier {
  name: string;
  /** Checkout tier id; null for the free and contact-sales tiers. */
  tier: PaidTier | null;
  /** Contact-sales tier: CTA is a mailto link, never a checkout or "current". */
  contact?: boolean;
  /** Monthly sticker price, e.g. '$20'. Contact tiers use 'Custom'. */
  monthly: string;
  /** Total billed once per year, e.g. '$200' (2 months free). Null = free/contact. */
  yearly: string | null;
  /** Effective per-month price when billed yearly, e.g. '$16.67'. */
  yearlyPerMonth?: string;
  blurb: string;
  inherits?: string;
  popular?: boolean;
  features: Feature[];
}

const TIERS: Tier[] = [
  {
    name: 'Standard',
    tier: 'standard',
    monthly: '$20',
    yearly: '$200',
    yearlyPerMonth: '$16.67',
    popular: true,
    blurb: 'Unlimited hosted generation and the parametric build agent.',
    features: [
      { text: 'Full 3D editor & viewer' },
      { text: 'MCP access — bring your own agent', emoji: '🔌', badge: 'sky' },
      { text: 'STEP / STL export' },
      { text: 'Unlimited generations', emoji: '♾️', badge: 'emerald' },
      { text: 'Build as parametric CAD (mesh-conditioned)', emoji: '🧠', badge: 'violet' },
      { text: 'Image → 3D concept previews', emoji: '🖼️', badge: 'amber' },
      { text: 'Priority generation', emoji: '⚡' },
      { text: 'Commercial use license' },
    ],
  },
  {
    name: 'Enterprise',
    tier: null,
    contact: true,
    monthly: 'Custom',
    yearly: null,
    blurb: 'Seats, one invoice, and a security review for your whole team.',
    inherits: 'Standard',
    features: [
      { text: 'Team seats & shared projects', emoji: '👥' },
      { text: 'Centralized billing & invoicing', emoji: '🧾' },
      { text: 'SSO / SAML', emoji: '🔐' },
      { text: 'Priority support & onboarding', emoji: '🎧' },
    ],
  },
];

const BADGE_CLASS: Record<BadgeColor, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-300',
  violet: 'bg-violet-500/15 text-violet-300',
  amber: 'bg-amber-500/15 text-amber-300',
  sky: 'bg-sky-500/15 text-sky-300',
  slate: 'bg-slate-500/15 text-slate-300',
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
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
      <span className="text-sm text-gray-200 leading-snug">
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
        {f.note && <span className="ml-1.5 text-[11px] uppercase tracking-wide text-gray-500">{f.note}</span>}
      </span>
    </li>
  );
}

export function PricingTiers({ period, currentPlan, currentTier, onSelect, onFree, busy = false }: PricingTiersProps) {
  const yearly = period === 'yearly';

  const isCurrent = (t: Tier): boolean => {
    if (t.contact) return false;
    if (t.tier === null) return currentPlan === 'free' || currentPlan === undefined ? currentPlan === 'free' : false;
    return currentPlan === 'pro' && (currentTier ?? 'standard') === t.tier;
  };

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
      {TIERS.map(t => {
        const current = isCurrent(t);
        const highlight = t.popular;
        const paid = t.tier !== null;
        const showYearly = yearly && paid && !!t.yearly;
        return (
          <section
            key={t.name}
            aria-label={`${t.name} plan`}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              highlight ? 'border-orange-500/60 bg-[#17151a]' : 'border-[#26262b] bg-[#141416]'
            }`}
          >
            {highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-0.5 text-xs font-semibold text-white shadow">
                Most popular
              </span>
            )}

            <h3 className="text-2xl font-bold text-white">{t.name}</h3>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-extrabold tracking-tight text-white">
                {showYearly ? t.yearlyPerMonth : t.monthly}
              </span>
              <span className="mb-1.5 text-sm text-gray-400">
                {t.contact ? "let's talk" : paid ? (showYearly ? '/mo · billed yearly' : 'per month') : t.monthly === '$0' ? 'forever' : ''}
              </span>
            </div>
            {showYearly ? (
              <p className="mt-1 text-xs text-emerald-400">{t.yearly}/year — 2 months free</p>
            ) : (
              <p className="mt-1 text-xs text-transparent select-none" aria-hidden="true">.</p>
            )}
            <p className="mt-3 min-h-[40px] text-sm text-gray-400">{t.blurb}</p>

            {t.contact ? (
              <a
                href={CONTACT_HREF}
                aria-label="Contact sales about Enterprise"
                className="mt-5 w-full rounded-lg bg-[#26262b] py-3 text-center text-sm font-semibold text-white no-underline transition-colors hover:bg-[#31313a]"
              >
                Contact sales
              </a>
            ) : t.tier === null ? (
              <button
                type="button"
                onClick={onFree}
                disabled={current}
                aria-label={current ? 'Current plan (Free)' : 'Get started with Free'}
                className="mt-5 w-full rounded-lg bg-[#26262b] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#31313a] disabled:cursor-default disabled:opacity-60"
              >
                {current ? 'Current plan' : 'Get started'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(t.tier as PaidTier, period)}
                disabled={current || busy}
                aria-label={current ? `Current plan (${t.name})` : `Subscribe to ${t.name}`}
                className={`mt-5 w-full rounded-lg py-3 text-sm font-semibold text-white transition-colors disabled:cursor-default disabled:opacity-70 ${
                  highlight
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400'
                    : 'bg-[#26262b] hover:bg-[#31313a]'
                }`}
              >
                {current ? 'Current plan' : busy ? 'Loading…' : 'Subscribe →'}
              </button>
            )}

            <ul className="mt-6 space-y-3">
              {t.inherits && (
                <li className="text-sm font-medium text-gray-300 underline decoration-dotted underline-offset-4">
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
