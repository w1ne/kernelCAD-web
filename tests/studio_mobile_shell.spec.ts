// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect } from '@playwright/test';

// The Studio on a phone: the model fills the screen, a bottom tab bar
// (Model / Agent / Params / Code / More) replaces the activity bar, each tab
// opens a sheet docked under the model, and the status bar folds into
// More → Status. The desktop layout does not change.

// The dev-only router devtools badge sits over the bottom-right tab.
const HIDE_DEVTOOLS = 'button[aria-label="Open TanStack Router Devtools"] { display: none !important; }';

test('Studio phone shell at 390 px', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/studio');
    await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });
    await page.addStyleTag({ content: HIDE_DEVTOOLS });

    const tabbar = page.getByTestId('mobile-tabbar');
    await expect(tabbar).toBeVisible();
    await expect(tabbar.getByRole('tab')).toHaveText(['Model', 'Agent', 'Params', 'Code', 'More']);
    for (const tab of await tabbar.getByRole('tab').all()) {
        const box = await tab.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByTestId('activity-bar')).toHaveCount(0);
    await expect(page.getByTestId('status-bar')).toHaveCount(0);

    // The model gets most of the height, full width.
    const viewport = (await page.getByTestId('studio-viewport').boundingBox())!;
    expect(viewport.x).toBeLessThanOrEqual(1);
    expect(viewport.width).toBeGreaterThanOrEqual(388);
    expect(viewport.height).toBeGreaterThan(844 * 0.8);

    // Params opens a sheet under the model; the model stays in view above it.
    await tabbar.getByRole('tab', { name: 'Params' }).click();
    const sheet = page.getByTestId('mobile-drawer');
    await expect(sheet).toBeVisible();
    const sheetBox = (await sheet.boundingBox())!;
    const shrunk = (await page.getByTestId('studio-viewport').boundingBox())!;
    expect(shrunk.y + shrunk.height).toBeLessThanOrEqual(sheetBox.y + 1);
    expect(shrunk.height).toBeGreaterThan(200);
    await page.screenshot({ path: testInfo.outputPath('studio-phone-params.png') });

    // The status bar's facts live in More → Status.
    await tabbar.getByRole('tab', { name: 'More' }).click();
    await page.getByTestId('mobile-more-status').click();
    await expect(page.getByTestId('mobile-status')).toContainText(/bod(y|ies)/);
    await page.getByTestId('mobile-drawer-back').click();
    await expect(page.getByTestId('mobile-more')).toBeVisible();

    // Model closes the sheet.
    await tabbar.getByRole('tab', { name: 'Model' }).click();
    await expect(sheet).toHaveCount(0);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
    await page.screenshot({ path: testInfo.outputPath('studio-phone.png') });
});

test('Studio desktop keeps the activity bar and status bar at 1440 px', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/studio');
    await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('mobile-tabbar')).toHaveCount(0);
    await expect(page.getByTestId('activity-bar')).toBeVisible();
    await expect(page.getByTestId('status-bar')).toBeVisible();
});
