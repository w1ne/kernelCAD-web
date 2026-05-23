import { test, expect } from '@playwright/test';

// The marketing site at site/index.html is served by `npm run site:dev`
// (Python http.server on :8000). It is independent of the React Studio app
// served from the repo root by `npm run dev` on :5173.
const SITE_BASE = process.env.SITE_BASE_URL ?? 'http://127.0.0.1:8000';

test.describe('homepage Claude Desktop exposure', () => {
  test('renders the Claude Desktop chip first in the supported-surfaces row', async ({ page }) => {
    await page.goto(`${SITE_BASE}/`);
    const modes = page.locator('.modes[aria-label="Supported agent surfaces"]');
    await expect(modes).toBeVisible();
    const chips = modes.locator('.mode');
    await expect(chips.nth(0)).toHaveText('Claude Desktop');
    await expect(chips.nth(1)).toHaveText('Codex');
    await expect(chips.nth(2)).toHaveText('Claude Code');
    await expect(chips.nth(3)).toHaveText('Cursor');
    await expect(chips.nth(4)).toHaveText('CLI');
  });

  test('"Use with Claude Desktop" card is the first install-stack entry and links to /app/connect', async ({ page }) => {
    await page.goto(`${SITE_BASE}/`);
    const link = page.locator('#claude-desktop-link');
    await expect(link).toBeVisible();
    await expect(link).toContainText('Use with Claude Desktop');
    await expect(link).toHaveAttribute('href', '/app/connect');

    // Click navigates to /app/connect. The marketing dev server doesn't host
    // that route (it's the Slice 1A app), so we don't wait for `load` —
    // asserting the URL change is enough to prove the link is wired.
    await Promise.all([
      page.waitForURL(/\/app\/connect$/, { waitUntil: 'commit' }),
      link.click(),
    ]);
    expect(new URL(page.url()).pathname).toBe('/app/connect');
  });
});
