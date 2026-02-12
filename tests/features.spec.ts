import { test, expect } from '@playwright/test';

test.describe('CAD Features E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.waitForFunction(() => (window as any).isEditorReady === true);
    });

    test('Should create a Box primitive', async ({ page }) => {
        const boxBtn = page.getByTitle('Box');
        await expect(boxBtn).toBeVisible();
        await boxBtn.click();

        // Check for ParamDialog
        await expect(page.getByText('Box', { exact: true })).toBeVisible();
        await page.getByText('Insert').click();

        // Verify code update
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode());
        }).toContain('replicad.makeBox');
    });

    test('Should create a Cylinder primitive', async ({ page }) => {
        const cylBtn = page.getByTitle('Cylinder');
        await expect(cylBtn).toBeVisible();
        await cylBtn.click();

        // Check for ParamDialog
        await expect(page.getByText('Cylinder', { exact: true })).toBeVisible();
        await page.getByText('Insert').click();

        // Verify code update
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode());
        }).toContain('replicad.makeCylinder');
    });

    test('Should perform a Boolean Union (Join)', async ({ page }) => {
        // First inject two shapes
        const code = `
const box1 = replicad.makeBox(10, 10, 10);
const box2 = replicad.makeBox(10, 10, 10).translate(5, 5, 5);
return [box1, box2];
`;
        await page.evaluate((c) => (window as any).setCode(c), code);
        await page.waitForTimeout(1000);

        const joinBtn = page.getByTitle('Union');
        await expect(joinBtn).toBeVisible();
        await joinBtn.click();

        // Fill BooleanDialog
        await page.locator('#base-name').fill('box1');
        await page.locator('#tool-name').fill('box2');
        await page.locator('form button:has-text("Join")').click();

        // Verify code update
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode());
        }).toContain('box1.fuse(box2)');
    });

    test('Should perform a Boolean Cut', async ({ page }) => {
        const code = `
const box1 = replicad.makeBox(10, 10, 10);
const box2 = replicad.makeCylinder(5, 20);
return [box1, box2];
`;
        await page.evaluate((c) => (window as any).setCode(c), code);
        await page.waitForTimeout(1000);

        const cutBtn = page.getByTitle('Cut');
        await expect(cutBtn).toBeVisible();
        await cutBtn.click();

        // Fill BooleanDialog
        await page.locator('#base-name').fill('box1');
        await page.locator('#tool-name').fill('box2');
        await page.locator('form button:has-text("Cut")').click();

        // Verify code update
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).getCode());
        }).toContain('box1.cut(box2)');
    });
});
