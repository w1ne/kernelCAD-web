// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Marketing-landing pricing island. Mounts the SAME PricingSection component
// the in-app /pricing route uses, so the landing and the app can never drift in
// layout OR data — there is no hand-rolled second implementation any more.
//
// The static HTML in site/index.html is server-rendered from this same
// component at build time (site/scripts/build-pricing.ts) as a no-JS fallback;
// this bundle hydrates it to make the Monthly/Yearly toggle live and to route
// the paid CTAs straight into app checkout with the selected billing period.
import { hydrateRoot } from 'react-dom/client';
import type { BillingPeriod, PaidTier } from '../../src/funnel/lib/apiClient';
import { PricingSection } from '../../src/funnel/components/PricingSection';
import './pricing-island.css';

/** Where the landing routes buyers — straight into app checkout (auto-fires). */
const APP_BASE = 'https://app.kernelcad.com';

function LandingPricing() {
  const buy = (tier: PaidTier, period: BillingPeriod) => {
    window.location.href = `${APP_BASE}/pricing?buy=${tier}&period=${period}`;
  };
  const free = () => {
    window.location.href = `${APP_BASE}/signin?next=%2F`;
  };
  return <PricingSection onSelect={buy} onFree={free} />;
}

const el = document.getElementById('pricing-root');
if (el) {
  // The build SSR's PricingSection into #pricing-root; hydrate that markup.
  hydrateRoot(el, <LandingPricing />);
}
