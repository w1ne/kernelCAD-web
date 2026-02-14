import { test, expect } from '@playwright/test';

test('construction geometry - midplane and tangent plane', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Initialize
    page.on('console', msg => console.log(msg.text()));
    await page.goto('/');
    await page.waitForSelector('[data-testid="workbench-ready"]');
    // Wait for E2E globals
    await page.waitForFunction(() => typeof (window as any).openCommandPalette === 'function');

    const canvas = page.locator('[data-testid="viewer-container"] canvas');
    await expect(canvas).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(1000); // Wait for initialization

    // 2. Setup Scene: Box and Cylinder
    await page.evaluate(() => {
        (window as any).setCode(`
const box = replicad.makeBox(50, 50, 50);
const cyl = replicad.makeCylinder(20, 50).translate(100, 0, 0);
return [box, cyl];
`);
    });
    await page.waitForTimeout(2000); // Wait for execution

    // 3. MIDPLANE TEST
    // Open Midplane Panel (Command Palette)
    await page.evaluate(() => (window as any).openCommandPalette());
    const cmdInput = page.locator('[placeholder="Type a command or search..."]');
    await cmdInput.waitFor({ state: 'visible', timeout: 10000 });
    await cmdInput.type('Midplane');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Select two faces on the box (Shape 0)
    await page.evaluate(() => {
        (window as any).__TEST_SELECT_FACE(0, 0); // Face 0
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        (window as any).__TEST_SELECT_FACE(0, 1); // Face 1
    });
    await page.waitForTimeout(500);

    // Click "Create"
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(500);

    // Verify code insertion
    const code1 = await page.evaluate(() => (window as any).getCode());
    expect(code1).toContain('midplane');
    expect(code1).toContain('new replicad.Plane');

    // 4. TANGENT PLANE TEST
    // Clear selection implicitly by selecting new face or manually?
    // Actually, panel closes, selection might remain? No, selection is usually separate.
    // Panel logic for Tangent checks selectedFace.

    // Open Tangent Plane Panel
    await page.evaluate(() => (window as any).openCommandPalette());
    await cmdInput.waitFor({ state: 'visible', timeout: 5000 });
    await cmdInput.fill(''); // Clear previous input
    await cmdInput.type('Tangent Plane');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Select Hydro Cylinder face (Shape 1, Face 0 - typically cylindrical face)
    await page.evaluate(() => {
        (window as any).__TEST_SELECT_FACE(1, 0);
    });
    await page.waitForTimeout(2000);

    // Adjust angle slider (optional, default 0 is fine)

    // Click "Create"
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(500);

    // Verify code insertion
    const code2 = await page.evaluate(() => (window as any).getCode());
    expect(code2).toContain('tan_plane');
    expect(code2).toContain('new replicad.Plane');
});
