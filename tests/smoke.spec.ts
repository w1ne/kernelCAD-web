import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/kernelcad/i);
});

test('workbench loads', async ({ page }) => {
    await page.goto('/');

    // Check for the code editor
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 10000 });

    // Check for the canvas
    await expect(page.locator('canvas').first()).toBeVisible();
});
