// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { expect, test, type Page } from '@playwright/test';

// /embed/<slug> inside a host page's iframe, as a product page or blog uses
// it. While the model loads, the frame shows the stored render (poster) and
// exactly one status line; then the live canvas replaces the poster. The
// attribution footer sits under the canvas and the frame never scrolls
// sideways, down to 320×240.
//
// The mesh comes from the local fixture (no CAD build, no database). The
// document route adds the og:image tag the /embed/:slug Pages Function writes
// in production (functions/_lib/og.ts).

const SIZES = [
    { width: 320, height: 240 },
    { width: 640, height: 400 },
    { width: 1200, height: 700 },
] as const;

/** 1×1 PNG: enough for a poster that loads. */
const POSTER_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkqGcAAAIHAQNcCZ5WAAAAAElFTkSuQmCC',
    'base64',
);

async function hostEmbed(page: Page, baseURL: string, size: { width: number; height: number }, query = '') {
    let releaseMesh: () => void = () => {};
    const meshHeld = new Promise<void>((resolve) => { releaseMesh = resolve; });
    await page.route('**/fixtures/soccer-ball.mesh.json', async (route) => {
        await meshHeld;
        await route.continue();
    });
    await page.route('**/api/v1/projects/soccer/og.png*', (route) =>
        route.fulfill({ status: 200, contentType: 'image/png', body: POSTER_PNG }));
    await page.route(/\/embed\/soccer/, async (route) => {
        if (route.request().resourceType() !== 'document') return route.continue();
        const res = await route.fetch();
        const html = (await res.text()).replace(
            /<meta property="og:image" content="[^"]*"\s*\/?>/,
            `<meta property="og:image" content="${baseURL}/api/v1/projects/soccer/og.png?v=1" />`,
        );
        await route.fulfill({ response: res, body: html });
    });
    const meshUrl = new URL('/fixtures/soccer-ball.mesh.json', baseURL).toString();
    const src = `${baseURL}/embed/soccer?meshUrl=${encodeURIComponent(meshUrl)}${query}`;
    await page.setViewportSize({ width: size.width + 40, height: size.height + 40 });
    // The host is another site, as on a customer's product page.
    await page.route('http://host.example/', (route) => route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><body style="margin:0;padding:20px"><iframe id="embed" src="${src}" `
            + `style="width:${size.width}px;height:${size.height}px;border:0;display:block"></iframe></body>`,
    }));
    await page.goto('http://host.example/', { waitUntil: 'commit' });
    return { frame: page.frameLocator('#embed'), releaseMesh };
}

for (const size of SIZES) {
    test(`embed in a ${size.width}×${size.height} iframe: poster, one status line, footer`, async ({ page }, testInfo) => {
        const baseURL = String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173');
        const { frame, releaseMesh } = await hostEmbed(page, baseURL, size);

        // Loading: the poster is up and there is one status line, not two.
        await expect(frame.getByTestId('embed-poster')).toBeVisible({ timeout: 15_000 });
        await expect(frame.getByTestId('embed-status')).toHaveText(/Loading mesh…/);
        await expect(frame.getByRole('status')).toHaveCount(1);
        await expect(frame.getByText(/Loading mesh…|Building geometry…/)).toHaveCount(1);
        await page.screenshot({ path: testInfo.outputPath(`embed-${size.width}x${size.height}-loading.png`) });

        releaseMesh();
        await expect(frame.locator('[data-embed-phase="model_displayed"]')).toBeVisible({ timeout: 45_000 });
        await expect(frame.getByTestId('embed-cover')).toHaveAttribute('data-visible', 'false');
        await expect(frame.getByRole('status')).toHaveCount(0);

        // The footer is under the canvas, inside the frame.
        const canvas = await frame.locator('canvas').boundingBox();
        const bar = await frame.getByTestId('embed-attribution-bar').boundingBox();
        if (!canvas || !bar) throw new Error('canvas or footer has no box');
        expect(bar.y).toBeGreaterThanOrEqual(canvas.y + canvas.height - 1);
        expect(bar.y + bar.height).toBeLessThanOrEqual(20 + size.height + 1);
        await expect(frame.getByTestId('remix-in-kernelcad')).toBeVisible();
        await expect(frame.getByTestId('made-with-kernelcad')).toBeVisible();

        const scrollWidth = await frame.locator('html').evaluate((el) => el.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(size.width);
        await page.screenshot({ path: testInfo.outputPath(`embed-${size.width}x${size.height}-displayed.png`) });
    });
}

test('embed ?theme=light and the host preference pick the colours', async ({ page }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173');
    await page.emulateMedia({ colorScheme: 'dark' });
    const { frame, releaseMesh } = await hostEmbed(page, baseURL, { width: 640, height: 400 }, '&theme=light');
    releaseMesh();
    await expect(frame.locator('main[data-embed-theme="light"]')).toBeVisible({ timeout: 15_000 });

    const host = await page.context().newPage();
    await host.emulateMedia({ colorScheme: 'light' });
    const auto = await hostEmbed(host, baseURL, { width: 640, height: 400 });
    auto.releaseMesh();
    await expect(auto.frame.locator('main[data-embed-theme="light"]')).toBeVisible({ timeout: 15_000 });
    await host.emulateMedia({ colorScheme: 'dark' });
    await expect(auto.frame.locator('main[data-embed-theme="dark"]')).toBeVisible();
});
