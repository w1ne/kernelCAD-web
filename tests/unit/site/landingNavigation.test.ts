// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('landing page app navigation', () => {
  const html = () => readFileSync(path.resolve(__dirname, '../../../site/index.html'), 'utf8');

  it('keeps prompt handoff same-origin and disables browser draft restoration', () => {
    const source = html();

    expect(source).toContain('class="prompt-handoff-form" action="/app/generate" method="GET" autocomplete="off"');
    expect(source).toContain('name="prompt"');
    expect(source).toContain('autocomplete="off"');
    expect(source).not.toContain('action="https://app.kernelcad.com/generate"');
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
