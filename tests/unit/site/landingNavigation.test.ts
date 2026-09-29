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

  it('opens Studio from the lightbox, never from a button over a gallery image', () => {
    const source = html();

    expect(source).toContain('class="btn btn-primary lightbox-studio-link"');
    expect(source).toContain('studioLink.href = entry.studioUrl');
    expect(source).not.toContain('tile-studio-link');
  });
});
