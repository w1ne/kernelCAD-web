import { test, expect } from '@playwright/test';

test.describe('Floating Panels HUD & Live Preview', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.waitForSelector('canvas');
        await page.waitForFunction(() => (window as any).isEngineReady === true);

        // Setup a basic box and a sketch to work with
        const initialCode = `
const box1 = replicad.makeBox(10, 10, 10);
const mySketch = new Sketcher('XY').rect(5, 5); 
return [box1, mySketch.extrude(2)];
        `;
        await page.evaluate((c) => (window as any).setCode?.(c), initialCode);

        // Wait for geometry to compute
        await expect.poll(async () => {
            const geoms = await page.evaluate(() => (window as any).getGeometries?.() || []);
            return (geoms as any[]).length;
        }, { timeout: 10000 }).toBeGreaterThan(0);
    });

    test('should open Extrude panel and verify live preview', async ({ page, browserName }) => {
        // 1. Open Command Palette and search for Extrude
        await page.keyboard.press('Control+k');
        await page.getByPlaceholder('Type a command or search...').fill('Extrude');
        await page.keyboard.press('Enter');

        // 2. Verify panel is open
        const panel = page.getByRole('dialog', { name: 'Extrude' });
        await expect(panel).toBeVisible();

        // 3. Wait for the sketch to be selected in the dropdown
        const sketchSelect = panel.locator('#sketch-select');
        await expect(sketchSelect).toHaveValue('mySketch');

        // 4. Change distance and check preview geometries
        const distanceInput = panel.getByLabel('Distance (mm)');
        await distanceInput.fill('50');

        // 5. Verify preview geometries are populated (Ghosting)
        // We give it more time as replicad execution in worker over bridge can be slow
        await expect.poll(async () => {
            const previewGeoms = await page.evaluate(() => (window as any).getPreviewGeometries?.() || []);
            return (previewGeoms as any[]).length;
        }, { timeout: 15000 }).toBeGreaterThan(0);

        // 6. Submit and verify final code
        const submitBtn = panel.getByRole('button', { name: 'Apply', exact: true });
        await expect(submitBtn).toBeVisible();
        await submitBtn.click();

        // Wait for panel to close
        await expect(panel).toBeHidden();

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode?.() || '');
        }).toContain('.extrude(50)');

        // 6. Verify panel is closed
        await expect(panel).not.toBeVisible();
    });

    test('should support dragging the floating panel', async ({ page }) => {
        // Open Fillet panel
        await page.keyboard.press('Control+k');
        await page.getByPlaceholder('Type a command or search...').fill('Fillet');
        await page.keyboard.press('Enter');

        const panel = page.getByRole('dialog', { name: 'Fillet' });
        await expect(panel).toBeVisible();

        const initialBox = await panel.boundingBox();
        if (!initialBox) throw new Error('Could not get panel bounding box');

        // Drag by the handle (header)
        const handle = panel.locator('div').filter({ hasText: 'Fillet' }).first();

        // Perform drag
        await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + 20);
        await page.mouse.down();
        await page.mouse.move(initialBox.x + initialBox.width / 2 + 100, initialBox.y + 20 + 100);
        await page.mouse.up();

        const finalBox = await panel.boundingBox();
        if (!finalBox) throw new Error('Could not get panel bounding box after drag');

        expect(finalBox.x).toBeGreaterThan(initialBox.x);
        expect(finalBox.y).toBeGreaterThan(initialBox.y);
    });

    test('should close panel with Escape key', async ({ page }) => {
        await page.keyboard.press('Control+k');
        await page.getByPlaceholder('Type a command or search...').fill('Chamfer');
        await page.keyboard.press('Enter');

        const panel = page.getByRole('dialog', { name: 'Chamfer' });
        await expect(panel).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(panel).not.toBeVisible();
    });

    test('should use Boolean panel for Union workflow', async ({ page }) => {
        // Setup two shapes
        const code = `
const box1 = replicad.makeBox(10, 10, 10);
const box2 = replicad.makeBox(10, 10, 10).translate(5, 5, 5);
return [box1, box2];
`;
        await page.evaluate((c) => (window as any).setCode?.(c), code);

        await page.keyboard.press('Control+k');
        await page.getByPlaceholder('Type a command or search...').fill('Union');
        await page.keyboard.press('Enter');

        const panel = page.getByRole('dialog', { name: 'Join (Union)' });
        await expect(panel).toBeVisible();

        // Fill inputs
        await panel.getByLabel('Base Shape (Target)').fill('box1');
        await panel.getByLabel('Tool Shape (Modifier)').fill('box2');

        // Verify live preview for boolean
        await expect.poll(async () => {
            const previewGeoms = await page.evaluate(() => (window as any).getPreviewGeometries?.() || []);
            return (previewGeoms as any[]).length;
        }).toBeGreaterThan(0);

        await page.getByTestId('base-form-submit').click();

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode?.() || '');
        }).toContain('.fuse(box2)');
    });
});
