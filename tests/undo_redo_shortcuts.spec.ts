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

test.describe('Undo/Redo Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 20000 });
    await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });
    await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
    await waitForStability(page);
  });

  test('Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z redoes', async ({ page }) => {
    // Start from a known code state.
    await page.evaluate(() => (window as any).setCode?.('return replicad.makeCylinder(5, 10);'));
    await expect.poll(async () => await page.evaluate(() => (window as any).getCode())).toContain('replicad.makeCylinder');

    // Insert a box via UI (this uses CommandManager via InsertShapeCommand).
    await page.getByTitle('Box').click();
    await page.getByText('Insert').click();
    await expect.poll(async () => await page.evaluate(() => (window as any).getCode())).toContain('replicad.makeBox');

    // Defocus editor so shortcut handler can run.
    await page.locator('canvas[data-engine]').first().click({ position: { x: 60, y: 60 } });

    // Undo.
    await page.keyboard.press('Control+Z');
    await expect.poll(async () => await page.evaluate(() => (window as any).getCode())).toContain('replicad.makeCylinder');

    // Redo.
    await page.keyboard.press('Control+Shift+Z');
    await expect.poll(async () => await page.evaluate(() => (window as any).getCode())).toContain('replicad.makeBox');
  });
});

