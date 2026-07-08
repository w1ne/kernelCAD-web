// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TIERS } from '../../src/funnel/lib/pricingTiers';
import { INDEX_HTML_PATH, injectPricing, renderPricingSection } from './build-pricing';

const ISLAND_SRC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../island/LandingPricing.tsx',
);

describe('landing pricing codegen', () => {
  it('committed site/index.html is in sync with PricingSection.tsx', () => {
    // If this fails, someone changed pricingTiers.ts / PricingSection.tsx
    // without rebuilding the landing. Run `npm run site:build-pricing` and
    // commit site/index.html.
    const html = readFileSync(INDEX_HTML_PATH, 'utf8');
    expect(injectPricing(html)).toBe(html);
  });

  it('server-renders every tier with the shared prices', () => {
    const section = renderPricingSection();
    for (const t of TIERS) {
      expect(section).toContain(`>${t.name}</h3>`);
      expect(section).toContain(t.monthly);
    }
    // Enterprise stays a mailto contact, never a self-serve checkout link.
    expect(section).toContain('mailto:support@kernelcad.com');
  });

  it('mounts the shared PricingSection island (no hand-rolled duplicate)', () => {
    const section = renderPricingSection();
    expect(section).toContain('id="pricing-root"');
    expect(section).toContain('/pricing-island.js');
    expect(section).toContain('/pricing-island.css');
  });

  it('the island deep-links paid CTAs straight into app checkout with the period', () => {
    // The buy intent (buy=<tier>&period=<cadence>) is wired in the island, which
    // hydrates the SSR'd component — not re-implemented as static anchors.
    const island = readFileSync(ISLAND_SRC, 'utf8');
    expect(island).toContain('app.kernelcad.com');
    expect(island).toContain('/pricing?buy=${tier}&period=${period}');
    expect(island).toContain('PricingSection');
  });
});
