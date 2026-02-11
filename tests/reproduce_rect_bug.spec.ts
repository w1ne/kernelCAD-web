import { test, expect } from '@playwright/test';

test.describe('Rectangle Sketching Bug Reproduction', () => {
    test('Should generate code for a rectangle sketched on a face', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        await page.waitForSelector('canvas');

        // Setup a simple box with anonymous return
        const initialCode = `
const { Sketcher } = replicad;
const base = new Sketcher().hLine(40).vLine(40).hLine(-40).close().extrude(20);
const filleted = base.fillet(2);
const cyl = replicad.makeCylinder(10, 30).translate(0, 0, 18);
return [filleted.cut(cyl)];
`;
        await page.evaluate((c) => {
            // @ts-ignore
            window.setCode(c);
        }, initialCode);

        // Wait for geometries
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return (typeof window.getGeometries === 'function' && window.getGeometries())?.length;
            });
        }, { timeout: 15000 }).toBeGreaterThan(0);

        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return typeof window.getSketches === 'function';
            });
        }, { timeout: 15000 }).toBe(true);

        const initialSketchCount = await page.evaluate(() => {
            // @ts-ignore
            return window.getSketches?.()?.length ?? 0;
        }) as number;

        // Select Face
        await page.evaluate(() => {
            // @ts-ignore
            if (window.__TEST_SELECT_FACE) window.__TEST_SELECT_FACE(0, 0);
        });

        // Wait for selection to be processed and plane to be available
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return !!window.getSelectedFace();
            });
        }, { timeout: 5000 }).toBe(true);

        await page.waitForTimeout(1000);

        // Click Sketch
        await page.getByTitle('Sketch on Face', { exact: false }).click();

        // Verify Sketch Mode
        const canvas = page.getByTestId('sketch-canvas');
        await expect(canvas).toBeVisible();

        // Click Rectangle Tool
        await page.getByText('Rectangle', { exact: true }).click();

        // Draw Rectangle
        const box = await canvas.boundingBox();
        if (box) {
            const startX = box.x + box.width / 2;
            const startY = box.y + box.height / 2;
            const endX = startX + 100;
            const endY = startY + 100;

            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.mouse.move(endX, endY);
            await page.mouse.up();
        }

        // Click Done
        const doneBtn = page.getByText(/Done \(\d+\)/);
        await expect(doneBtn).toContainText('Done (1)');
        await doneBtn.click();

        // Expect at least one new sketch to be captured after finishing the face sketch.
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return window.getSketches?.()?.length ?? 0;
            });
        }, { timeout: 15000 }).toBeGreaterThan(initialSketchCount);

        // Sketch lines should be non-empty (otherwise they won't be visible).
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                const sketches = window.getSketches?.() ?? [];
                return sketches.some((s: any) => (s?.vertices?.length ?? 0) > 0);
            });
        }, { timeout: 15000 }).toBe(true);

        // Verify Code
        const finalCode = await page.evaluate(() => {
            // @ts-ignore
            return window.getCode();
        }) as string;

        console.log('Final Code after Rectangle Sketch:', finalCode);

        // Check for rectangle code
        expect(finalCode).toContain('.movePointerTo(');
        expect(finalCode).toContain('.lineTo(');
        expect(finalCode).toContain('.close()');
    });
});
