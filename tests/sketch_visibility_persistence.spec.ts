import { test, expect, type Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
}

test.describe('Sketch Visibility Persistence', () => {
  test('persists show/hide sketches toggle across reload', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    // Hide sketches.
    const toggle = page.getByTitle('Hide Sketches');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByTitle('Show Sketches')).toBeVisible();

    await page.reload();
    await waitForReady(page);

    // Should remain hidden after reload.
    await expect(page.getByTitle('Show Sketches')).toBeVisible();
  });
});

