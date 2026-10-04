// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect } from '@playwright/test';

// The /ui-gallery review page renders every src/ui primitive in both themes.
// Screenshots at desktop and phone width go into the report for review.
for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['phone', 390, 844],
] as const) {
    test(`ui gallery renders both themes without horizontal scroll (${name})`, async ({ page }, info) => {
        await page.setViewportSize({ width, height });
        await page.goto('/ui-gallery');
        const light = page.getByTestId('gallery-light');
        const dark = page.getByTestId('gallery-dark');
        await expect(light).toBeVisible({ timeout: 60_000 });
        await expect(dark).toBeAttached();
        await expect(dark).toHaveAttribute('data-theme', 'dark');

        const [scrollWidth, innerWidth] = await page.evaluate(() => [
            document.documentElement.scrollWidth,
            window.innerWidth,
        ]);
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

        // The two themes resolve different surface colours from the same tokens.
        const bg = async (testId: string) =>
            page.getByTestId(testId).evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(await bg('gallery-light')).not.toBe(await bg('gallery-dark'));

        await info.attach(`ui-gallery-${name}.png`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        });
    });
}

test('ui gallery: keyboard focus is visible and the menu works from the keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ui-gallery');
    const light = page.getByTestId('gallery-light');
    const exportBtn = light.getByRole('button', { name: 'Export', exact: true });
    await exportBtn.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(exportBtn).toBeFocused();
    const outline = await exportBtn.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe('solid');

    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'STL' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(exportBtn).toBeFocused();
});
