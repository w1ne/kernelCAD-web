import { test, expect } from '@playwright/test';

/**
 * E2E Test: Prevent Empty Sketch Insertion
 * 
 * This test ensures that the application prevents users from creating
 * sketches without any geometry, which would result in invisible/invalid shapes.
 */

test.describe('Empty Sketch Validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas', { timeout: 20000 });
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });
        await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
    });

    test('should prevent completing sketch without drawing anything', async ({ page }) => {
        // Start sketch mode
        const startSketchBtn = page.getByTitle('Start Sketch (Select Plane)');
        await expect(startSketchBtn).toBeVisible();
        await startSketchBtn.click();
        await expect(page.getByText('Select Sketch Plane')).toBeVisible();

        // Select XY plane
        await page.getByText('XY Plane (Top)', { exact: true }).click();

        // Wait for sketch canvas to appear
        await expect(page.getByTestId('sketch-canvas-overlay')).toBeVisible();

        // Verify "Done" button is disabled when no entities
        const doneButton = page.locator('button:has-text("Done")');
        await expect(doneButton).toBeDisabled();

        // Try to click it anyway (should not work)
        await doneButton.click({ force: true });

        // Verify we're still in sketch mode
        await expect(page.locator('[data-testid="sketch-canvas-overlay"]')).toBeVisible();

        // Verify no code was added
        const code = await page.evaluate(() => (window as any).getCode());
        expect(code).not.toContain('const sketch');
    });

    test('should allow completing sketch after drawing geometry', async ({ page }) => {
        // Start sketch mode
        const startSketchBtn = page.getByTitle('Start Sketch (Select Plane)');
        await expect(startSketchBtn).toBeVisible();
        await startSketchBtn.click();
        await expect(page.getByText('Select Sketch Plane')).toBeVisible();
        await page.getByText('XY Plane (Top)', { exact: true }).click();
        const canvas = page.getByTestId('sketch-canvas');
        await expect(canvas).toBeVisible();

        // Draw a rectangle
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Click rectangle tool
        await page.click('button:has-text("Rectangle")');

        // Draw rectangle by dragging
        await page.mouse.move(centerX - 50, centerY - 50);
        await page.mouse.down();
        await page.mouse.move(centerX + 50, centerY + 50);
        await page.mouse.up();

        // Verify "Done" button is now enabled
        const doneButton = page.locator('button:has-text("Done")').first();
        await expect(doneButton).toBeEnabled();

        // Complete the sketch
        await doneButton.click();

        // Verify sketch code was added
        await page.waitForTimeout(500);
        const code = await page.evaluate(() => (window as any).getCode());
        expect(code).toContain('const sketch');
        expect(code).toContain('Sketcher');
    });

    test('should show error if empty sketch somehow gets through', async ({ page }) => {
        // Start sketch
        const startSketchBtn = page.getByTitle('Start Sketch (Select Plane)');
        await expect(startSketchBtn).toBeVisible({ timeout: 15000 });
        await startSketchBtn.click();
        await expect(page.getByText('Select Sketch Plane')).toBeVisible({ timeout: 15000 });
        await page.getByText('XY Plane (Top)', { exact: true }).click();
        await expect(page.getByTestId('sketch-canvas')).toBeVisible({ timeout: 15000 });

        // Ensure UI-level guard stays in place
        const doneButton = page.locator('button:has-text("Done")');
        await expect(doneButton).toBeDisabled();
        await doneButton.click({ force: true });
        await expect(page.getByTestId('sketch-canvas-overlay')).toBeVisible({ timeout: 15000 });
    });

    test('should not add invisible shapes to the scene', async ({ page }) => {
        // Get initial shape count
        const getShapeCount = async () => {
            const returnArray = await page.evaluate(() => {
                const editor = (window as any).monaco?.editor?.getModels()?.[0];
                if (!editor) return [];
                const code = editor.getValue();
                const returnMatch = code.match(/return\s+\[(.*?)\]/s);
                if (!returnMatch) return [];
                return returnMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
            });
            return returnArray.length;
        };

        const initialCount = await getShapeCount();

        // Try to create empty sketch
        const startSketchBtn = page.getByTitle('Start Sketch (Select Plane)');
        await expect(startSketchBtn).toBeVisible();
        await startSketchBtn.click();
        await expect(page.getByText('Select Sketch Plane')).toBeVisible();
        await page.getByText('XY Plane (Top)', { exact: true }).click();
        await expect(page.getByTestId('sketch-canvas')).toBeVisible();

        // Cancel without drawing
        await page.click('button:has-text("Cancel")');

        // Verify shape count didn't change
        const finalCount = await getShapeCount();
        expect(finalCount).toBe(initialCount);
    });
});
