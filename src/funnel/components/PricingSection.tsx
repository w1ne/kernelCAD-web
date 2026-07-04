// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import type { BillingPeriod, PaidTier, PlanTier } from '../lib/apiClient';
import { PRICING_COPY } from '../lib/pricingTiers';
import { PricingTiers } from './PricingTiers';

/**
 * The complete pricing surface: heading copy, the Monthly/Yearly billing
 * toggle, and the {@link PricingTiers} grid. This is the ONE component rendered
 * everywhere pricing appears — the in-app `/pricing` route
 * (`src/studio/routes/pricing.tsx`) AND the marketing landing (mounted as a
 * client island, SSR'd into `site/index.html` by `site/scripts/build-pricing.ts`).
 *
 * It owns only the billing-cadence state; everything money-related (session,
 * Stripe checkout, current plan) is delegated to the host via callbacks so the
 * landing (anonymous, deep-links to app checkout) and the app route (real
 * Stripe redirect) can differ without forking the component.
 */
export interface PricingSectionProps {
  onSelect: (tier: PaidTier, period: BillingPeriod) => void;
  onFree: () => void;
  currentPlan?: PlanTier;
  currentTier?: PaidTier | null;
  busy?: boolean;
  /** Checkout error to surface above the grid (app route only). */
  error?: string | null;
  /** Initial billing cadence (deep-linked `?period=` on the app route). */
  initialPeriod?: BillingPeriod;
  /** Hide the kicker/headline block (the app route renders its own <h1>). */
  hideHeading?: boolean;
}

export function PricingSection({
  onSelect,
  onFree,
  currentPlan,
  currentTier,
  busy = false,
  error = null,
  initialPeriod = 'monthly',
  hideHeading = false,
}: PricingSectionProps) {
  const [period, setPeriod] = useState<BillingPeriod>(initialPeriod);

  return (
    <div className="mx-auto max-w-5xl">
      {!hideHeading && (
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-[#1E5FA8]">{PRICING_COPY.kicker}</span>
          <h2 className="mt-2 font-serif text-4xl font-bold tracking-tight text-[#0A1628] sm:text-5xl">{PRICING_COPY.headline}</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#3F4C5E]">{PRICING_COPY.sub}</p>
        </div>
      )}

      {/* Billing cadence toggle. */}
      <div className="mt-8 flex items-center justify-center">
        <div className="inline-flex rounded-full bg-[#FFFDF7] p-1 ring-1 ring-[#D6CDB4]">
          <button
            type="button"
            onClick={() => setPeriod('monthly')}
            aria-pressed={period === 'monthly'}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              period === 'monthly' ? 'bg-[#1E5FA8] text-white' : 'bg-transparent text-[#3F4C5E] hover:text-[#0A1628]'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod('yearly')}
            aria-pressed={period === 'yearly'}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              period === 'yearly' ? 'bg-[#1E5FA8] text-white' : 'bg-transparent text-[#3F4C5E] hover:text-[#0A1628]'
            }`}
          >
            Yearly <span className="ml-1 text-[#B87333]">· 2 months free</span>
          </button>
        </div>
      </div>

      {error && <p className="mt-6 text-center font-mono text-xs text-red-400">Checkout error: {error}</p>}

      <div className="mt-12">
        <PricingTiers
          period={period}
          currentPlan={currentPlan}
          currentTier={currentTier}
          onSelect={onSelect}
          onFree={onFree}
          busy={busy}
        />
      </div>
    </div>
  );
}
