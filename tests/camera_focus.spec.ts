
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

        // 3. Create a Box via code (fastest way to get geometry)
        await editor.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.keyboard.insertText(`
        const { Sketcher } = replicad;
        const box = new Sketcher()
            .hLine(40)
            .vLine(40)
            .hLine(-40)
            .close()
            .extrude(30);
        return box;
        `);

        // Wait for computation
        await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });
        await page.locator('canvas').first().waitFor({ state: 'visible' });

        // 4. Select a face (simulated via internal helper to avoid 3D click guessing)
        await page.evaluate(() => {
            // @ts-ignore
            if (window.__TEST_SELECT_FACE) {
                // @ts-ignore
                window.__TEST_SELECT_FACE(0, 0); // Select first face of first shape
            }
        });

        // 5. Start Sketch on Face Check:
        // Use internal helper to open dialog reliably
        // Wait for helper to be exposed
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

        // Click "Select from 3D View"
        await page.getByText('Select from 3D View').click();

        // This puts us in FACE_SELECTION mode.
        // We trigger selection again to "confirm" the face we want to sketch on 
        // (or select it if it wasn't selected)
        await page.evaluate(() => {
            // @ts-ignore
            if (window.__TEST_SELECT_FACE) {
                // @ts-ignore
                window.__TEST_SELECT_FACE(0, 0);
            }
        });

        // Verify Overlay is visible and has correct class for transparency
        const overlay = page.getByTestId('sketch-canvas-overlay');
        await expect(overlay).toBeVisible();
        await expect(overlay).toHaveClass(/bg-black\/75/); // Verify semi-transparency

        // Verify Canvas is transparent
        const canvas = page.getByTestId('sketch-canvas');
        await expect(canvas).toHaveClass(/bg-transparent/);

        // Cancel Sketch to clean up
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(overlay).not.toBeVisible();
    });
});
