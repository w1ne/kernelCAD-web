// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// kernelcad.com landing (site/index.html). Serve the built site (`npm run
// site:dev`, :8000) or set SITE_BASE_URL. /gallery.json is mocked here, so the
// spec does not depend on the curated build or the live gallery API.
import { test, expect, type Page } from '@playwright/test';

const SITE_BASE = process.env.SITE_BASE_URL ?? 'http://127.0.0.1:8000';

const COMMUNITY = {
  generatedAt: 'e2e',
  entries: [],
  community: [
    { slug: 'abc123', title: 'Gear stage', ownerName: 'Ada', remixCount: 2, featured: true, posterUrl: '/favicon.svg', url: 'https://app.kernelcad.com/p/abc123' },
    { slug: 'def456', title: 'Bracket', ownerName: null, remixCount: 0, featured: false, posterUrl: '/favicon.svg', url: 'https://app.kernelcad.com/p/def456' },
  ],
};

async function mockGallery(page: Page, body: unknown) {
  await page.route('**/gallery.json', (route) => route.fulfill({ json: body }));
}

for (const width of [1440, 390]) {
  test.describe(`landing at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    test('hero shows the demo video, the steps band and community cards without horizontal scroll', async ({ page }) => {
      await mockGallery(page, COMMUNITY);
      await page.goto(`${SITE_BASE}/`);

      await expect(page.locator('.hero-proof #demo-video')).toBeAttached();
      await expect(page.locator('.hero iframe')).toHaveCount(0);
      await expect(page.locator('.steps-list .step')).toHaveCount(3);

      const cards = page.locator('#gallery-grid .gallery-card a.card-action');
      await expect(cards).toHaveCount(2);
      await expect(cards.first()).toHaveAttribute('href', 'https://app.kernelcad.com/p/abc123');

      await expect(page.locator('footer #signup input[type="email"]')).toBeVisible();

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);

      // "manufacturable" stays on one line (no word split).
      const accent = page.locator('.headline .accent');
      const lines = await accent.evaluate((el) => el.getClientRects().length);
      expect(lines).toBeLessThanOrEqual(2);
    });
  });
}

test('hides the gallery when the API and the curated list are both empty', async ({ page }) => {
  await mockGallery(page, { generatedAt: 'e2e', entries: [], community: [] });
  await page.goto(`${SITE_BASE}/`);
  await expect(page.locator('#gallery')).toBeHidden();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`keeps the vellum palette with a ${colorScheme} system colour scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await mockGallery(page, COMMUNITY);
    await page.goto(`${SITE_BASE}/`);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(244, 236, 215)');
  });
}
