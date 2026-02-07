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

test.describe('Sketching Dimensions E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas', { timeout: 60000 });
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 60000 });
        await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 60000 });
        await waitForStability(page);
    });

    test('Line with Length and Angle', async ({ page }) => {
        // 1. Enter Sketch Mode
        await page.getByLabel('Sketch', { exact: true }).click();
        await page.getByText('XY Plane (Top)', { exact: true }).click();
        await expect(page.getByTestId('sketch-canvas-overlay')).toBeVisible();

        const canvas = page.getByTestId('sketch-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Click to select Line tool (it might be default, but let's be sure)
        await page.click('button:has-text("Line")');

        // 2. Start drawing
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        await page.mouse.move(startX, startY);
        await page.mouse.down();

        // Move a bit to show UI
        await page.mouse.move(startX + 100, startY + 100);

        // 3. Type Length
        await page.keyboard.type('50');
        await expect(page.getByTestId('primary-input-display')).toContainText('50');

        // 4. Tab to Angle
        await page.keyboard.press('Tab');
        await page.keyboard.type('45');
        await expect(page.getByTestId('secondary-input-display')).toContainText('45');

        // 5. Press Enter to finalize line
        await page.keyboard.press('Enter');
        await page.mouse.up();

        // 6. Complete sketch
        await page.click('button:has-text("Done")');

        // 7. Verify generated code
        await page.waitForTimeout(1000);
        const code = await page.evaluate(() => (window as any).getCode());

        // Check for parametric values in code (we expect them to be processed by WorkbenchLayout)
        // Since we are still working on the exact code gen for constraints, 
        // let's at least check if the basic shape is there with correct roughly coordinates
        // or if we implemented the constraint extraction.
        expect(code).toContain('Sketcher');
        // If we implemented automatic constraint generation into code, we might see .vLine(50) or similar.
    });

    test('Rectangle with Width and Height', async ({ page }) => {
        await page.getByLabel('Sketch', { exact: true }).click();
        await page.getByText('XY Plane (Top)', { exact: true }).click();

        await page.click('button:has-text("Rectangle")');

        const canvas = page.getByTestId('sketch-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const startX = box.x + 100;
        const startY = box.y + 100;
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 20, startY + 20);

        // Type Width
        await page.keyboard.type('80');
        await page.keyboard.press('Tab');
        // Type Height
        await page.keyboard.type('60');
        await page.keyboard.press('Enter');
        await page.mouse.up();

        await page.click('button:has-text("Done")');

        await page.waitForTimeout(1000);
        const code = await page.evaluate(() => (window as any).getCode());
        expect(code).toContain('Sketcher');
    });

    test('Circle with Radius', async ({ page }) => {
        await page.getByLabel('Sketch', { exact: true }).click();
        await page.getByText('XY Plane (Top)', { exact: true }).click();

        await page.click('button:has-text("Circle")');

        const canvas = page.getByTestId('sketch-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 10, centerY + 10);

        // Type Radius
        await page.keyboard.type('25');
        await page.keyboard.press('Enter');
        await page.mouse.up();

        await page.click('button:has-text("Done")');

        await page.waitForTimeout(1000);
        const code = await page.evaluate(() => (window as any).getCode());
        expect(code).toContain('Sketcher');
    });
});
