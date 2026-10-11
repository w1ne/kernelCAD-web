import { test, expect } from '@playwright/test';

// The marketing site at site/index.html is served by `npm run site:dev`
// (Python http.server on :8000). It is independent of the React Studio app
// served from the repo root by `npm run dev` on :5173.
const SITE_BASE = process.env.SITE_BASE_URL ?? 'http://127.0.0.1:8000';

test.describe('homepage hero prompt box', () => {
  test('Build sends the description to the app generate page with auto=1', async ({ page }) => {
    await page.goto(`${SITE_BASE}/`);
    await page.getByLabel('Describe the part you need').fill('a 20 mm cube');
    const request = page.waitForRequest((r) => r.url().startsWith('https://app.kernelcad.com/generate'));
    await page.getByRole('button', { name: 'Build' }).click();
    const url = new URL((await request).url());
    expect(url.searchParams.get('q')).toBe('a 20 mm cube');
    expect(url.searchParams.get('auto')).toBe('1');
  });

  test('links to /connect for agent users', async ({ page }) => {
    await page.goto(`${SITE_BASE}/`);
    await expect(page.getByRole('link', { name: 'Connect your agent →' }).first())
      .toHaveAttribute('href', 'https://app.kernelcad.com/connect');
  });
});
