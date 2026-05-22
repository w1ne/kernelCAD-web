import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('App root route (src/studio/routes/index.tsx)', () => {
  const source = readFileSync('src/studio/routes/index.tsx', 'utf8');

  it('opens the Studio shell at app root instead of the generation prompt funnel', () => {
    expect(source).toMatch(/import\s+App\s+from\s+['"]\.\.\/App['"]/);
    expect(source).toMatch(/<App\s*\/>/);
    expect(source).not.toMatch(/<PromptBox\b/);
  });
});

/**
 * Generate-page contract: the prompt funnel remains available, but it no
 * longer owns app root. It keeps the three signal sections in order.
 */
describe('Generate page (src/studio/routes/generate.tsx)', () => {
  const source = readFileSync('src/studio/routes/generate.tsx', 'utf8');

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
