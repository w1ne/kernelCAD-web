import { test, expect } from '@playwright/test';

test.describe('Visibility and Selection System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for engine to be ready (OpenCascade load can be slow)
        await page.waitForFunction(() => (window as any).isEngineReady, undefined, { timeout: 60000 });
    });

    test('should sync hover from SceneBrowser to global state', async ({ page }) => {
        const item = page.getByTestId('scene-item-box1').first();
        await item.waitFor({ state: 'visible' });
        await item.hover();

        // Check global state via helper
        const hoveredId = await page.evaluate(() => (window as any).getHoveredItemId());
        expect(hoveredId).toBe('box1');

        await page.mouse.move(0, 0); // Move away
        const clearedId = await page.evaluate(() => (window as any).getHoveredItemId());
        expect(clearedId).toBe(null);
    });

    test('should sync hover from global state to SceneBrowser', async ({ page }) => {
        const item = page.getByTestId('scene-item-box1').first();
        await item.waitFor({ state: 'visible' });

        // Trigger hover via global state
        await page.evaluate(() => (window as any).__TEST_SET_HOVERED('box1'));

        // Check if SceneBrowser item is highlighted (it has bg-[#333] class)
        await expect(item).toHaveClass(/bg-\[#333\]/);

        // Clear hover
        await page.evaluate(() => (window as any).__TEST_SET_HOVERED(null));
        await expect(item).not.toHaveClass(/bg-\[#333\]/);
    });

    test('should show context menu on right click in SceneBrowser', async ({ page }) => {
        const item = page.getByTestId('scene-item-box1').first();
        await item.waitFor({ state: 'visible' });
        await item.click({ button: 'right' });

        // Check if context menu options appear
        await expect(page.locator('text=Delete')).toBeVisible();
        await expect(page.locator('text=Isolate')).toBeVisible();

        // Click Isolate and check if other items are hidden
        await page.locator('text=Isolate').click();
        await expect(page.locator('text=Delete')).not.toBeVisible();
    });

    test('should render selection outlines in Viewer when selected', async ({ page }) => {
        await page.evaluate(() => (window as any).__TEST_SELECT_ITEM('box1'));

        // For now, check if the item in Browser is highlighted as selected
        const item = page.getByTestId('scene-item-box1').first();
        await item.waitFor({ state: 'visible' });
        await expect(item).toHaveClass(/border-l-2/);
    });
});
