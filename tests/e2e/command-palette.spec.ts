// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/e2e/command-palette.spec.ts
import { test, expect, type Page } from '@playwright/test';

async function openStudio(page: Page): Promise<void> {
    await page.goto('/');
    await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });
}

test('Ctrl+K opens the palette; commands drive the inspector, camera and panes', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStudio(page);

    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('combobox')).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('palette-1440.png') });

    // Fuzzy search ranks the export commands first.
    await page.keyboard.type('exp');
    await expect(dialog.getByRole('option').first()).toContainText('Export');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // "Show code" switches the inspector to the Code tab.
    await page.keyboard.press('Control+k');
    await page.keyboard.type('show code');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-testid="inspector-body"] .monaco-editor')).toBeVisible({ timeout: 30_000 });

    // Ctrl+\ hides and shows the inspector (focus outside the editor).
    await page.getByTestId('studio-viewport').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Control+\\');
    await expect(page.getByTestId('inspector')).toHaveAttribute('data-open', 'false');
    await page.keyboard.press('Control+\\');
    await expect(page.getByTestId('inspector')).toHaveAttribute('data-open', 'true');

    // "Switch project…" opens the project switcher.
    await page.keyboard.press('Control+k');
    await page.keyboard.type('switch project');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Projects' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Projects' })).toBeHidden();

    // The shortcuts list opens inside the palette; Escape goes back, then closes.
    await page.getByTestId('command-palette-trigger').click();
    await page.keyboard.type('keyboard shortcuts');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Keyboard shortcuts' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('combobox')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
});

test('palette fits a phone screen', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openStudio(page);
    await page.getByTestId('command-palette-trigger').click();
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(16);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390 - 16);
    const option = await dialog.getByRole('option').first().boundingBox();
    // 44 px touch target (allow sub-pixel layout rounding).
    expect(option?.height).toBeGreaterThanOrEqual(43.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: testInfo.outputPath('palette-390.png') });
});
