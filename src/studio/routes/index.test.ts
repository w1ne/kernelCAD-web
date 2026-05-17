import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Landing-page contract: the kernelcad.com landing route MUST render the
 * three signals-collecting sections in order. Each one has been silently
 * dropped at least once during the funnel iteration. Future PRs that
 * remove any of them have to either delete this test (visible diff in
 * review) or fail CI.
 *
 *   1. PromptBox      — primary CTA, "describe a part" textarea
 *   2. GallerySection — "Built with kernelCAD" curated tiles
 *   3. EmailSignup    — fallback signal collection, bottom of page
 */
describe('Landing page (src/studio/routes/index.tsx)', () => {
  const source = readFileSync('src/studio/routes/index.tsx', 'utf8');

  it('imports the three section components', () => {
    expect(source).toMatch(/from\s+['"]\.\.\/\.\.\/funnel\/components\/PromptBox['"]/);
    expect(source).toMatch(/from\s+['"]\.\.\/\.\.\/funnel\/components\/GallerySection['"]/);
    expect(source).toMatch(/from\s+['"]\.\.\/\.\.\/funnel\/components\/EmailSignup['"]/);
  });

  it('renders <PromptBox /> in the JSX tree', () => {
    expect(source).toMatch(/<PromptBox\b/);
  });

  it('renders <GallerySection /> in the JSX tree', () => {
    expect(source).toMatch(/<GallerySection\b/);
  });

  it('renders <EmailSignup /> in the JSX tree', () => {
    expect(source).toMatch(/<EmailSignup\b/);
  });

  it('orders the sections prompt → gallery → email (so the page reads top-to-bottom as designed)', () => {
    const promptIdx = source.indexOf('<PromptBox');
    const galleryIdx = source.indexOf('<GallerySection');
    const emailIdx = source.indexOf('<EmailSignup');
    expect(promptIdx).toBeGreaterThan(-1);
    expect(galleryIdx).toBeGreaterThan(promptIdx);
    expect(emailIdx).toBeGreaterThan(galleryIdx);
  });
});
