// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { CheckCircle2 } from 'lucide-react';
import type { PaidTier, PlanTier } from '../lib/apiClient';

/**
 * PhotoAI-style pricing tiers (dark cards, huge prices, green check-circles,
 * colored emoji feature badges, an orange gradient CTA, and a highlighted
 * "Most popular" tier). Data-driven so copy is easy to tune.
 */

type BadgeColor = 'emerald' | 'violet' | 'amber' | 'sky' | 'slate';

interface Feature {
  text: string;
  emoji?: string;
  /** Render the label as a colored pill (PhotoAI's standout-feature style). */
  badge?: BadgeColor;
  /** Small muted note after the feature, e.g. "coming soon". */
  note?: string;
}

interface Tier {
  /** Display name. */
  name: string;
  /** Checkout tier id; null for the free tier. */
  tier: PaidTier | null;
  price: string;
  period: string;
  blurb: string;
  /** "Everything in X, plus:" divider label. */
  inherits?: string;
  popular?: boolean;
  features: Feature[];
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    tier: null,
    price: '$0',
    period: 'forever',
    blurb: 'Model and view in the browser, and bring your own agent over MCP.',
    features: [
      { text: '5 generations / month' },
      { text: 'Full 3D editor & viewer' },
      { text: 'MCP access — bring your own agent', emoji: '🔌', badge: 'sky' },
      { text: 'STEP / STL export' },
      { text: 'Public share links' },
    ],
  },
  {
    name: 'Standard',
    tier: 'standard',
    price: '$20',
    period: 'per month',
    popular: true,
    blurb: 'Unlimited hosted generation and the parametric build agent.',
    inherits: 'Free',
    features: [
      { text: 'Unlimited generations', emoji: '♾️', badge: 'emerald' },
      { text: 'Build as parametric CAD (mesh-conditioned)', emoji: '🧠', badge: 'violet' },
      { text: 'Image → 3D concept previews', emoji: '🖼️', badge: 'amber' },
      { text: 'Priority generation', emoji: '⚡' },
      { text: 'Commercial use license' },
    ],
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '$100',
    period: 'per month',
    blurb: 'For teams sharing a workspace and a single bill.',
    inherits: 'Standard',
    features: [
      { text: 'Team seats & shared projects', emoji: '👥', note: 'coming soon' },
      { text: 'Centralized billing', emoji: '🧾', note: 'coming soon' },
      { text: 'Priority support', emoji: '🎧' },
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
  /** Current plan tier ('free' | 'pro') to render a "Current plan" state. */
  currentPlan?: PlanTier;
  /** Which paid tier is active, when currentPlan === 'pro'. */
  currentTier?: PaidTier | null;
  /** Fired when a paid tier's Subscribe button is clicked. */
  onSelect: (tier: PaidTier) => void;
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

export function PricingTiers({ currentPlan, currentTier, onSelect, onFree, busy = false }: PricingTiersProps) {
  const isCurrent = (t: Tier): boolean => {
    if (t.tier === null) return currentPlan === 'free' || currentPlan === undefined ? currentPlan === 'free' : false;
    return currentPlan === 'pro' && (currentTier ?? 'standard') === t.tier;
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {TIERS.map(t => {
        const current = isCurrent(t);
        const highlight = t.popular;
        return (
          <section
            key={t.name}
            aria-label={`${t.name} plan`}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              highlight
                ? 'border-orange-500/60 bg-[#17151a]'
                : 'border-[#26262b] bg-[#141416]'
            }`}
          >
            {highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-0.5 text-xs font-semibold text-white shadow">
                Most popular
              </span>
            )}

            <h3 className="text-2xl font-bold text-white">{t.name}</h3>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-extrabold tracking-tight text-white">{t.price}</span>
              <span className="mb-1.5 text-sm text-gray-400">{t.period}</span>
            </div>
            <p className="mt-3 min-h-[40px] text-sm text-gray-400">{t.blurb}</p>

            {t.tier === null ? (
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
                onClick={() => onSelect(t.tier as PaidTier)}
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
