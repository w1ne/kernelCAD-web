import { test, expect, type Page } from '@playwright/test';

async function waitForStability(page: Page, expectedCount?: number) {
    await page.waitForFunction((count) => {
        const currentCount = (window as any).getExecutionCount?.() || 0;
        const computing = (window as any).isComputing?.();

        if (count !== undefined) {
            return currentCount >= count && computing === false;
        }

        if (computing === undefined) return false;
        return computing === false;
    }, expectedCount, { timeout: 60000 });

    const error = await page.evaluate(() => (window as any).getError?.() || null);
    if (error) throw new Error(`CAD Engine Error: ${error}`);
}

async function getNextExecutionCount(page: Page): Promise<number> {
    const current = await page.evaluate(() => (window as any).getExecutionCount?.() || 0);
    return current + 1;
}

test.describe('Extrude Face: Anonymous Shape Handling', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas', { timeout: 20000 });
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });
        await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
        await waitForStability(page);
    });

    test('should auto-name anonymous return and replace it with fused result', async ({ page }) => {
        const code = `
// Anonymous shape in return statement (no variable)
return replicad.makeBox(10, 10, 10);
`;

        let count = await getNextExecutionCount(page);
        await page.evaluate((c) => (window as any).setCode?.(c), code);
        await waitForStability(page, count);

        // Select a planar face on the only returned shape.
        await page.evaluate(() => (window as any).__TEST_SELECT_FACE?.(0, 0));
        await page.waitForFunction(() => (window as any).getSelectedFace?.() !== null);

        await page.getByTitle(/Extrude Face/).click();
        const panel = page.getByTestId('panel-extrudeFromFace');
        await expect(panel).toBeVisible();
        await panel.locator('button[type="submit"]', { hasText: /Extrude/i }).click();

        count = await getNextExecutionCount(page);
        await waitForStability(page, count);

        const updated = await page.evaluate(() => (window as any).getCode?.() || '');
        expect(updated).toContain('const shape');
        expect(updated).toMatch(/\.faces\[\d+\]/);
        expect(updated).toContain('.fuse(');

        // Regression guard: should not generate a detached plane+rect sketch fallback.
        expect(updated).not.toContain('new replicad.Plane(');
        expect(updated).not.toContain('.rect(10, 10)');

        // Return should be the fused result, not the original anonymous expression.
        expect(updated).not.toContain('return replicad.makeBox');
        expect(updated).toMatch(/return\s+[A-Za-z_$][\w$]*;/);
    });
});

