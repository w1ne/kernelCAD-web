import { test, expect, type Page } from '@playwright/test';

async function waitForStability(page: Page, expectedCount?: number) {
  await page.waitForFunction((count) => {
    const currentCount = (window as any).getExecutionCount?.() || 0;
    const computing = (window as any).isComputing?.();
    if (count !== undefined) return currentCount >= count && computing === false;
    if (computing === undefined) return false;
    return computing === false;
  }, expectedCount, { timeout: 60000 });

  const error = await page.evaluate(() => (window as any).getError?.() || null);
  if (error) throw new Error(`CAD Engine Error: ${error}`);
}

async function getNextExecutionCount(page: Page): Promise<number> {
  const current = await page.evaluate(() => (window as any).getExecutionCount?.() || 0);
  return current + 1;
}

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 20000 });
    await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });
    await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
    await waitForStability(page);

    const code = `
const sketch = new Sketcher('XY')
  .movePointerTo([0, 0])
  .hLine(10)
  .vLine(10)
  .hLine(-10)
  .close();
return replicad.makeBox(10, 10, 10);
    `.trim();

    const count = await getNextExecutionCount(page);
    await page.evaluate((c) => (window as any).setCode?.(c), code);
    await waitForStability(page, count);
  });

  test('R opens Revolve when not typing', async ({ page }) => {
    await page.locator('canvas[data-engine]').first().click({ position: { x: 50, y: 50 } });
    await page.keyboard.press('r');
    await expect(page.locator('h2', { hasText: 'Revolve' })).toBeVisible();
  });

  test('R does not trigger while typing in editor', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Revolve' })).toHaveCount(0);

    // Focus Monaco input area (use focus() to ensure activeElement is the textarea).
    await page.evaluate(() => {
      const ta = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement | null;
      ta?.focus();
    });
    await page.waitForFunction(() => document.activeElement?.tagName?.toLowerCase() === 'textarea');
    await page.keyboard.press('r');
    await expect(page.locator('h2', { hasText: 'Revolve' })).toHaveCount(0);
  });

  test('Escape closes dialogs even when input focused', async ({ page }) => {
    await page.locator('canvas[data-engine]').first().click({ position: { x: 50, y: 50 } });
    await page.keyboard.press('e');
    await expect(page.locator('h2', { hasText: 'Extrude' })).toBeVisible();

    await page.locator('#extrude-distance').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('h2', { hasText: 'Extrude' })).toHaveCount(0);
  });
});
