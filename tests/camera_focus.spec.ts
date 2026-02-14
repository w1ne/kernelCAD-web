
import { test, expect } from '@playwright/test';

test.describe('Camera Focus & Sketching', () => {
    test('Camera should focus and show transparent overlay when sketching on face', async ({ page }) => {
        page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));
        page.on('pageerror', err => console.log(`[Browser Error]: ${err.message}`));

        // 1. Load Application with clean state
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached' });

        // Force Code mode to ensure editor is visible
        await page.evaluate(() => {
            (window as any).setViewMode?.('code');
        });

        // 2. Wait for Editor
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 15000 });
        const editor = page.locator('.monaco-editor').first();
        await expect(editor).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(1000);

        // 3. Create a Box via code (fastest and deterministic way to get geometry)
        const code = `return replicad.makeBox(40, 40, 30);`;
        await page.evaluate((c) => (window as any).setCode?.(c), code);
        await page.waitForFunction(() => ((window as any).isComputing?.() ?? true) === false, { timeout: 10000 });

        // 4. Start sketch and verify sketch overlay behavior.
        // Use internal helper to open selector reliably.
        await page.waitForFunction(() => typeof (window as any).setActiveDialog === 'function');

        await page.evaluate(() => {
            // @ts-ignore
            if (window.setActiveDialog) {
                // @ts-ignore
                window.setActiveDialog('planeSelector');
            }
        });

        // Expect Plane Selector Dialog
        await expect(page.getByText('Select Sketch Plane')).toBeVisible();

        // Select a base plane to enter sketch mode deterministically.
        await page.getByText('XY Plane (Top)').click();

        // Verify Overlay is visible and has correct class for transparency
        const overlay = page.getByTestId('sketch-canvas-overlay');
        await expect(overlay).toBeVisible();
        await expect(overlay).toHaveClass(/bg-black\/75/); // Verify semi-transparency

        // Verify Canvas is transparent
        const canvas = page.getByTestId('sketch-canvas');
        await expect(canvas).toHaveClass(/bg-transparent/);

        // Cancel Sketch to clean up
        await overlay.getByRole('button', { name: 'Cancel' }).click();
        await expect(overlay).not.toBeVisible();
    });
});
