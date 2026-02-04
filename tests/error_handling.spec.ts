import { test, expect, Page } from '@playwright/test';

async function waitForStability(page: Page, expectedCount?: number) {
    await page.waitForFunction((count) => {
        const currentCount = (window as any).getExecutionCount?.() || 0;
        const computing = (window as any).isComputing?.();
        if (count !== undefined) return currentCount >= count && computing === false;
        return computing === false;
    }, expectedCount, { timeout: 60000 }); // Increased timeout for error cases

    return page.evaluate(() => (window as any).getError?.());
}

async function getNextExecutionCount(page: Page): Promise<number> {
    const current = await page.evaluate(() => (window as any).getExecutionCount?.() || 0);
    return current + 1;
}

test.describe('Error Handling E2E', () => {

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
        });
        await page.goto('/');
        await page.waitForFunction(() => (window as any).isEditorReady === true);
        await page.waitForFunction(() => (window as any).isEngineReady === true);

        // Clear any previous errors
        await page.evaluate(() => {
            (window as any).setError?.(null);
            console.log('DEBUG: Test environment reset');
        });

        await waitForStability(page, 1);
    });

    test('Syntax Error in User Code', async ({ page }) => {
        const code = `return replicad.makeBox(10, 10, 10`; // Missing closing paren
        const initialCount = await page.evaluate(() => (window as any).getExecutionCount() || 0);
        console.log(`DEBUG: Initial execution count: ${initialCount}`);

        await page.evaluate((c) => {
            console.log('DEBUG: Calling setCode with syntax error...');
            (window as any).setCode(c);
        }, code);

        console.log('DEBUG: Waiting for the error to be caught...');

        // Wait for count to increment
        const error = await waitForStability(page, initialCount + 1);

        console.log(`DEBUG: Caught error: ${error}`);
        expect(error).toBeTruthy();
        expect(error).toMatch(/syntax|unexpected/i);
    });

    test('Zero Radius Fillet (OpenCascade Error)', async ({ page }) => {
        const code = `
const box = replicad.makeBaseBox(10, 10, 10);
return fillet(box, 0);
        `;
        const initialCount = await page.evaluate(() => (window as any).getExecutionCount() || 0);
        await page.evaluate((c) => (window as any).setCode(c), code);

        const error = await waitForStability(page, initialCount + 1);
        expect(error).toBeTruthy();
        expect(error).toMatch(/fail|zero|radius|OpenCascade Error/i);
    });

    test('Invalid Face Selection', async ({ page }) => {
        const code = `return replicad.makeBaseBox(10, 10, 10);`;
        await page.evaluate((c) => (window as any).setCode(c), code);
        await waitForStability(page, 2);

        // Try to select a non-existent face ID (e.g., 999)
        await page.evaluate(() => (window as any).__TEST_SELECT_FACE?.(999, 0));

        // This shouldn't crash the engine, but might result in null selection
        const selection = await page.evaluate(() => (window as any).getSelectedFace?.());
        expect(selection).toBeNull();
    });

    test('Timeout Simulation (Long Running Operation)', async ({ page }) => {
        // This depends on how the worker handles timeouts. 
        // If we don't have explicit timeout logic yet, this might just run forever.
        // For now, let's just test a complex but valid operation.
        const code = `
let body = replicad.makeBaseBox(10, 10, 10);
for (let i = 0; i < 20; i++) {
    const cyl = replicad.makeCylinder(1, 20).translate(i, 0, 0);
    body = body.fuse(cyl);
}
return body;
        `;
        const count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode(c), code);

        // This should complete within 30s or timeout the test
        await waitForStability(page, count);
        const geometries = await page.evaluate(() => (window as any).getGeometries?.() || []) as any[];
        expect(geometries.length).toBeGreaterThan(0);
    });

});
