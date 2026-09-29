// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect } from '@playwright/test';

// Studio chrome: one header row, the floating viewport toolbar, the left
// activity bar (Agent always there), starters in the Projects pane, and
// Feedback reachable without an account menu. Desktop and phone.

const SIZES = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
] as const;

for (const size of SIZES) {
    test(`Studio chrome at ${size.width} px`, async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('/studio');
        await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });

        // One header row: no Quick start row, no second toolbar row.
        await expect(page.getByRole('button', { name: 'Quick start', exact: true })).toHaveCount(0);
        const header = await page.getByTestId('header').boundingBox();
        const viewport = await page.getByTestId('studio-viewport').boundingBox();
        expect(header?.height ?? 0).toBeLessThanOrEqual(44);
        expect(viewport?.y ?? 999).toBeLessThanOrEqual((header?.y ?? 0) + (header?.height ?? 0) + 1);

        // The toolbar floats over the viewport.
        const toolbar = page.getByRole('toolbar', { name: 'Model tools' });
        await expect(toolbar).toBeVisible();
        const bar = await toolbar.boundingBox();
        expect(bar!.y).toBeGreaterThanOrEqual(viewport!.y);
        await expect(toolbar.getByRole('button', { name: 'Mark for agent' })).toBeVisible();
        await expect(page.getByText('Brush', { exact: true })).toHaveCount(0);

        // Agent is always on the activity bar; signed out or without a hosted
        // agent its pane explains what to do.
        await page.getByTestId('activity-agent').click();
        await expect(page.getByTestId('left-pane-agent')).toBeVisible();
        await expect(
            page.getByTestId('agent-sign-in-card').or(page.getByTestId('agent-unavailable-card')).or(page.getByLabel('Agent rail')),
        ).toBeVisible();

        // Starters moved from the Quick start row into the Projects pane.
        await page.getByTestId('activity-projects').click();
        await page.getByTestId('projects-pane').getByRole('button', { name: 'Bracket', exact: true }).click();
        await expect(page.getByRole('status').filter({ hasText: 'Bracket is open' })).toBeVisible();

        // Feedback is in the account slot (no account menu locally) and opens the form.
        await page.getByTestId('feedback-button').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(size.width);
        await page.screenshot({ path: testInfo.outputPath(`studio-chrome-${size.name}.png`) });
    });
}
