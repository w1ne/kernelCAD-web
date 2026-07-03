// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('landing page app navigation', () => {
  const html = () => readFileSync(path.resolve(__dirname, '../../../site/index.html'), 'utf8');

  it('links the landing pricing CTAs to the app and sales, not a generate form', () => {
    const source = html();

    // Standard → app pricing page (real checkout lives there); Enterprise → sales.
    expect(source).toContain('href="https://app.kernelcad.com/pricing"');
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
