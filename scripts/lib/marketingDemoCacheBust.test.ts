import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('marketing demo video cache busting', () => {
  it('uses demo.json metadata to load a versioned MP4 URL', () => {
    const html = readFileSync('site/index.html', 'utf8');

    expect(html).toContain("const demoCacheKey = encodeURIComponent");
    expect(html).toContain("`/demo.mp4?v=${demoCacheKey}`");
    expect(html).toContain("document.getElementById('demo-artifact').textContent = `${artifact}.kcad.ts`");
    expect(html).not.toContain("src = '/demo.mp4'");
    expect(html).not.toContain('polished-brass-tube.step');
  });
});
