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
 * Generate-page contract: the Words-to-CAD prompt stays visible to anonymous
 * users, but generation is gated by auth. On submit, the route stores the
 * prompt, opens sign-in, and resumes generation after OAuth returns with a
 * session.
 */
describe('Generate page (src/studio/routes/generate.tsx)', () => {
  const source = readFileSync('src/studio/routes/generate.tsx', 'utf8');

  it('imports the prompt app and sign-in modal components', () => {
    expect(source).toMatch(/from\s+['"]\.\.\/\.\.\/funnel\/components\/PromptBox['"]/);
    expect(source).toMatch(/from\s+['"]\.\.\/\.\.\/funnel\/components\/GallerySection['"]/);
    expect(source).toMatch(/from\s+['"]\.\.\/\.\.\/funnel\/components\/EmailSignup['"]/);
    expect(source).toMatch(/from\s+['"]\.\.\/\.\.\/funnel\/components\/SignInModal['"]/);
  });

  it('keeps the prompt visible before sign-in', () => {
    const promptIdx = source.indexOf('<PromptBox');
    const modalIdx = source.indexOf('<SignInModal');
    expect(promptIdx).toBeGreaterThan(-1);
    expect(modalIdx).toBeGreaterThan(promptIdx);
  });

  it('gates generation by stashing the prompt and opening sign-in', () => {
    expect(source).toContain("const PENDING_PROMPT_KEY = 'kc:pendingPrompt'");
    expect(source).toContain('window.localStorage.setItem(PENDING_PROMPT_KEY, prompt)');
    expect(source).toContain('setSignInOpen(true)');
    expect(source).toContain('window.localStorage.getItem(PENDING_PROMPT_KEY)');
    expect(source).toContain('void submit(pending)');
  });

  it('renders <GallerySection /> in the JSX tree', () => {
    expect(source).toMatch(/<GallerySection\b/);
  });

  it('renders <EmailSignup /> in the JSX tree', () => {
    expect(source).toMatch(/<EmailSignup\b/);
  });

  it('orders the generate page sections prompt -> gallery -> email', () => {
    const promptIdx = source.indexOf('<PromptBox');
    const galleryIdx = source.indexOf('<GallerySection');
    const emailIdx = source.indexOf('<EmailSignup');
    expect(promptIdx).toBeGreaterThan(-1);
    expect(galleryIdx).toBeGreaterThan(promptIdx);
    expect(emailIdx).toBeGreaterThan(galleryIdx);
  });
});
