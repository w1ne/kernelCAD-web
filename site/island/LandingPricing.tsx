// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { BillingPeriod, PaidTier } from '../../src/funnel/lib/apiClient';
import { PricingSection } from '../../src/funnel/components/PricingSection';

/** Where the landing routes buyers — straight into app checkout (auto-fires). */
const APP_BASE = 'https://app.kernelcad.com';

/**
 * The landing's pricing surface: the SAME PricingSection the in-app /pricing
 * route renders, wired so the paid CTAs deep-link straight into app checkout
 * with the toggle's selected billing period.
 */
export function LandingPricing() {
  const buy = (tier: PaidTier, period: BillingPeriod) => {
    window.location.href = `${APP_BASE}/pricing?buy=${tier}&period=${period}`;
  };
  const free = () => {
    window.location.href = `${APP_BASE}/signin?next=%2F`;
  };
  return <PricingSection onSelect={buy} onFree={free} />;
}
