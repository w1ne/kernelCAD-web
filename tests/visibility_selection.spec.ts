import { test, expect } from '@playwright/test';

test.describe('Visibility and Selection System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');

        // Clear storage to avoid cross-test pollution
        await page.evaluate(() => window.localStorage.clear());
        // Wait for engine to be ready (OpenCascade load can be slow)
        await page.waitForFunction(() => (window as any).isEngineReady, undefined, { timeout: 60000 });

        // Inject code to ensure 'box1' exists
        const code = `
const box1 = replicad.makeBox(10, 10, 10);
return box1;
        `;
        await page.evaluate((c) => {
            if ((window as any).setCode) {
                (window as any).setCode(c);
            } else {
                console.warn('window.setCode not found! Test might fail.');
            }
        }, code);

        // Wait for execution to stabilize
        await page.waitForFunction(() => (window as any).getExecutionCount() > 0 && !(window as any).isComputing(), undefined, { timeout: 30000 });

        // Move mouse away to clear any hover state from previous runs or default position
        await page.mouse.move(1200, 100);
    });

    test('should sync hover from SceneBrowser to global state', async ({ page }) => {
        const item = page.getByTestId('scene-item-box1').first();
        await item.waitFor({ state: 'visible' });
        await item.hover();

        // Check global state via helper
        const hoveredId = await page.evaluate(() => (window as any).getHoveredItemId());
        expect(hoveredId).toBe('box1');

        await page.mouse.move(1200, 100); // Move away from origin/center but stay on canvas

        // Wait for throttled useFrame (~20fps) to update the hover state
        await page.waitForFunction(() => (window as any).getHoveredItemId() === null, { timeout: 5000 });

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

        // Wait for UI to update
        const handle = await item.elementHandle();
        if (handle) {
            await page.waitForFunction((el) => !el.classList.contains('bg-[#333]'), handle);
        }

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

    test('should persist hidden items across reloads', async ({ page }) => {
        const item = page.getByTestId('scene-item-box1').first();
        await item.waitFor({ state: 'visible' });

        // Click the eye icon to hide 'box1'
        // The eye icon is the button inside the item.
        const eyeButton = item.locator('button[title="Hide Operation"]');
        await eyeButton.click();

        // Check if it's now hidden (icon changes to EyeOff)
        await expect(item.locator('svg.text-gray-600')).toBeVisible(); // EyeOff has text-gray-600 class in the implementation

        // Reload
        await page.reload();
        // Clear storage again just in case, but actually we want to TEST persistence, 
        // and we just cleared it in beforeEach, so now it should have what we just set.
        // Wait, if we clear it here, we lose the persistence! 
        // So DON'T clear it here.

        await page.waitForFunction(() => (window as any).isEngineReady, undefined, { timeout: 60000 });

        // Re-inject code because reload lost it
        const code = `
const box1 = replicad.makeBox(10, 10, 10);
return box1;
        `;
        await page.evaluate((c) => (window as any).setCode(c), code);
        await page.waitForFunction(() => (window as any).getExecutionCount() > 0 && !(window as any).isComputing(), undefined, { timeout: 30000 });

        // Verify it is still hidden
        const newItem = page.getByTestId('scene-item-box1').first();
        await newItem.waitFor({ state: 'visible' });
        await expect(newItem.locator('svg.text-gray-600')).toBeVisible();
    });

    test('should select plane by clicking in Scene Browser', async ({ page }) => {
        // Find the plane in the Scene Browser
        const planeItem = page.getByTestId('scene-item-base-xy').first();
        await planeItem.waitFor({ state: 'visible' });

        // Click on "Origin XY" in the tree
        await planeItem.click();

        // Check global state
        const selectedId = await page.evaluate(() => (window as any).getSelectedItemId());
        expect(selectedId).toBe('base-xy');

        // Check if it appears highlighted
        await expect(planeItem).toHaveClass(/border-l-2/);
    });
});
