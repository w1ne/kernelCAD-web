import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/kernelcad/i);
});

test('workbench loads', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('canvas', { timeout: 20000 });
    await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });

    // Check for the code editor (default view mode)
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 30000 });

    // Check for the canvas
    await expect(page.locator('canvas').first()).toBeVisible();
});
