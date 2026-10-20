import { expect, test, type Locator, type Page } from '@playwright/test';
import {
    edgeMidpoints,
    projectEdgesToCanvas,
    type CameraProbeState,
    type ProjectedEdge,
    type SerializedEdgeMesh,
} from './helpers/edgePickingProjection';

const script = 'examples/edge-picking.kcad.ts';

interface SelectionRead {
    ok: boolean;
    revision: number;
    selection: { kind?: string; stableId?: string; ref?: string } | null;
}

async function readSelection(page: Page, session: string): Promise<SelectionRead> {
    const response = await page.request.get(`/__kernelcad/selection?session=${encodeURIComponent(session)}`);
    if (!response.ok()) throw new Error(`Selection request failed: ${response.status()}`);
    return await response.json() as SelectionRead;
}

async function projectCurrentEdges(page: Page, canvas: Locator, session: string): Promise<ProjectedEdge[]> {
    const response = await page.request.get(`/__kernelcad/mesh?session=${encodeURIComponent(session)}`);
    if (!response.ok()) throw new Error(`Mesh request failed: ${response.status()}`);
    const mesh = await response.json() as { features?: SerializedEdgeMesh[] };
    const edgeFeature = [...(mesh.features ?? [])].reverse().find((feature) =>
        feature.edges && feature.edgeRanges && feature.edgeStableIds,
    );
    if (!edgeFeature) throw new Error('The current Studio mesh has no stable edge geometry.');

    await expect.poll(() => canvas.evaluate((element) => typeof (
        element as HTMLCanvasElement & { __kernelcadCameraProbe?: () => CameraProbeState }
    ).__kernelcadCameraProbe === 'function')).toBe(true);
    const camera = await canvas.evaluate((element) => (
        element as HTMLCanvasElement & { __kernelcadCameraProbe?: () => CameraProbeState }
    ).__kernelcadCameraProbe?.() ?? null);
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    if (!camera) throw new Error('Studio camera probe is unavailable in this local Playwright run.');
    return projectEdgesToCanvas(edgeMidpoints(edgeFeature), camera, bounds!);
}

test('clicking a BREP edge publishes its stable ref to the MCP selection session', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/studio?script=${encodeURIComponent(script)}`);
    await page.waitForSelector('[data-testid="workbench-ready"]');
    await expect(page.getByTestId('status-recompute-ms')).toBeVisible({ timeout: 60000 });
    await expect(page.getByTestId('status-bar').getByText('Ready', { exact: true })).toBeVisible({ timeout: 60000 });

    const agentPane = page.getByTestId('left-pane-agent');
    if (await agentPane.isVisible()) await agentPane.getByRole('button', { name: 'Close agent' }).click();
    const inspector = page.getByTestId('inspector');
    if (await inspector.getAttribute('data-open') === 'true') await page.getByTestId('toolbar-inspector').click();
    await expect(inspector).toHaveAttribute('data-open', 'false');

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await expect.poll(async () => (await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(700);

    const sessionToken = await page.evaluate(async (scriptPath) => {
        const response = await fetch(`/__kernelcad/session?script=${encodeURIComponent(scriptPath)}`);
        if (!response.ok) throw new Error(`Session request failed: ${response.status}`);
        return (await response.json() as { sessionToken: string }).sessionToken;
    }, script);
    const candidates = await projectCurrentEdges(page, canvas, sessionToken);
    expect(candidates.length).toBeGreaterThan(0);

    let matched: { expected: ProjectedEdge; selection: SelectionRead } | undefined;
    for (const candidate of candidates) {
        await page.mouse.move(candidate.point.x, candidate.point.y);
        await page.waitForTimeout(120);
        await page.mouse.click(candidate.point.x, candidate.point.y);
        await page.waitForTimeout(450);
        const selection = await readSelection(page, sessionToken);
        if (selection.selection?.kind === 'edge' && selection.selection.stableId === candidate.stableId) {
            matched = { expected: candidate, selection };
            break;
        }
    }

    expect(matched, 'a projected visible edge midpoint should select its own stable edge ID').toBeDefined();
    expect(matched!.selection.selection?.stableId).toBe(matched!.expected.stableId);
    expect(matched!.selection.selection?.ref).toMatch(
        new RegExp(`^@kc\\[[^/]+/edge/${matched!.expected.stableId}\\]$`),
    );
});
