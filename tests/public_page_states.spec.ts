// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect } from '@playwright/test';

// A missing /p/<slug> or /g/<id> must reach a real page state with a next
// step within 5 s, never sit on "Loading…". Supabase REST reads are answered
// with an empty result (no row); without Supabase env the page shows its
// error state instead, which must be just as prompt.

const SIZES = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
] as const;

const CASES = [
    { path: '/p/e2e-missing-project', title: /does not exist or is private|Could not load this project/ },
    { path: '/g/00000000-0000-4000-8000-000000000000', title: /generation does not exist|generation did not load/ },
] as const;

for (const size of SIZES) {
    for (const c of CASES) {
        test(`${c.path} shows a page state with next steps (${size.name})`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width: size.width, height: size.height });
            await page.route('**/rest/v1/**', (route) =>
                route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

            await page.goto(c.path);

            const state = page.getByRole('alert');
            await expect(state).toBeVisible({ timeout: 5_000 });
            await expect(state.getByRole('heading')).toHaveText(c.title);
            await expect(state.getByRole('link').first()).toBeVisible();
            await expect(page.getByText('Loading…')).toHaveCount(0);

            const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
            expect(scrollWidth).toBeLessThanOrEqual(size.width);

            await page.screenshot({ path: testInfo.outputPath(`page-state-${size.name}.png`) });
        });
    }
}
