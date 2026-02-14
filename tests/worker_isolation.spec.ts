import { test, expect } from '@playwright/test';

test.describe('Worker isolation', () => {
  test('preview remains responsive while main worker is blocked', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="viewer-container"] canvas', { timeout: 20000 });
    await page.waitForSelector('[data-testid="workbench-ready"]', { timeout: 30000 });
    await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });

    const blockingMainCode = `
let x = 0;
while (true) {
  x += 1;
}
return replicad.makeBox(10, 10, 10);
    `.trim();

    await page.evaluate((code) => {
      (window as any).setCode?.(code);
    }, blockingMainCode);

    // Let main execution debounce kick in and ensure we are in computing state.
    await page.waitForFunction(() => (window as any).isComputing?.() === true, { timeout: 5000 });

    await page.evaluate(() => {
      (window as any).setPreviewCode?.('return replicad.makeBox(1, 1, 1);');
    });

    await expect
      .poll(async () => {
        const preview = await page.evaluate(() => (window as any).getPreviewGeometries?.() || []);
        return Array.isArray(preview) ? preview.length : 0;
      }, { timeout: 8000 })
      .toBeGreaterThan(0);
  });
});
