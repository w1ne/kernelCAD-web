import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderDraftingPost } from './build-drafting-post';

describe('drafting tutorial', () => {
  it('ships the worked sheets and source as readable HTML without JavaScript', () => {
    const markdown = readFileSync(resolve('docs/guide/drafting-review.md'), 'utf8');
    const template = readFileSync(resolve('site/blog/dimensions-measure-drawings/index.html'), 'utf8');
    const html = renderDraftingPost(markdown, template);
    for (const name of ['mounting-plate-baseline', 'mounting-plate-chain', 'mounting-plate-symmetry', 'bearing-mount']) {
      expect(html).toContain(`src="${name}.png"`);
      expect(html).toContain(`href="${name}.pdf"`);
      expect(html).toContain(`href="${name}.svg"`);
    }
    expect(html).toContain('href="mounting-plate.kcad.ts"');
    expect(html).toContain('href="bearing-mount.kcad.ts"');
    expect(html).toContain('bearing-mount-review.json');
    expect(html).toContain('0.01 mm boolean allowance');
    expect(html).toContain('not automatically printed fabrication notes');
    expect(html).not.toContain('bracket-drawing-pdf.png');
    expect(html).toContain('inspector');
    expect(html).toContain('Mark reviewed');
    expect(html).not.toContain('oblique sections are rejected');
    expect(html).not.toContain('Drawing settings');
    expect(html).not.toMatch(/<link rel="preload"[^>]+\.png/);
    expect(html).toContain('https://kernelcad.com/blog/drafting-review/');
  });
});
