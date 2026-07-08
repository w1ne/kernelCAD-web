// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { PaidTier } from './apiClient';

/**
 * Single source of truth for pricing.
 *
 * Both surfaces render from THIS module so their numbers can never drift:
 *  - the in-app pricing page (`src/studio/routes/pricing.tsx` via
 *    `PricingTiers.tsx`), and
 *  - the static marketing landing (`site/index.html`), whose pricing section is
 *    generated at build time by `site/scripts/build-pricing.ts`.
 *
 * Keep this file free of React / Tailwind / lucide imports — the site build
 * script imports it in a plain `tsx` context, and presentation (badge colors,
 * class names) lives with each consumer.
 */

export type BadgeColor = 'emerald' | 'violet' | 'amber' | 'sky' | 'slate';

/** Where the Enterprise "Contact sales" CTA points. */
export const CONTACT_HREF = 'mailto:support@kernelcad.com?subject=kernelCAD%20for%20teams';

/** Shared headline copy, used by both the landing section and the app page. */
export const PRICING_COPY = {
  kicker: 'Pricing',
  headline: 'Simple, token-based pricing.',
  sub: 'A monthly token allowance for the build agent — a tiny cube costs a sliver, a big assembly costs more. Yearly billing is 2 months free. Cancel anytime.',
} as const;

export interface Feature {
  text: string;
  emoji?: string;
  badge?: BadgeColor;
  note?: string;
}

export interface Tier {
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

export const TIERS: Tier[] = [
  {
    name: 'Basic',
    tier: 'basic',
    monthly: '$19',
    yearly: '$190',
    yearlyPerMonth: '$15.83',
    blurb: 'A generous monthly token allowance for hobby and side-project builds.',
    features: [
      { text: '5M tokens / month', emoji: '🎟️', badge: 'emerald' },
      { text: 'Full 3D editor & viewer' },
      { text: 'MCP access — bring your own agent', emoji: '🔌', badge: 'sky' },
      { text: 'Build as parametric CAD (mesh-conditioned)', emoji: '🧠', badge: 'violet' },
      { text: 'Image → 3D concept previews', emoji: '🖼️', badge: 'amber' },
      { text: 'STEP / STL export' },
      { text: 'Commercial use license' },
    ],
  },
  {
    name: 'Pro',
    tier: 'pro',
    monthly: '$39',
    yearly: '$390',
    yearlyPerMonth: '$32.50',
    popular: true,
    blurb: 'Almost-unlimited tokens for daily, professional CAD work.',
    inherits: 'Basic',
    features: [
      { text: '12M tokens / month — almost unlimited', emoji: '🚀', badge: 'emerald' },
      { text: 'Priority generation', emoji: '⚡' },
      { text: 'Every feature, no build counting' },
    ],
  },
  {
    name: 'Enterprise',
    tier: null,
    contact: true,
    monthly: 'Custom',
    yearly: null,
    blurb: 'Seats, one invoice, and a security review for your whole team.',
    inherits: 'Pro',
    features: [
      { text: 'Team seats & shared projects', emoji: '👥' },
      { text: 'Centralized billing & invoicing', emoji: '🧾' },
      { text: 'SSO / SAML', emoji: '🔐' },
      { text: 'Priority support & onboarding', emoji: '🎧' },
    ],
  },
];
