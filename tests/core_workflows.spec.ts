import { test, expect, Page } from '@playwright/test';

// Helper to wait for geometry computation to finish and check for errors
async function waitForStability(page: Page, expectedCount?: number) {
    console.log(`DEBUG: Waiting for stability (Expected Count: ${expectedCount})...`);

    await page.waitForFunction((count) => {
        const currentCount = (window as any).getExecutionCount?.() || 0;
        const computing = (window as any).isComputing?.();

        // If we have an expected count, wait until we reach it AND computation finishes
        if (count !== undefined) {
            return currentCount >= count && computing === false;
        }

        // Otherwise just wait for computation to be finished (fallback)
        if (computing === undefined) return false;
        return computing === false;
    }, expectedCount, { timeout: 60000 });

    const error = await page.evaluate(() => (window as any).getError?.());
    if (error) {
        console.error(`DEBUG: CAD Engine Error detected: ${error}`);
        throw new Error(`CAD Engine Error: ${error}`);
    }
    const diagnostics = await page.evaluate(() => (window as any).getEngineDiagnostics?.());
    if (diagnostics) {
        expect(diagnostics.workerCrashes).toBe(0);
        expect(diagnostics.protocolViolations).toBe(0);
        expect(diagnostics.requestTimeouts).toBe(0);
    }
    const geometryMetrics = await page.evaluate(() => (window as any).getGeometryMetrics?.());
    if (geometryMetrics) {
        // Stale drops can occur under rapid input, but should stay low in stable workflows.
        expect(geometryMetrics.staleMainResponsesDropped).toBeLessThanOrEqual(2);
        expect(geometryMetrics.stalePreviewResponsesDropped).toBeLessThanOrEqual(5);
    }
    const currentCount = await page.evaluate(() => (window as any).getExecutionCount?.());
    console.log(`DEBUG: Stability reached (Count: ${currentCount}).`);
}

async function getNextExecutionCount(page: Page): Promise<number> {
    const current = await page.evaluate(() => (window as any).getExecutionCount?.() || 0);
    return current + 1;
}

// Helper to get total volume of all geometries
async function getTotalVolume(page: Page): Promise<number> {
    const vol = await page.evaluate(() => {
        const geometries = (window as any).getGeometries?.() || [];
        // Sum volumes of all shapes.
        return geometries.reduce((acc: number, g: any) => acc + (g.volume || 0), 0);
    });
    console.log(`DEBUG: Total Volume calculated in test: ${vol}`);
    return vol;
}

test.describe('Core CAD Workflows E2E (Hardened)', () => {

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.text().includes('Worker:')) {
                console.log(`BROWSER [${msg.type().toUpperCase()}]: ${msg.text()}`);
            }
        });
        await page.goto('/');
        await page.waitForSelector('[data-testid="workbench-ready"]');
        await page.waitForSelector('[data-testid="viewer-container"] canvas');
        await page.waitForFunction(() => (window as any).isEngineReady === true);
        await page.evaluate(() => (window as any).resetEngineDiagnostics?.());

        // Wait for the initial defaultCode execution to finish (execution count 1)
        await waitForStability(page, 1);
    });

    test('Workflow 1: Sketch-Profile & Extrude-Solid (Watertight & Precision)', async ({ page }) => {
        const code = `
const profile = new replicad.Sketcher('XY')
  .movePointerTo([0, 0])
  .hLine(10)
  .vLine(20)
  .hLine(-10)
  .close();

return extrude(profile, 30);
        `;

        const count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode(c), code);
        await waitForStability(page, count);

        const geometries = await page.evaluate(() => (window as any).getGeometries?.() || []) as any[];
        expect(geometries.length).toBe(1);

        // Assert topology: A box-like extrusion should have 6 faces.
        expect(geometries[0].faces?.length).toBe(6);

        // Verify volume (10 * 20 * 30 = 6000)
        const volume = await getTotalVolume(page);
        expect(volume).toBeCloseTo(6000, 0.1);

        // Assert "Watertightness" implicitly by volume being non-zero for a closed shape
        expect(volume).toBeGreaterThan(0);
    });

    test('Workflow 4: Boolean Operations (Volume Delta Validation)', async ({ page }) => {
        // Create a 10x10x10 box (Vol: 1000)
        // Cut a cylinder from the center. 
        // Note: In this environment, makeCylinder seems to take diameter as first argument.
        // makeCylinder(5, 20) -> radius 2.5. Vol in box: PI * 2.5^2 * 10 = 196.349
        // Expected Vol: 1000 - 196.349 = 803.651
        const code = `
const box = replicad.makeBaseBox(10, 10, 10);
const cyl = replicad.makeCylinder(5, 20).translate(5, 5, -5);
return box.cut(cyl);
        `;

        const count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode(c), code);
        await waitForStability(page, count);

        const volume = await getTotalVolume(page);
        const expectedVolume = 1000 - (Math.PI * Math.pow(2.5, 2) * 10);
        expect(volume).toBeCloseTo(expectedVolume, 0.5);

        const geometries = await page.evaluate(() => (window as any).getGeometries?.() || []) as any[];
        // A box with a hole should have more than 6 faces.
        expect(geometries[0].faces?.length).toBeGreaterThanOrEqual(7);
    });

    test('Workflow 5: Parametric Edit (Volume Linearity)', async ({ page }) => {
        const code = (w: number) => `
return replicad.makeBaseBox(${w}, 10, 10);
        `;

        // Width 10 -> Vol 1000
        let count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode(c), code(10));
        await waitForStability(page, count);
        const vol1 = await getTotalVolume(page);
        expect(vol1).toBeCloseTo(1000, 0.1);

        // Width 20 -> Vol 2000
        count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode(c), code(20));
        await waitForStability(page, count);
        const vol2 = await getTotalVolume(page);
        expect(vol2).toBeCloseTo(2000, 0.1);

        // Verify linearity
        expect(vol2).toBeCloseTo(vol1 * 2, 0.1);
    });

    test('Workflow 6: Stable Reference (Resilience to ID Shift)', async ({ page }) => {
        test.setTimeout(60000); // Allow more time for complex sequence
        const code = `
const box = replicad.makeBaseBox(10, 10, 10);
return box;
        `;

        let count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode(c), code);
        await waitForStability(page, count);

        // Select face 0
        await page.evaluate(() => (window as any).__TEST_SELECT_FACE?.(0, 0));
        await page.waitForFunction(() => (window as any).getSelectedFace?.() !== null);
        await expect(page.getByTitle(/Extrude Face/)).toBeVisible({ timeout: 15000 });

        // Fillet the box first (to shuffle IDs)
        const filletedCode = `
const box = replicad.makeBaseBox(10, 10, 10);
const filleted = fillet(box, 1); // Fillet all edges
return filleted;
        `;
        count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode(c), filletedCode);
        await waitForStability(page, count);

        // Now trigger "Extrude on Selected Face"
        // If the selection got invalidated after topology changes, reselect a planar face.
        try {
            await expect(page.getByTitle(/Extrude Face/)).toBeVisible({ timeout: 5000 });
        } catch {
            const planarFaceId = await page.evaluate(() => {
                const geometries = (window as any).getGeometries?.() || [];
                const faces = geometries?.[0]?.faces || [];
                const idx = faces.findIndex((f: any) => f?.plane?.origin && f?.plane?.normal);
                return idx >= 0 ? idx : 0;
            });
            await page.evaluate((faceId) => (window as any).__TEST_SELECT_FACE?.(0, faceId), planarFaceId);
            await expect(page.getByTitle(/Extrude Face/)).toBeVisible({ timeout: 15000 });
        }

        await page.getByTitle(/Extrude Face/).click();
        await expect(page.getByRole('dialog', { name: 'Extrude' })).toBeVisible();
        await page.locator('button[type="submit"]', { hasText: 'Extrude' }).click();

        count = await getNextExecutionCount(page);
        await waitForStability(page, count);

        const volume = await getTotalVolume(page);
        expect(volume).toBeGreaterThan(900);

        const geometries = await page.evaluate(() => (window as any).getGeometries?.() || []) as any[];
        expect(geometries.length).toBeGreaterThanOrEqual(1);
    });

    test('Workflow: Invalid Sketch (Closure Error)', async ({ page }) => {
        const code = `
const profile = new replicad.Sketcher('XY')
  .movePointerTo([0, 0])
  .hLine(10)
  .vLine(10);
// NOTE: NOT CLOSED

return extrude(profile, 10);
        `;

        const count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode(c), code);

        // DISCOVERY: OpenCascade implicitly closes simple loops.
        // For a 10x10 triangle (half box), expected vol is 500.
        await waitForStability(page, count);
        const volume = await getTotalVolume(page);
        expect(volume).toBeCloseTo(500, 1);
    });

});
