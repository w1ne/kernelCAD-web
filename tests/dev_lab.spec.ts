import { test, expect } from '@playwright/test';

test.describe('Dev Lab', () => {
  test('loads and can load a scenario', async ({ page }) => {
    await page.goto('/dev-lab');
    await page.waitForSelector('canvas', { timeout: 20000 });
    await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });
    await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });

    await expect(page.getByText('Dev Lab', { exact: true })).toBeVisible();
    await expect(page.locator('#devlab-scenario')).toBeVisible();

    // Load a different scenario and verify code changes.
    await page.locator('#devlab-scenario').selectOption('anonymous-shape-extrude-face');
    await page.getByRole('button', { name: 'Load' }).click();

    await expect.poll(async () => {
      return await page.evaluate(() => (window as any).getCode?.() || '');
    }).toContain('return replicad.makeBox(10, 10, 10);');
  });
});

