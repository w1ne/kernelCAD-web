// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('landing page app navigation', () => {
  const html = () => readFileSync(path.resolve(__dirname, '../../../site/index.html'), 'utf8');

  it('mounts the shared pricing component island, not a generate form', () => {
    const source = html();

    // The landing renders the SAME PricingSection component as app.kernelcad.com
    // (SSR fallback + hydrated island), so layout/data can never drift. The
    // paid CTAs deep-link into app checkout with the selected billing period —
    // that intent is wired in the island bundle (see build-pricing.test.ts).
    expect(source).toContain('id="pricing-root"');
    expect(source).toContain('src="/pricing-island.js"');
    expect(source).toContain('href="/pricing-island.css"');
    // Enterprise stays contact-sales in the SSR'd markup.
    expect(source).toContain('href="mailto:support@kernelcad.com');
    // The prompt-handoff form was replaced by the pricing section.
    expect(source).not.toContain('class="prompt-handoff-form"');
    expect(source).not.toContain('action="/app/generate"');
  });

  it('clears prompt draft state before gallery app navigation', () => {
    const source = html();

    expect(source).toContain('function clearPromptDraftBeforeNavigation()');
    expect(source).toContain("tile.querySelector('.tile-studio-link')?.addEventListener('pointerdown', clearPromptDraftBeforeNavigation)");
    expect(source).toContain("tile.querySelector('.tile-studio-link')?.addEventListener('click'");
    expect(source).toContain("studioLink.addEventListener('pointerdown', clearPromptDraftBeforeNavigation)");
    expect(source).toContain("appLink.addEventListener('pointerdown', clearPromptDraftBeforeNavigation)");
  });
});
