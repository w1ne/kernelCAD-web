// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect, type Page } from '@playwright/test';

// Code typed in the Code tab on /studio (local project) must stay in the
// editor, re-run the model, auto-save, and come back after a reload. The
// project -> workbench sync used to revert every keystroke to the stored
// copy, and a lagging editor echo dropped keys during fast typing.

const editorText = (page: Page) => page.locator('.monaco-editor .view-lines');

async function openCleanStudio(page: Page) {
    await page.goto('/studio');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached', timeout: 60_000 });
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/\d+ bod(y|ies)/)).toBeVisible({ timeout: 60_000 });
}

test.describe('Studio code edits', () => {
    test('typed code re-runs the model, auto-saves and survives a reload', async ({ page }) => {
        test.setTimeout(120_000);
        await openCleanStudio(page);
        await expect(page.getByText('3 bodies')).toBeVisible();

        await page.locator('.monaco-editor .view-line').first().click();
        // Monaco picks the select-all modifier from the page's user agent.
        const mac = await page.evaluate(() => /Mac/.test(navigator.userAgent));
        await page.keyboard.press(mac ? 'Meta+A' : 'Control+A');
        await page.keyboard.type('return box(10, 10, 40); // typed', { delay: 20 });

        await expect(editorText(page)).toHaveText('return box(10, 10, 40); // typed');
        await expect(page.getByText('1 body', { exact: true })).toBeVisible({ timeout: 30_000 });

        // Auto-save debounce is 1.5 s.
        await expect.poll(
            () => page.evaluate(() => Object.entries(localStorage)
                .some(([key, value]) => key.startsWith('kernelcad_project_') && value.includes('// typed'))),
            { timeout: 10_000 },
        ).toBe(true);

        await page.reload();
        await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached', timeout: 60_000 });
        await expect(editorText(page)).toHaveText('return box(10, 10, 40); // typed', { timeout: 30_000 });
        await expect(page.getByText('1 body', { exact: true })).toBeVisible({ timeout: 30_000 });
    });

    test('fast typing keeps every keystroke', async ({ page }) => {
        test.setTimeout(120_000);
        await openCleanStudio(page);

        await page.locator('.monaco-editor .view-line').last().click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        const typed = '// abcdefghijklmnopqrstuvwxyz0123456789';
        await page.keyboard.type(typed, { delay: 10 });

        await expect(editorText(page)).toContainText(typed);
        await page.waitForTimeout(2_000);
        await expect(editorText(page)).toContainText(typed);
    });
});
