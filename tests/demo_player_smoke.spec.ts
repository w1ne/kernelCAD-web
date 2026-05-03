import { test, expect } from '@playwright/test';

test('demo-player route renders without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/demo-player');
  await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 10000 });
  await expect(page.locator('[data-testid="demo-player"]')).toBeVisible();

  // Expose handle and verify base API contract.
  const ready = await page.evaluate(() => window.__demoPlayer!.isFrameReady());
  expect(ready).toBe(true);

  expect(errors).toEqual([]);
});
