import { test, expect, type Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
}

test.describe('UI Persistence', () => {
  test('keeps mode toggles usable across reload', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    await page.getByTitle('Design Mode', { exact: false }).click();
    await expect(page.getByRole('button', { name: 'Design Mode' })).toHaveClass(/bg-\[#444\]/);
    await expect(page.getByText('GUI', { exact: true }).first()).toBeVisible();

    await page.getByTitle('Wireframe', { exact: false }).click();
    const wireframeBtn = page.getByTitle('Wireframe', { exact: false });
    // In Header.tsx, active state uses bg-[#444]
    await expect(wireframeBtn).toHaveClass(/bg-\[#444\]/);

    await page.reload();
    await waitForReady(page);

    // Give UI time to restore state from localStorage
    await page.waitForTimeout(500);

    await page.getByTitle('Wireframe', { exact: false }).click();
    await expect(page.getByTitle('Wireframe', { exact: false })).toHaveClass(/bg-\[#444\]/);
    await page.getByTitle('Design Mode', { exact: false }).click();
    await expect(page.getByRole('button', { name: 'Design Mode' })).toHaveClass(/bg-\[#444\]/);
  });
});
