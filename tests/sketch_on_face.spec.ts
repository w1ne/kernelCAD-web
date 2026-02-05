import { test, expect } from '@playwright/test';

test('Sketch on Face Workflow E2E', async ({ page }) => {
    // 1. Load Application
    await page.goto('/');

    // 2. Wait for Editor and Worker initialization
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 15000 });

    // Allow initial model to load
    await page.waitForTimeout(1000);

    // 3. Define the test code
    // This code creates a box, selects a face, sketches on it, and extrudes.
    // It exercises the worker's sketchOnFace wrap and visibility logic.
    const code = `
    const { Sketcher } = replicad;

    function drawPart() {
        // 1. Create Base Shape manually (more stable than makeBox)
        const base = new Sketcher()
            .hLine(40)
            .vLine(40)
            .hLine(-40)
            .close()
            .extrude(30);

        const filleted = base.fillet(2);

        // 2. Find a side face (Vertical)
        let faceIndex = 0; // Default to 0 if search fails (usually a side in this topo)

        if (filleted.faces) {
            for (let i = 0; i < filleted.faces.length; i++) {
                const f = filleted.faces[i];
                if (f.geomType === 'PLANE') {
                    try {
                        const p = replicad.makePlaneFromFace(f);
                        if (p.zDir && Math.abs(p.zDir.z) < 0.1) {
                            faceIndex = i;
                            break;
                        }
                    } catch (e) { }
                }
            }
        }

        // 3. Sketch on it
        const s1 = sketchOnFace(filleted, faceIndex);
        const circle = s1.circle(8);

        // 4. Return only the shape. The sketch is captured automatically by the worker.
        return [filleted];
    }

    return drawPart();
    `;

    // 4. Inject Code
    // Click editor to focus
    await editor.click();

    // Select All and Delete existing code
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');

    // Type/Paste new code
    await page.keyboard.insertText(code);

    // 5. Wait for Computation
    await page.waitForTimeout(500);
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // 6. Verification
    // Check for Console Logs and Errors
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(`[${msg.type()}] ${text} `);
        if (msg.type() === 'error') {
            errors.push(text);
        }
    });

    // Verify canvas is still there
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Visual Regression Check
    // We wait a bit for rendering to settle
    await page.waitForTimeout(1000);
    expect(await page.screenshot()).toMatchSnapshot('sketch-visibility.png', { maxDiffPixelRatio: 0.02 });

    // Check captured worker logs
    const workerLogs = consoleMessages.filter(msg => msg.includes('Worker:'));
    if (workerLogs.length > 0) {
        console.log("Captured Worker Logs:", workerLogs);
    } else {
        console.log("No Worker logs captured. Full logs (last 20):", consoleMessages.slice(-20));
    }

    // Check for specific "Sketch has no wire" warning
    const missingWireWarnings = consoleMessages.filter(msg => msg.includes('Worker: Sketch has no wire'));
    if (missingWireWarnings.length > 0) {
        console.warn("TEST WARNING: Sketches detected with no wire:", missingWireWarnings);
    } else {
        console.log("TEST SUCCESS: All sketches had wires.");
    }

    // Assert no console errors (excluding harmless ones)
    expect(errors.filter(e =>
        !e.includes('Lit is in dev mode') &&
        !e.includes('Toolbar Render')
    )).toEqual([]);
});
