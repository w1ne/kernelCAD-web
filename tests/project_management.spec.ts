import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached' });
    });

    test('should create and switch projects while preserving code', async ({ page }) => {
        // 1. Change active project code
        const customCode = 'const box = replicad.makeBox(15, 15, 15); return box;';
        await page.evaluate((code) => {
            (window as any).setCode(code);
        }, customCode);

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode?.() || '');
        }).toContain('makeBox(15, 15, 15)');

        // Allow debounced autosave to persist into the active project snapshot.
        await page.waitForTimeout(1500);

        // 2. Open project manager and create a new project.
        await page.getByRole('button', { name: 'Untitled Project' }).click();
        await expect(page.getByRole('heading', { name: 'Project Manager' })).toBeVisible();
        await page.getByRole('button', { name: 'Create New Project' }).click();

        // New project should start with default code.
        await expect(page.locator('.monaco-editor')).not.toContainText('makeBox(15, 15, 15)');

        // 3. Switch back to the previous project from the manager dialog.
        await page.getByRole('button', { name: 'Switch' }).first().click();

        // 4. Previous project code should be restored.
        await expect(page.locator('.monaco-editor')).toContainText('makeBox(15, 15, 15)');
    });

    test('should auto-save to localStorage', async ({ page }) => {
        // 1. Change code via internal helper
        const autoSaveCode = '// Auto-save test';
        await page.evaluate((code) => {
            (window as any).setCode(code);
        }, autoSaveCode);

        // 2. Wait for debounce (1s) + buffer
        await page.waitForTimeout(2500);

        // 3. Refresh
        await page.reload();
        await page.waitForSelector('[data-testid="workbench-ready"]', { state: 'attached' });
        await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 10000 });

        // 4. Verify code is there
        await expect(page.locator('.monaco-editor')).toContainText('// Auto-save test');
    });
});
