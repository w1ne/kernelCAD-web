import { test, expect } from '@playwright/test';

test.describe('Visual Feedback System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        // Wait for the workbench to be ready
        await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached' });
    });

    test('should change cursor to pointer when hovering a face', async ({ page }) => {
        // 1. Create a large box
        await page.evaluate(() => {
            (window as any).setCode('const box = replicad.makeBox(50, 50, 50);');
        });

        // 2. Wait for rendering (increased)
        await page.waitForTimeout(2000);

        // 3. Move mouse to center of canvas
        const canvas = page.locator('[data-testid="viewer-container"] canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Target the center of the canvas where the box should be
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

        // 4. Verify cursor style
        const cursor = await page.evaluate(() => {
            const viewer = document.querySelector('[data-testid="viewer-container"]');
            return window.getComputedStyle(viewer as Element).cursor;
        });

        console.log('Detected cursor:', cursor);

        expect(cursor).toBe('pointer');
    });

    test('should change cursor to crosshair in sketch mode', async ({ page }) => {
        // 1. Enter sketch mode
        await page.keyboard.press('s');
        await page.getByText('XY Plane').click();

        // 2. Verify cursor style
        const cursor = await page.evaluate(() => {
            const viewer = document.querySelector('.relative.w-full.h-full');
            return window.getComputedStyle(viewer as Element).cursor;
        });

        expect(cursor).toBe('crosshair');
    });
});
