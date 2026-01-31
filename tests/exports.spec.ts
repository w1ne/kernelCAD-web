import { test, expect } from '@playwright/test';

test.describe('Export Functionality E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.waitForFunction(() => (window as any).isEditorReady === true);
    });

    test('Should trigger STEP export', async ({ page }) => {
        const downloadPromise = page.waitForEvent('download');
        const exportBtn = page.getByTitle('Export STEP');
        await expect(exportBtn).toBeVisible();
        await exportBtn.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe('model.step');
    });

    test('Should trigger STL export', async ({ page }) => {
        const downloadPromise = page.waitForEvent('download');
        const exportBtn = page.getByTitle('Export STL');
        await expect(exportBtn).toBeVisible();
        await exportBtn.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe('model.stl');
    });
});
