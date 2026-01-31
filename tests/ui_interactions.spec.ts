import { test, expect } from '@playwright/test';

test.describe('UI Interactions E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.waitForFunction(() => (window as any).isEditorReady === true);
    });

    test('Should Undo and Redo operations', async ({ page }) => {
        // Create a box
        await page.getByTitle('Box').click();
        await page.getByText('Insert').click();

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode());
        }).toContain('replicad.makeBox');

        // Undo
        const undoBtn = page.getByTitle('Undo');
        await expect(undoBtn).toBeEnabled();
        await undoBtn.click();

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode());
        }).not.toContain('replicad.makeBox');

        // Redo
        const redoBtn = page.getByTitle('Redo');
        await expect(redoBtn).toBeEnabled();
        await redoBtn.click();

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode());
        }).toContain('replicad.makeBox');
    });

    test('Should switch View Modes', async ({ page }) => {
        // Shaded
        await page.getByTitle('Shaded', { exact: true }).click();
        // Wireframe
        await page.getByTitle('Wireframe').click();
        // Shaded with Edges
        await page.getByTitle('Shaded with Edges').click();

        // No specific assertion other than No Crash, 
        // as we can't easily peek into Three.js state from here without more exposure
    });

    test('Should display Error Overlay on invalid code', async ({ page }) => {
        const invalidCode = 'const x = ;';
        await page.evaluate((c) => (window as any).setCode(c), invalidCode);

        // Check for error overlay
        const errorOverlay = page.locator('pre:has-text("Unexpected token")');
        await expect(errorOverlay).toBeVisible({ timeout: 10000 });
    });

    test('Should toggle Design and Code modes', async ({ page }) => {
        // Start in Design mode if possible, or check current
        await page.getByTitle('Design Mode').click();
        await expect(page.getByText('Design', { exact: true }).first()).toBeVisible();

        await page.getByTitle('Code Mode').click();
        await expect(page.getByText('script.js').first()).toBeVisible();
    });
});
