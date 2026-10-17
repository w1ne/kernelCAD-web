// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

// The 3D view on real phone sizes (touch, DPR 3): dimension labels stay
// inside the canvas and use short text, and the camera fit keeps the model
// out from under the floating toolbar while it fills the screen width.

const PHONES = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
] as const;

const HIDE_DEVTOOLS = 'button[aria-label="Open TanStack Router Devtools"] { display: none !important; }';

// A wide plate with a thin post in one corner (like the DRAW 01 plotter),
// with long dimension labels at its edges.
const MODEL = `
const plate = box(180, 190, 3);
const post = box(15, 15, 80).translate(165, 175, 0);
return plate.union(post)
  .dimension({ kind: 'linear', from: [0, 0, 3], to: [180, 0, 3], label: 'reachable width (pencil tip, collision-free)' })
  .dimension({ kind: 'linear', from: [180, 0, 3], to: [180, 190, 3], label: 'reachable depth (pencil tip, collision-free)' })
  .dimension({ kind: 'linear', from: [0, 190, 0], to: [0, 190, 80], label: 'overall height of the drawing instrument frame' });
`;

const SLUG = 'e2e-mobile-viewer';

/** Opens the model as a shared project (/p/<slug>, the Studio view) with
 *  the project row mocked. The dev server needs VITE_SUPABASE_URL /
 *  VITE_SUPABASE_ANON_KEY set (any values); without them this skips. */
async function loadModel(page: Page): Promise<void> {
    const row = {
        id: 'p-e2e-mobile-viewer', slug: SLUG, title: 'Mobile viewer fixture', privacy: 'public_unlisted',
        featured_at: null, current_code: MODEL, parameters: [], version: 1,
        updated_at: new Date().toISOString(), owner_id: null,
    };
    await page.route('**/rest/v1/projects**', (route) => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(route.request().url().includes(`slug=eq.${SLUG}`) ? [row] : []),
    }));
    await page.route('**/api/v1/projects/**', (route) => route.request().url().includes('/events')
        ? route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ok\n\n' })
        : route.fulfill({ status: 404, body: '' }));
    await page.goto(`/p/${SLUG}`);
    const loadFailed = page.getByRole('alert').filter({ hasText: 'Could not load this project' });
    if (await loadFailed.isVisible({ timeout: 3_000 }).catch(() => false)) {
        test.skip(true, 'The dev server has no VITE_SUPABASE_URL; the project row cannot be mocked.');
    }
    await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });
    await page.addStyleTag({ content: HIDE_DEVTOOLS });
    await expect(page.getByTestId('dimension-label').first()).toBeVisible({ timeout: 90_000 });
    // Let the fit land and the label pass settle.
    await page.waitForTimeout(1500);
}

interface Box { x: number; y: number; width: number; height: number }

async function canvasBox(page: Page): Promise<Box> {
    return (await page.locator('[data-testid="viewer-container"] canvas').first().boundingBox())!;
}

for (const size of PHONES) {
    const name = `${size.width}x${size.height}`;

    test.describe(`phone ${name}`, () => {
        test.use({ viewport: size, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

        test(`dimension labels stay inside the canvas, short, at ${name}`, async ({ page }, testInfo) => {
            test.setTimeout(150_000);
            await loadModel(page);
            const canvas = await canvasBox(page);
            const labels = page.getByTestId('dimension-label');
            const count = await labels.count();
            expect(count).toBeGreaterThan(0);
            const outside: string[] = [];
            for (let i = 0; i < count; i++) {
                const label = labels.nth(i);
                if (!(await label.isVisible())) continue;
                const box = (await label.boundingBox())!;
                const text = (await label.innerText()).trim();
                if (box.x < canvas.x - 1 || box.y < canvas.y - 1
                    || box.x + box.width > canvas.x + canvas.width + 1 || box.y + box.height > canvas.y + canvas.height + 1) {
                    outside.push(`"${text}" at ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`);
                }
                // Notes in brackets are dropped and a long name is cut on a phone.
                expect.soft(text, 'compact label text').not.toContain('(');
                expect.soft(text.length, `label "${text}" length`).toBeLessThanOrEqual(24);
                // A pill no taller than one line of 2xs text plus padding.
                expect.soft(box.height, `label "${text}" height`).toBeLessThanOrEqual(24);
            }
            expect(outside, 'labels outside the canvas').toEqual([]);
            await page.screenshot({ path: testInfo.outputPath(`labels-${name}.png`) });
        });

        test(`camera fit frames the model and its dimensions below the toolbar at ${name}`, async ({ page }, testInfo) => {
            test.setTimeout(150_000);
            await loadModel(page);
            // The model and its dimension lines only: grid off, a flat light
            // background; the HTML labels are hidden below.
            await page.getByTestId('toolbar-view-options').click();
            await page.getByRole('menuitem', { name: 'Hide ground grid' }).click();
            await page.getByTestId('toolbar-view-options').click();
            await page.getByRole('menuitem', { name: 'Light background' }).click();
            await page.getByTestId('toolbar-fit').click();
            await page.waitForTimeout(2500);

            const canvas = await canvasBox(page);
            const toolbar = (await page.getByTestId('studio-toolbar').boundingBox())!;
            // The "not saved to an account" banner floats over the bottom of the model.
            const banner = await page.getByTestId('anon-project-banner').boundingBox();
            // Hide the overlays so only the WebGL canvas is in the shot.
            await page.addStyleTag({ content: '[data-testid="studio-toolbar"], [data-testid="view-gizmo"], [data-testid="anon-project-banner"], [data-testid="dimension-label"] { visibility: hidden !important; }' });
            const png = await page.screenshot({ clip: canvas, scale: 'css', path: testInfo.outputPath(`fit-${name}.png`) });
            const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
            const bg = [data[0], data[1], data[2]];
            let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
            for (let y = 0; y < info.height; y++) {
                for (let x = 0; x < info.width; x++) {
                    const i = (y * info.width + x) * info.channels;
                    if (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 40) {
                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                    }
                }
            }
            expect(maxX, 'no model pixels found').toBeGreaterThan(0);
            // Nothing drawn runs off the canvas: not the model, not a dimension line.
            const toolbarBottom = toolbar.y + toolbar.height - canvas.y;
            // Below the toolbar, inside the canvas.
            expect(minY, 'model top vs toolbar bottom').toBeGreaterThanOrEqual(toolbarBottom - 2);
            expect(minX).toBeGreaterThan(0);
            expect(maxX).toBeLessThan(info.width - 1);
            expect(maxY).toBeLessThan(info.height - 1);
            if (banner) expect(maxY, 'model bottom vs banner top').toBeLessThanOrEqual(banner.y - canvas.y + 2);
            // And it uses the screen: at least 80 % of the width.
            expect(maxX - minX + 1, 'model width on screen').toBeGreaterThanOrEqual(info.width * 0.8);
        });
    });
}
