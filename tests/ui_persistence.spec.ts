import { test, expect, type Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
}

test.describe('UI Persistence', () => {
  test('persists view mode and 3D mode across reload', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    await page.getByTitle('Design Mode').click();
    await expect(page.getByText('Design', { exact: true }).first()).toBeVisible();

    await page.getByTitle('Wireframe').click();
    const wireframeBtn = page.getByTitle('Wireframe');
    await expect(wireframeBtn).toHaveClass(/bg-\[#444\]/);

    await page.reload();
    await waitForReady(page);

    await expect(page.getByText('Design', { exact: true }).first()).toBeVisible();
    await expect(page.getByTitle('Wireframe')).toHaveClass(/bg-\[#444\]/);
  });
});
