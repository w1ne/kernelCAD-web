import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE = 'examples/portfolio/pocket-watch-v2/build.kcad.ts';
const PROMPT = 'examples/portfolio/pocket-watch-v2/_prompt.md';

describe('pocket-watch-v2 source contract', () => {
  it('keeps the promised slim oval bail as modeled geometry', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const prompt = readFileSync(PROMPT, 'utf8');

    expect(prompt).toMatch(/slim oval bail/i);
    expect(source).toMatch(/pink lanyard bail/i);
    expect(source).toMatch(/bail mounted atop pendant/i);
    expect(source).toMatch(/rotate\(\[1, 0, 0\], 90\)\s*\.translate\(0, HORN_DEPTH_Y \/ 2, 0\)/);
    expect(source).not.toMatch(/Avoid a\s+separate torus bail/i);
  });
});
