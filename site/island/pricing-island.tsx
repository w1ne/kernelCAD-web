// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Marketing-landing pricing island entry. Mounts the SAME PricingSection
// component the in-app /pricing route uses (via LandingPricing), so the landing
// and the app can never drift in layout OR data — there is no hand-rolled
// second implementation any more.
//
// The static HTML in site/index.html is server-rendered from this same
// component at build time (site/scripts/build-pricing.ts) as a no-JS fallback;
// this bundle hydrates it to make the Monthly/Yearly toggle live and to route
// the paid CTAs straight into app checkout with the selected billing period.
import { hydrateRoot } from 'react-dom/client';
import { LandingPricing } from './LandingPricing';
import './pricing-island.css';

const el = document.getElementById('pricing-root');
if (el) {
  // The build SSR's PricingSection into #pricing-root; hydrate that markup.
  hydrateRoot(el, <LandingPricing />);
}
