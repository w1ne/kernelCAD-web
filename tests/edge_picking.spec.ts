import { expect, test } from '@playwright/test';

const script = 'examples/edge-picking.kcad.ts';

test('clicking a BREP edge publishes its stable ref to the MCP selection session', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`/studio?script=${encodeURIComponent(script)}`);
    await page.waitForSelector('[data-testid="workbench-ready"]');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const sessionToken = await page.evaluate(async (scriptPath) => {
        const response = await fetch(`/__kernelcad/session?script=${encodeURIComponent(scriptPath)}`);
        if (!response.ok) throw new Error(`Session request failed: ${response.status}`);
        return (await response.json() as { sessionToken: string }).sessionToken;
    }, script);

    await expect.poll(async () => {
        const response = await page.request.get(`/__kernelcad/mesh?session=${encodeURIComponent(sessionToken)}`);
        if (!response.ok) return false;
        const mesh = await response.json() as { features?: Array<{ edgeStableIds?: string[]; edgeRanges?: number[] }> };
        return mesh.features?.some(feature => (feature.edgeStableIds?.length ?? 0) > 0
            && (feature.edgeRanges?.length ?? 0) > 0) ?? false;
    }, { timeout: 60000 }).toBe(true);

    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.click(bounds!.x + bounds!.width * 0.5, bounds!.y + bounds!.height * 0.61);

    await expect.poll(async () => {
        const response = await page.request.get(`/__kernelcad/selection?session=${encodeURIComponent(sessionToken)}`);
        if (!response.ok) return null;
        const result = await response.json() as { selection?: { kind?: string } | null };
        return result.selection?.kind ?? null;
    }, { timeout: 15000 }).toBe('edge');

    const response = await page.request.get(`/__kernelcad/selection?session=${encodeURIComponent(sessionToken)}`);
    const result = await response.json() as { selection: { stableId?: string; ref?: string } };
    expect(result.selection.stableId).toMatch(/^s[0-9a-f]{16}$/);
    expect(result.selection.ref).toMatch(/^@kc\[[^/]+\/edge\/s[0-9a-f]{16}\]$/);
});
