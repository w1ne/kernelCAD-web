// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect, type Page } from '@playwright/test';

// The model-first /p/<slug> page, desktop and phone: the stored render
// shows first, then the live model; the side panel (a bottom sheet on a
// phone) has the title, the check verdict, one Download, "Keep this model"
// and "Continue in chat".
//
// The project row comes from Supabase REST, which is mocked here, so the dev
// server needs VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY set (any values).
// Without them the page shows its error state and this spec skips.

const SLUG = 'e2e-pipe-clamp';
const CODE = `const plateW = param('plateW', 60, { min: 20, max: 120 });
const plateH = param('plateH', 40, { min: 20, max: 100 });
return box(plateW, plateH, 5);
`;
const ROW = {
    id: 'p-e2e',
    slug: SLUG,
    title: 'Pipe clamp bracket',
    privacy: 'public_unlisted',
    featured_at: null,
    current_code: CODE,
    parameters: [{ name: 'plateW', unit: 'mm' }, { name: 'plateH', unit: 'mm' }],
    version: 5,
    updated_at: new Date().toISOString(),
    owner_id: null,
};
// 1×1 PNG: the stored render.
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
);

const SIZES = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
] as const;

async function mockBackends(page: Page): Promise<void> {
    await page.route('**/rest/v1/projects**', (route) => {
        const body = route.request().url().includes(`slug=eq.${SLUG}`) ? [ROW] : [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.route('**/api/v1/projects/**', (route) => {
        const url = route.request().url();
        if (url.includes('/og.png')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
        if (url.includes('/events')) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ok\n\n' });
        return route.fulfill({ status: 404, body: '' });
    });
    await page.route('**/__kernelcad/export**', (route) =>
        route.fulfill({ status: 200, contentType: 'model/stl', body: 'solid e2e\nendsolid e2e\n' }));
}

for (const size of SIZES) {
    test(`/p/<slug> opens on the model with one story in the panel (${size.name})`, async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.setViewportSize({ width: size.width, height: size.height });
        await mockBackends(page);

        await page.goto(`/p/${SLUG}`);
        const loadFailed = page.getByRole('alert').filter({ hasText: 'Could not load this project' });
        if (await loadFailed.isVisible({ timeout: 3_000 }).catch(() => false)) {
            test.skip(true, 'The dev server has no VITE_SUPABASE_URL; the project row cannot be mocked.');
        }

        // First paint: the header names the project and the stored render shows.
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pipe clamp bracket', { timeout: 15_000 });
        await expect(page.getByTestId('model-poster')).toHaveAttribute('src', new RegExp(`/api/v1/projects/${SLUG}/og.png$`));

        // Then the live model replaces it.
        await expect(page.getByTestId('model-stage')).toHaveAttribute('data-phase', 'displayed', { timeout: 90_000 });
        await expect(page.getByTestId('model-check')).toContainText(/Verified|Built/);
        await expect(page.getByTestId('model-size')).toHaveText('60 × 40 × 5 mm');

        // No Studio chrome on the model page.
        await expect(page.getByRole('button', { name: 'Run' })).toHaveCount(0);
        await expect(page.getByText('Brush')).toHaveCount(0);

        // One Download on screen: the primary button exports the default format.
        const downloadButtons = page.getByRole('button', { name: 'Download STL' }).filter({ visible: true });
        await expect(downloadButtons).toHaveCount(1);
        const download = page.waitForEvent('download');
        await downloadButtons.click();
        expect((await download).suggestedFilename()).toBe(`${SLUG}-default.stl`);

        // Keep this model (anonymous project) and Continue in chat.
        await expect(page.getByTestId('keep-this-model')).toContainText('Keep this model');
        await page.getByTestId('resume-prompt-copy').scrollIntoViewIfNeeded();
        await page.getByTestId('resume-prompt-copy').click();
        await expect(page.getByTestId('resume-prompt-copy')).toHaveText('Copied');
        expect(await page.evaluate(() => navigator.clipboard.readText()))
            .toBe(`Continue kernelCAD project ${SLUG}: Pipe clamp bracket. Open it with get_project.`);

        // Open in Studio: the header on desktop, the action bar on a phone.
        const studio = size.name === 'phone'
            ? page.getByTestId('project-action-bar').getByRole('link', { name: 'Open in Studio' })
            : page.getByTestId('open-in-studio');
        await expect(studio).toHaveAttribute('href', `/p/${SLUG}?view=studio`);

        if (size.name === 'phone') {
            await expect(page.getByTestId('project-action-bar')).toBeVisible();
            await expect(page.getByTestId('sheet-handle')).toBeVisible();
            const box = await page.getByTestId('project-action-bar').getByTestId('download-primary').boundingBox();
            expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        }

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(size.width);
        await page.screenshot({ path: testInfo.outputPath(`project-model-page-${size.name}.png`) });
    });
}

test('/p/<slug>?view=studio opens the full workbench with a way back', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockBackends(page);
    await page.goto(`/p/${SLUG}?view=studio`);
    const loadFailed = page.getByRole('alert').filter({ hasText: 'Could not load this project' });
    if (await loadFailed.isVisible({ timeout: 3_000 }).catch(() => false)) {
        test.skip(true, 'The dev server has no VITE_SUPABASE_URL; the project row cannot be mocked.');
    }
    await expect(page.getByTestId('back-to-model-page')).toHaveAttribute('href', `/p/${SLUG}`, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Run' }).first()).toBeVisible();
});
