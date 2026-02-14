import { test, expect } from '@playwright/test';

test.describe('Export Functionality E2E', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.waitForFunction(() => (window as any).isEditorReady === true);
        await page.waitForFunction(() => (window as any).isEngineReady === true);
        await page.waitForFunction(() => (window as any).isComputing?.() === false);
        await page.evaluate(() => {
            (window as any).setCode?.('const model = replicad.makeBox(20, 20, 20); return model;');
        });
        await page.waitForFunction(() => ((window as any).getGeometries?.() || []).length > 0);
    });

    test('Should trigger STEP export', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).__TEST_EXPORT = { href: null, download: null, blob: null };
            const originalCreateObjectURL = URL.createObjectURL.bind(URL);
            URL.createObjectURL = (blob: Blob) => {
                (window as any).__TEST_EXPORT.blob = { size: blob.size, type: blob.type };
                return originalCreateObjectURL(blob);
            };
            const originalClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function () {
                (window as any).__TEST_EXPORT.href = (this as HTMLAnchorElement).href;
                (window as any).__TEST_EXPORT.download = (this as HTMLAnchorElement).download;
                return originalClick.call(this);
            };
        });

        const exportBtn = page.getByTitle('Export STEP');
        await expect(exportBtn).toBeVisible();
        await expect(exportBtn).toBeEnabled();
        await exportBtn.click();

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).__TEST_EXPORT?.download || null);
        }, { timeout: 60000 }).toMatch(/\.step$/);
    });

    test('Should trigger STL export', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).__TEST_EXPORT = { href: null, download: null, blob: null };
            const originalCreateObjectURL = URL.createObjectURL.bind(URL);
            URL.createObjectURL = (blob: Blob) => {
                (window as any).__TEST_EXPORT.blob = { size: blob.size, type: blob.type };
                return originalCreateObjectURL(blob);
            };
            const originalClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function () {
                (window as any).__TEST_EXPORT.href = (this as HTMLAnchorElement).href;
                (window as any).__TEST_EXPORT.download = (this as HTMLAnchorElement).download;
                return originalClick.call(this);
            };
        });

        const exportBtn = page.getByTitle('Export STL');
        await expect(exportBtn).toBeVisible();
        await expect(exportBtn).toBeEnabled();
        await exportBtn.click();

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).__TEST_EXPORT?.download || null);
        }, { timeout: 60000 }).toMatch(/\.stl$/);
    });
});
