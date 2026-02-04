import { test, expect } from '@playwright/test';

test.describe('UI Interactions E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.waitForFunction(() => (window as any).isEditorReady === true);
        await page.waitForFunction(() => (window as any).isEngineReady === true);
    });

    test('Should Undo and Redo operations', async ({ page }) => {
        // Ensure we start from a code state that does NOT already include makeBox
        await page.evaluate(() => (window as any).setCode?.('return replicad.makeCylinder(5, 10);'));
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode());
        }).toContain('replicad.makeCylinder');

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
        }).toContain('replicad.makeCylinder');

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
        // Prefer a runtime/geometry error over a JS parse error to ensure the worker
        // actually runs and populates the shared error state.
        const invalidCode = `
const box = replicad.makeBaseBox(10, 10, 10);
return fillet(box, 0);
        `;
        await page.evaluate((c) => (window as any).setCode(c), invalidCode);

        // Wait for the engine to surface an error
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getError?.() || null);
        }).toBeTruthy();

        // Basic UI sanity check that some error text is visible
        await expect(page.locator('pre').filter({ hasText: /syntax|unexpected|error/i }).first()).toBeVisible();
    });

    test('Should support sketcher() helper in code', async ({ page }) => {
        const code = `
const base = sketcher('XY').hLine(20).vLine(20).hLine(-20).close().extrude(10);
return base;
`;
        await page.evaluate((c) => (window as any).setCode?.(c), code);

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getError?.() ?? null);
        }, { timeout: 15000 }).toBeNull();

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getGeometries?.()?.length ?? 0);
        }, { timeout: 15000 }).toBeGreaterThan(0);
    });

    test('Should support global Sketcher without destructuring replicad', async ({ page }) => {
        const code = `
const base = new Sketcher('XY').hLine(20).vLine(20).hLine(-20).close().extrude(10);
return base;
`;
        await page.evaluate((c) => (window as any).setCode?.(c), code);

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getError?.() ?? null);
        }, { timeout: 15000 }).toBeNull();

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getGeometries?.()?.length ?? 0);
        }, { timeout: 15000 }).toBeGreaterThan(0);
    });

    test('Should toggle Design and Code modes', async ({ page }) => {
        // Start in Design mode if possible, or check current
        await page.getByTitle('Design Mode').click();
        await expect(page.getByText('Design', { exact: true }).first()).toBeVisible();

        await page.getByTitle('Code Mode').click();
        await expect(page.getByText('script.js').first()).toBeVisible();
    });
});
