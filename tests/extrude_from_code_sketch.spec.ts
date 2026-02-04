import { test, expect, type Page } from '@playwright/test';

async function waitForStability(page: Page, expectedCount?: number) {
    await page.waitForFunction((count) => {
        const currentCount = (window as any).getExecutionCount?.() || 0;
        const computing = (window as any).isComputing?.();

        if (count !== undefined) {
            return currentCount >= count && computing === false;
        }

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

test.describe('Extrude: Sketch Selection From Code', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas', { timeout: 20000 });
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });
        await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
        await waitForStability(page);
    });

    test('should list code-declared sketch variables in Extrude dialog', async ({ page }) => {
        const code = `
const sketch = new Sketcher('XY')
  .movePointerTo([0, 0])
  .hLine(10)
  .vLine(10)
  .hLine(-10)
  .close();

// Sketch is declared in code but not created via the sketch UI.
return replicad.makeBox(10, 10, 10);
`;

        const count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode?.(c), code);
        await waitForStability(page, count);

        await page.getByTitle('Extrude').click();
        await expect(page.locator('h2', { hasText: 'Extrude' })).toBeVisible();

        // Regression guard: sketch declared in code should be selectable.
        await expect(page.locator('#sketch-select')).toContainText('sketch (From Code)');

        // Use the sketch and insert extrude code.
        await page.locator('#sketch-select').selectOption('sketch');
        await page.locator('button[type="submit"]', { hasText: 'Extrude' }).click();

        const count2 = await getNextExecutionCount(page);
        await waitForStability(page, count2);

        const updated = await page.evaluate(() => (window as any).getCode?.() || '');
        expect(updated).toContain('sketch.extrude(10)');

        const match = updated.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*sketch\.extrude\(/);
        expect(match?.[1]).toBeTruthy();

        // Ensure InsertShapeCommand updated the return array to include the new shape.
        expect(updated).toContain(`return [`);
        expect(updated).toContain(match![1]);
    });

    test('should preselect viewport-selected sketch in Extrude dialog', async ({ page }) => {
        const code = `
const sketch = new Sketcher('XY')
  .movePointerTo([0, 0])
  .hLine(10)
  .vLine(10)
  .hLine(-10)
  .close();

return replicad.makeBox(10, 10, 10);
`;

        const count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode?.(c), code);
        await waitForStability(page, count);

        // Select the sketch via test hook (mirrors clicking the sketch in the viewport).
        await page.evaluate(() => (window as any).__TEST_SELECT_SKETCH?.('sketch'));

        await page.getByTitle('Extrude').click();
        await expect(page.locator('h2', { hasText: 'Extrude' })).toBeVisible();

        const selected = await page.locator('#sketch-select').inputValue();
        expect(selected).toBe('sketch');
    });
});
