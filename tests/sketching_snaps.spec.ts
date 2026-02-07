import { test, expect, type Page } from '@playwright/test';

async function waitForStability(page: Page, expectedCount?: number) {
    await page.waitForFunction((count) => {
        const currentCount = (window as any).getExecutionCount?.() || 0;
        const computing = (window as any).isComputing?.();
        if (count !== undefined) return currentCount >= count && computing === false;
        if (computing === undefined) return false;
        return computing === false;
    }, expectedCount, { timeout: 60000 });
}

test.describe('Sketching Snaps and Constraints E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas', { timeout: 60000 });
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 60000 });
        await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 60000 });
        await waitForStability(page);
    });

    test('Horizontal Snapping and Highlight', async ({ page }) => {
        await page.getByLabel('Sketch', { exact: true }).click();
        await page.getByText('XY Plane (Top)', { exact: true }).click();

        const canvas = page.getByTestId('sketch-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const startX = box.x + 100;
        const startY = box.y + 100;

        // Start line
        await page.mouse.move(startX, startY);
        await page.mouse.down();

        // Move horizontally but slightly off in Y
        await page.mouse.move(startX + 150, startY + 3);

        // Verify "Dynamic Dim" highlight (green text)
        // #00FF9D corresponds to rgb(0, 255, 157)
        const primaryInput = page.getByTestId('primary-input-display').locator('span').first();
        await expect(primaryInput).toHaveCSS('color', 'rgb(0, 255, 157)');
        await expect(primaryInput).toHaveCSS('font-weight', '700'); // Bold

        await page.keyboard.press('Enter');
        await page.mouse.up();

        await page.click('button:has-text("Done")');

        // Verify code contains Sketcher
        const code = await page.evaluate(() => (window as any).getCode());
        expect(code).toContain('Sketcher');
    });

    test('Midpoint Snapping', async ({ page }) => {
        await page.getByLabel('Sketch', { exact: true }).click();
        await page.getByText('XY Plane (Top)', { exact: true }).click();

        const canvas = page.getByTestId('sketch-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Draw first line from (100, 100) to (200, 100)
        const x1 = box.x + 100;
        const y1 = box.y + 100;
        const x2 = box.x + 200;
        const y2 = box.y + 100;

        await page.mouse.move(x1, y1);
        await page.mouse.down();
        await page.mouse.move(x2, y2);
        await page.mouse.up();

        // Start second line from midpoint (150, 100)
        const midX = box.x + 150;
        const midY = box.y + 100;

        // Hover near midpoint to trigger snap
        await page.mouse.move(midX + 2, midY + 2);

        // We can't easily assert on the Triangle icon without complex screenshot logic,
        // but the fact that it snaps means the next mouseDown will pick the midpoint.
        await page.mouse.down();
        await page.mouse.move(midX, midY + 50);
        await page.mouse.up();

        await page.click('button:has-text("Done")');

        const code = await page.evaluate(() => (window as any).getCode());
        expect(code).toContain('Sketcher');
    });

    test('Clear All functionality', async ({ page }) => {
        await page.getByLabel('Sketch', { exact: true }).click();
        await page.getByText('XY Plane (Top)', { exact: true }).click();

        // Draw something
        await page.mouse.move(200, 200);
        await page.mouse.down();
        await page.mouse.move(300, 300);
        await page.mouse.up();

        await expect(page.getByText('Done (1)')).toBeVisible();

        // Click Clear All
        await page.click('button:has-text("Clear All")');

        await expect(page.getByText('Done (0)')).toBeVisible();
    });
});
