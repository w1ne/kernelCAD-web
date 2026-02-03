import { test, expect } from '@playwright/test';

test('Reproduction: Sketch on Filleted Face', async ({ page }) => {
    // 1. Load Application
    await page.goto('/');
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // 2. Define User's Scenario
    // Based on user screenshot: Sketch -> Extrude -> Fillet -> SketchOnFace -> Extrude
    // Using simple geometry to ensure face existence
    const code = `
const { Sketcher } = replicad;

function drawPart() {
    // Base block
    const base = new Sketcher()
        .hLine(40)
        .vLine(40)
        .hLine(-40)
        .close()
        .extrude(30);
    
    // Fillet edges - this changes face topology/indexing
    const filleted = base.fillet(2);
    
    // Try to sketch on top face (approx Z=30)
    // We iterate faces to find one with normal roughly (0,0,1)
    // Or we rely on face index 5 or 12 as user did (which is flaky)
    
    // Let's force a failure by trying to sketch on a non-planar face if possible
    // or iterate faces to find a cylindrical one
    
    let targetFaceIndex = 5; // Default Top
    
    // In the user's code, they used 12. Let's try to simulate finding a "hard" face or just use 12
    // If we can't inspect valid faces from here easily without running code in browser...
    // We'll stick to 12 as per user screenshot which might be the fillet.
    targetFaceIndex = 12;

    const sketch = sketchOnFace(filleted, targetFaceIndex);
    
    if (!sketch) throw new Error("Could not create sketch on face");

    // Draw on it
    const circle = sketch.circle(5);
    
    // Extrude
    const boss = extrude(circle, 10);
    
    return filleted.fuse(boss);
}

return drawPart();
`;

    // 3. Inject Code
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(code);

    // 4. Wait for Computation
    await page.waitForTimeout(500);
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // 5. Verification
    const consoleMessages: string[] = [];
    const errors: string[] = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(`[${msg.type()}] ${text}`);
        if (msg.type() === 'error') errors.push(text);
    });

    // Verify visual result
    await expect(page.locator('canvas').first()).toBeVisible();

    // Check for "Sketch has no wire" or other worker errors
    const logs = consoleMessages.join('\n');

    // We expect a specific user-friendly error now
    if (logs.includes('Cannot sketch on non-planar face')) {
        console.log("SUCCESS: Caught expected error for curved face sketching.");
        return; // Test passes if we catch the right error
    }

    if (logs.includes('Sketch has no wire') || logs.includes('Error executing')) {
        console.error("FAILURE LOGS:", logs);
        throw new Error("Worker reported error or invalid sketch (but not the expected one)");
    }

    // Check for explicit errors (excluding harmless dev mode warnings)
    const realErrors = errors.filter(e => !e.includes('Lit is in dev mode'));
    expect(realErrors).toEqual([]);
});
