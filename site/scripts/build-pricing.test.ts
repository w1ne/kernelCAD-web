// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TIERS } from '../../src/funnel/lib/pricingTiers';
import { INDEX_HTML_PATH, injectPricing, renderPricingSection } from './build-pricing';

describe('landing pricing codegen', () => {
  it('committed site/index.html is in sync with pricingTiers.ts', () => {
    // If this fails, someone edited pricingTiers.ts without rebuilding the
    // landing. Run `npm run site:build-pricing` and commit site/index.html.
    const html = readFileSync(INDEX_HTML_PATH, 'utf8');
    expect(injectPricing(html)).toBe(html);
  });

  it('renders every tier with the shared prices and deep-link CTAs', () => {
    const section = renderPricingSection();
    for (const t of TIERS) {
      expect(section).toContain(`>${t.name}</h3>`);
      expect(section).toContain(t.monthly);
      if (t.tier) {
        // Paid tiers deep-link straight into app checkout, not a second wall.
        expect(section).toContain(`https://app.kernelcad.com/pricing?buy=${t.tier}`);
      }
    }
    // Enterprise stays a mailto contact, never a self-serve checkout link.
    expect(section).toContain('mailto:support@kernelcad.com');
  });
});
