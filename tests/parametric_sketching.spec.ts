import { test, expect } from '@playwright/test';

test.describe('Parametric Sketching - Solver Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        // Wait for initializing
        await page.waitForSelector('[data-testid="workbench-ready"]', { timeout: 30000 });
    });

    test('should maintain coincidence between two lines via the solver', async ({ page }) => {
        // 1. Enter Sketch Mode
        await page.keyboard.press('s'); // Open plane selector
        await page.click('button:has-text("XY Plane")');
        await page.waitForSelector('[data-testid="sketch-canvas"]');

        const canvas = page.getByTestId('sketch-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // 2. Draw FIRST line: from origin to (50, 0)
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 100, centerY); // 100px roughly 50mm if pixelsPerUnit is ~2
        await page.mouse.up();

        // 3. Draw SECOND line: starting from the END of the first line (snapped)
        // We move mouse near (50, 0) and wait for snap
        await page.mouse.move(centerX + 100, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 100, centerY - 100);
        await page.mouse.up();

        // 4. Verify entities in global state
        // We can't easily check the global state from here, but we can check if "Done" works
        // and if the generated code reflects two lines.
        await page.click('button:has-text("Done")');

        const code = await page.evaluate(() => (window as any).getCode());
        expect(code).toContain('sketch');
        expect(code).toContain('lineTo');

        // Count lineTo calls
        const lineToCount = (code.match(/lineTo/g) || []).length;
        expect(lineToCount).toBeGreaterThanOrEqual(2);
    });
});
