import { test, expect } from '@playwright/test';

test.describe('Sketch on Face Stress Test', () => {

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`[BROWSER] ${msg.type().toUpperCase()}: ${msg.text()}`));
    });

    test('Should generate valid fallback code for anonymous shape', async ({ page }) => {
        // Set viewport to avoid 0 width issues
        await page.setViewportSize({ width: 1280, height: 800 });

        // 1. Load App
        await page.goto('/');
        await page.waitForSelector('canvas');

        // 2. Inject Anonymous Shape Code
        const code = `
const { Sketcher } = replicad;
const base = new Sketcher().hLine(50).vLine(50).hLine(-50).close().extrude(40);
const cyl = replicad.makeCylinder(10, 40).translate(0,0,10);
// Anonymous Return
return [base.cut(cyl)];
`;
        await page.evaluate((c) => {
            // @ts-ignore
            window.setCode(c);
        }, code);

        // Wait for app stabilization
        await page.waitForTimeout(2000);

        // Wait for geometries
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return (typeof window.getGeometries === 'function' && window.getGeometries())?.length;
            });
        }, { timeout: 15000 }).toBeGreaterThan(0);

        // 3. Select Face (Side Face, usually ID 0 or similarly low index for box-like)
        await page.evaluate(() => {
            // @ts-ignore
            if (window.__TEST_SELECT_FACE) window.__TEST_SELECT_FACE(0, 0); // Shape 0, Face 0
        });

        // Verify selection applied
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return !!window.getSelectedFace();
            });
        }, { timeout: 5000 }).toBe(true);

        // Wait for UI to react
        await page.waitForTimeout(500);

        // 4. Click Sketch Button
        const sketchBtn = page.getByTitle('Sketch on Selected Face');
        await expect(sketchBtn).toBeVisible();
        await sketchBtn.click();

        // 5. Verify Sketch Mode Entered (Canvas appears)
        const overlay = page.getByTestId('sketch-canvas-overlay');
        await expect(overlay).toBeVisible();

        const canvas = page.getByTestId('sketch-canvas');
        await expect(canvas).toBeVisible();

        // Wait for canvas to have physical size (synced from ResizeObserver)
        await expect.poll(async () => {
            const box = await canvas.boundingBox();
            return box && box.width > 0 && box.height > 0;
        }, { timeout: 5000 }).toBe(true);

        // 6. Draw something 
        const box = await canvas.boundingBox();
        if (box) {
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            await page.mouse.move(cx, cy);
            await page.mouse.down();
            await page.mouse.move(cx + 50, cy);
            await page.mouse.up();
        }

        // 7. Click Done (Wait for entities to be registered)
        const doneBtn = page.getByText(/Done \(\d+\)/);
        await expect(doneBtn).toBeEnabled({ timeout: 5000 });
        await doneBtn.click();

        // 8. Verify Generated Code
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return window.getCode();
            });
        }, { timeout: 5000 }).toContain('new Sketcher(new replicad.Plane(');

        // 9. Verify Sketch Visibility
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return (typeof window.getSketches === 'function' && window.getSketches())?.length;
            });
        }, { timeout: 10000 }).toBeGreaterThan(0);

        const finalCode = await page.evaluate(() => { // @ts-ignore 
            return window.getCode();
        }) as string;
        console.log('Final Code (Anonymous):', finalCode);
        expect(finalCode).not.toContain('sketchOnFace(');
    });

    test('Should generate parametric code for named shape', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });

        // 1. Load App
        await page.goto('/');
        await page.waitForSelector('canvas');

        // 2. Inject Named Shape Code
        const code = `
const { Sketcher } = replicad;
const base = new Sketcher().hLine(50).vLine(50).hLine(-50).close().extrude(40);
return [base]; 
`;
        await page.evaluate((c) => {
            // @ts-ignore
            window.setCode(c);
        }, code);

        // Wait for app stabilization
        await page.waitForTimeout(2000);

        // Wait for geometries
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return (typeof window.getGeometries === 'function' && window.getGeometries())?.length;
            });
        }, { timeout: 15000 }).toBeGreaterThan(0);

        // 3. Select Face
        await page.evaluate(() => {
            // @ts-ignore
            if (window.__TEST_SELECT_FACE) window.__TEST_SELECT_FACE(0, 0);
        });

        // Verify selection applied
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return !!window.getSelectedFace();
            });
        }, { timeout: 5000 }).toBe(true);

        await page.waitForTimeout(500);

        // 4. Click Sketch
        await page.getByTitle('Sketch on Selected Face').click();

        // 5. Verify Sketch Mode
        const canvas = page.getByTestId('sketch-canvas');
        await expect(canvas).toBeVisible();

        // Wait for size
        await expect.poll(async () => {
            const box = await canvas.boundingBox();
            return box && box.width > 0 && box.height > 0;
        }, { timeout: 5000 }).toBe(true);

        // 6. Draw something 
        const box = await canvas.boundingBox();
        if (box) {
            const startX = box.x + box.width / 4;
            const startY = box.y + box.height / 4;
            const endX = box.x + box.width * 3 / 4;
            const endY = box.y + box.height * 3 / 4;
            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.mouse.move(endX, endY);
            await page.mouse.up();
        }

        // 7. Click Done
        const doneBtn = page.getByText(/Done \(\d+\)/);
        await expect(doneBtn).toBeEnabled({ timeout: 5000 });
        await doneBtn.click();

        // 8. Verify Parametric Code
        await expect.poll(async () => {
            return await page.evaluate(() => { // @ts-ignore
                return window.getCode();
            });
        }, { timeout: 5000 }).toContain('sketchOnFace(base,');

        // 9. Verify Sketch Visibility
        await expect.poll(async () => {
            return await page.evaluate(() => {
                // @ts-ignore
                return (typeof window.getSketches === 'function' && window.getSketches())?.length;
            });
        }, { timeout: 10000 }).toBeGreaterThan(0);

        const finalCode = await page.evaluate(() => { // @ts-ignore
            return window.getCode();
        }) as string;
        console.log('Final Code (Named):', finalCode);
    });
});
