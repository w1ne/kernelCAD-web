import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached' });
    });

    test('should save and open project file', async ({ page }) => {
        // 1. Change the code via internal helper for stability
        const customCode = 'const box = show(makeBox(15, 15, 15));';
        await page.evaluate((code) => {
            (window as any).setCode(code);
        }, customCode);

        // Wait for computation spin to settle
        await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

        // 2. Export .kcad
        // Wait for a small debounce for auto-save before we reload
        await page.waitForTimeout(1500);

        // Wait for a small debounce if any, then click save
        const saveButton = page.getByRole('button', { name: 'Save Project' });
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 60000 }),
            saveButton.click()
        ]);

        expect(download.suggestedFilename()).toContain('.kcad');
        const path = await download.path();

        // 3. Clear workspace (refresh)
        await page.reload();
        await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached' });
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 10000 });

        // 4. Verify auto-load (since we refresh, auto-load from localStorage should kick in)
        // Note: Playwright's page.reload() preserves localStorage.
        await expect(page.locator('.monaco-editor')).toContainText('makeBox(15, 15, 15)');

        // 5. Explicitly Open .kcad
        // First clear localStorage and refresh to ensure we are at default
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached' });
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 10000 });
        await expect(page.locator('.monaco-editor')).not.toContainText('makeBox(15, 15, 15)');

        const openButton = page.getByRole('button', { name: 'Open Project' });
        const fileChooserPromise = page.waitForEvent('filechooser');
        await openButton.click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(path);

        // 6. Verify restored code
        await expect(page.locator('.monaco-editor')).toContainText('makeBox(15, 15, 15)');
    });

    test('should auto-save to localStorage', async ({ page }) => {
        // 1. Change code via internal helper
        const autoSaveCode = '// Auto-save test';
        await page.evaluate((code) => {
            (window as any).setCode(code);
        }, autoSaveCode);

        // 2. Wait for debounce (1s)
        await page.waitForTimeout(1500);

        // 3. Refresh
        await page.reload();
        await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached' });
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 10000 });

        // 4. Verify code is there
        await expect(page.locator('.monaco-editor')).toContainText('// Auto-save test');
    });
});
