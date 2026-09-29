// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The community gallery (/gallery) with a mocked gallery API: cards (2 columns
// on a phone), the hover clip, Remix in the card menu, the empty state and the
// error state. The API calls match `**/api/v1/gallery*`, so the spec works with
// or without VITE_API_BASE_URL on the dev server.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RENDER = readFileSync(path.join(ROOT, 'docs/demos/v0.17/turbojet/hero-frame.png'));
const SIZES = [
    { name: 'desktop', width: 1440, height: 900, columns: 4 },
    { name: 'phone', width: 390, height: 844, columns: 2 },
] as const;

const ITEMS = Array.from({ length: 6 }, (_, i) => ({
    slug: `model-${i}`,
    title: `Model ${i}`,
    ownerName: i % 2 ? 'Ada' : null,
    renderUrl: i === 5 ? null : `https://img.test/r/${i}.png`,
    clipUrl: i === 0 ? 'https://img.test/c/0.webp' : null,
    remixCount: i,
    featured: i === 1,
    forkedFrom: null,
    listedAt: '2026-09-20T00:00:00Z',
    createdAt: '2026-09-19T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
}));

async function mockGallery(page: Page, reply: 'items' | 'empty'): Promise<void> {
    await page.route('https://img.test/**', (route) => route.fulfill({ body: RENDER, contentType: 'image/png' }));
    await page.route('**/api/v1/gallery*', (route) =>
        route.fulfill({ json: { items: reply === 'empty' ? [] : ITEMS, nextCursor: null } }));
}

for (const size of SIZES) {
    test(`/gallery shows cards and Remix in the card menu (${size.name})`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await mockGallery(page, 'items');
        await page.goto('/gallery');

        const cards = page.getByTestId('gallery-card');
        await expect(cards).toHaveCount(ITEMS.length);
        // Cards per row: count the cards that share the first card's top edge.
        const tops = await cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
        expect(tops.filter((t) => t === tops[0])).toHaveLength(size.columns);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
        await page.screenshot({ path: testInfo.outputPath(`gallery-${size.name}.png`), fullPage: true });

        const first = cards.first();
        await expect(first.getByRole('link', { name: 'Model 0' })).toHaveAttribute('href', '/p/model-0');
        if (size.name === 'desktop') {
            await first.hover();
            await expect(first.getByTestId('project-card-clip')).toHaveAttribute('src', 'https://img.test/c/0.webp');
        }

        await cards.nth(2).getByRole('button', { name: 'More actions' }).click();
        await page.getByRole('menuitem', { name: /Remix/ }).click();
        await expect(page).toHaveURL(/\/p\/model-2\?remix=1$/);
    });

    test(`/gallery explains an empty gallery and links to /connect (${size.name})`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await mockGallery(page, 'empty');
        await page.goto('/gallery');

        const empty = page.getByTestId('gallery-empty');
        await expect(empty).toContainText('How to publish a model');
        await expect(empty.getByRole('link', { name: /Connect your agent/ })).toHaveAttribute('href', '/connect');
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
        await page.screenshot({ path: testInfo.outputPath(`gallery-empty-${size.name}.png`), fullPage: true });
    });
}

test('/gallery shows an error with Try again', async ({ page }) => {
    // Fail until the user retries (dev StrictMode fetches the first page twice).
    let failing = true;
    await page.route('https://img.test/**', (route) => route.fulfill({ body: RENDER, contentType: 'image/png' }));
    await page.route('**/api/v1/gallery*', (route) => failing
        ? route.fulfill({ status: 503, body: 'unavailable' })
        : route.fulfill({ json: { items: ITEMS.slice(0, 2), nextCursor: null } }));
    await page.goto('/gallery');
    await expect(page.getByText('Could not load the gallery')).toBeVisible();
    failing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('gallery-card')).toHaveCount(2);
});
