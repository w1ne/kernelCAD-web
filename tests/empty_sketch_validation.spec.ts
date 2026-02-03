import { test, expect } from '@playwright/test';

/**
 * E2E Test: Prevent Empty Sketch Insertion
 * 
 * This test ensures that the application prevents users from creating
 * sketches without any geometry, which would result in invisible/invalid shapes.
 */

test.describe('Empty Sketch Validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5175');
        await page.waitForSelector('[data-testid="viewer-canvas"]', { timeout: 10000 });
    });

    test('should prevent completing sketch without drawing anything', async ({ page }) => {
        // Start sketch mode
        await page.click('button:has-text("Start Sketch")');

        // Select XY plane
        await page.click('button:has-text("XY Plane")');

        // Wait for sketch canvas to appear
        await page.waitForSelector('[data-testid="sketch-canvas-overlay"]');

        // Verify "Done" button is disabled when no entities
        const doneButton = page.locator('button:has-text("Done")');
        await expect(doneButton).toBeDisabled();

        // Try to click it anyway (should not work)
        await doneButton.click({ force: true });

        // Verify we're still in sketch mode
        await expect(page.locator('[data-testid="sketch-canvas-overlay"]')).toBeVisible();

        // Verify no code was added
        const editor = page.locator('.monaco-editor');
        const editorText = await editor.textContent();
        expect(editorText).not.toContain('const sketch');
    });

    test('should allow completing sketch after drawing geometry', async ({ page }) => {
        // Start sketch mode
        await page.click('button:has-text("Start Sketch")');
        await page.click('button:has-text("XY Plane")');
        await page.waitForSelector('[data-testid="sketch-canvas"]');

        // Draw a rectangle
        const canvas = page.locator('[data-testid="sketch-canvas"]');
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
        const editor = page.locator('.monaco-editor');
        const editorText = await editor.textContent();
        expect(editorText).toContain('const sketch');
        expect(editorText).toContain('Sketcher');
    });

    test('should show error if empty sketch somehow gets through', async ({ page }) => {
        // This test uses console monitoring to catch defensive errors
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Start sketch
        await page.click('button:has-text("Start Sketch")');
        await page.click('button:has-text("XY Plane")');
        await page.waitForSelector('[data-testid="sketch-canvas"]');

        // Try to programmatically trigger completion with empty entities
        // This simulates a bug where validation is bypassed
        await page.evaluate(() => {
            // Find the SketchCanvas component and try to call onComplete with empty array
            const doneButton = document.querySelector('button:has-text("Done")') as HTMLButtonElement;
            if (doneButton) {
                // Force enable and click
                doneButton.disabled = false;
                doneButton.click();
            }
        });

        await page.waitForTimeout(500);

        // Verify error was logged or alert was shown
        const hasError = consoleErrors.some(err =>
            err.includes('No geometry') || err.includes('No entities')
        );

        // Note: alert() will pause execution, so we check console instead
        expect(hasError || consoleErrors.length > 0).toBeTruthy();
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
        await page.click('button:has-text("Start Sketch")');
        await page.click('button:has-text("XY Plane")');
        await page.waitForSelector('[data-testid="sketch-canvas"]');

        // Cancel without drawing
        await page.click('button:has-text("Cancel")');

        // Verify shape count didn't change
        const finalCount = await getShapeCount();
        expect(finalCount).toBe(initialCount);
    });
});
