// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { expect, test, type Page } from '@playwright/test';

const script = 'examples/edge-picking.kcad.ts';
const source = 'const body = box(10, 10, 10);\nreturn body;';
const demoDirectory = resolve(process.cwd(), 'docs/demos/edge-picking');
const mp4Path = resolve(demoDirectory, 'edge-picking.mp4');

interface PickedItem {
    kind: 'face' | 'edge';
    stableId?: string;
    ref?: string;
}

interface SelectionRead {
    ok: boolean;
    modelGeneration: number;
    selection: PickedItem | null;
    selections?: PickedItem[];
}

interface SurfaceBlendResult {
    ok: boolean;
    new_code?: string;
    operation?: 'fillet' | 'chamfer';
    sceneSummary?: { valid?: boolean | null; volume?: number | null };
    diagnostics?: unknown[];
}

interface SerializedEdgeMesh {
    volume?: number;
    edges?: number[];
    edgeRanges?: number[];
    edgeStableIds?: string[];
    transform?: number[];
}

interface CameraProbeState {
    viewMatrix: number[];
    projectionMatrix: number[];
}

interface ProjectedEdge {
    stableId: string;
    point: { x: number; y: number };
}

test.use({
    viewport: { width: 1280, height: 800 },
    video: { mode: 'on', size: { width: 1280, height: 800 } },
    // Match the hostname used by Vite's API base URL without requiring a
    // system DNS entry. This applies only to this opt-in Chromium capture.
    launchOptions: { args: ['--host-resolver-rules=MAP studio.test 127.0.0.1'] },
});

async function invokeMcpTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    const { callMcpTool } = await import('../src/agent/mcp/toolRegistry');
    return callMcpTool(name, input);
}

async function readMcpSelection(studioUrl: string, session: string): Promise<SelectionRead> {
    return await invokeMcpTool('get_selection', { studio_url: studioUrl, session }) as SelectionRead;
}

async function clickProjectedPoint(
    page: Page,
    point: ProjectedEdge['point'],
    modifiers: Array<'Alt' | 'Control' | 'ControlOrMeta' | 'Meta' | 'Shift'> = [],
): Promise<void> {
    await page.mouse.move(point.x, point.y);
    // HoverManager resolves edge-over-face priority on its animation frame.
    await page.waitForTimeout(120);
    await page.mouse.click(point.x, point.y, { modifiers });
    await page.waitForTimeout(450);
}

async function clickUntilTwoEdgesAreSelected(
    page: Page,
    candidates: ProjectedEdge[],
    studioUrl: string,
    session: string,
): Promise<{ selection: SelectionRead; first: PickedItem; second: PickedItem }> {
    let first: PickedItem | undefined;
    let firstPoint: ProjectedEdge['point'] | undefined;
    for (const candidate of candidates) {
        await clickProjectedPoint(page, candidate.point);
        const selection = await readMcpSelection(studioUrl, session);
        first = edgeItems(selection).find((item) => item.stableId === candidate.stableId && item.ref);
        if (first) {
            firstPoint = candidate.point;
            break;
        }
    }
    if (!first || !firstPoint) throw new Error('Could not pick a visible edge midpoint in Studio.');

    for (const candidate of candidates) {
        if (candidate.stableId === first.stableId) continue;
        await clickProjectedPoint(page, candidate.point, ['Shift']);
        let selection = await readMcpSelection(studioUrl, session);
        const selectedEdges = edgeItems(selection);
        const firstStillSelected = selectedEdges.find((item) => item.ref === first!.ref);
        const second = selectedEdges.find((item) => item.ref && item.ref !== first!.ref);
        if (firstStillSelected && second) return { selection, first, second };

        // A hidden/back edge or an adjacent face can win a projected overlap.
        // Restore the primary pick before trying the next real edge midpoint.
        await clickProjectedPoint(page, firstPoint);
        selection = await readMcpSelection(studioUrl, session);
        if (!edgeItems(selection).some((item) => item.ref === first!.ref)) {
            throw new Error('Studio did not restore the first edge after a modifier-click miss.');
        }
    }
    throw new Error('Shift-clicking projected edge midpoints did not add a second edge to Studio selection.');
}

function edgeItems(selection: SelectionRead): PickedItem[] {
    return (selection.selections ?? (selection.selection ? [selection.selection] : []))
        .filter((item) => item.kind === 'edge');
}

function edgeMidpoints(feature: SerializedEdgeMesh): Array<{ stableId: string; point: THREE.Vector3 }> {
    const edges = feature.edges;
    const ranges = feature.edgeRanges;
    const stableIds = feature.edgeStableIds;
    if (!edges || !ranges || !stableIds) return [];
    const transform = feature.transform ? new THREE.Matrix4().fromArray(feature.transform) : null;
    const midpoints: Array<{ stableId: string; point: THREE.Vector3 }> = [];
    stableIds.forEach((stableId, edgeIndex) => {
        const start = ranges[edgeIndex * 2];
        const count = ranges[edgeIndex * 2 + 1];
        if (start === undefined || count === undefined || count < 2) return;
        const points: THREE.Vector3[] = [];
        for (let vertex = start; vertex < start + count; vertex += 1) {
            const x = edges[vertex * 3];
            const y = edges[vertex * 3 + 1];
            const z = edges[vertex * 3 + 2];
            if (x === undefined || y === undefined || z === undefined) return;
            points.push(new THREE.Vector3(x, y, z));
        }
        const lengths = points.slice(1).map((point, index) => point.distanceTo(points[index]!));
        const halfLength = lengths.reduce((sum, length) => sum + length, 0) / 2;
        let traversed = 0;
        let midpoint = points[0]!.clone();
        for (let segment = 0; segment < lengths.length; segment += 1) {
            const length = lengths[segment]!;
            if (traversed + length >= halfLength) {
                midpoint = points[segment]!.clone().lerp(points[segment + 1]!, length > 0 ? (halfLength - traversed) / length : 0);
                break;
            }
            traversed += length;
        }
        if (transform) midpoint.applyMatrix4(transform);
        midpoints.push({ stableId, point: midpoint });
    });
    return midpoints;
}

function projectEdgesToCanvas(
    edges: Array<{ stableId: string; point: THREE.Vector3 }>,
    camera: CameraProbeState,
    rect: { x: number; y: number; width: number; height: number },
): ProjectedEdge[] {
    const viewProjection = new THREE.Matrix4().fromArray(camera.projectionMatrix)
        .multiply(new THREE.Matrix4().fromArray(camera.viewMatrix));
    return edges.flatMap(({ stableId, point }) => {
        const clip = new THREE.Vector4(point.x, point.y, point.z, 1).applyMatrix4(viewProjection);
        if (clip.w <= 0) return [];
        const ndcZ = clip.z / clip.w;
        if (ndcZ < -1 || ndcZ > 1) return [];
        const x = rect.x + ((clip.x / clip.w + 1) / 2) * rect.width;
        const y = rect.y + ((1 - clip.y / clip.w) / 2) * rect.height;
        if (x < rect.x + 24 || x > rect.x + rect.width - 24 || y < rect.y + 52 || y > rect.y + rect.height - 52) return [];
        return [{ stableId, point: { x, y } }];
    }).sort((left, right) => {
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        return Math.hypot(left.point.x - centerX, left.point.y - centerY)
            - Math.hypot(right.point.x - centerX, right.point.y - centerY);
    });
}

async function waitForStudio(page: Page, waitForModel = true): Promise<void> {
    await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.monaco-editor .view-lines')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('canvas').first()).toBeVisible();
    if (waitForModel) await waitForModelReady(page);
}

async function waitForModelReady(page: Page): Promise<void> {
    // Older editor/geometry window hooks are declared but not installed here.
    // The footer exposes completed recomputes and the current build state.
    await expect(page.getByTestId('status-recompute-ms')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('status-bar').getByText('Ready', { exact: true }))
        .toBeVisible({ timeout: 90_000 });
}

async function replaceEditorSource(page: Page, code: string): Promise<void> {
    await page.locator('.monaco-editor .view-line').first().click();
    const isMac = await page.evaluate(() => /Mac/.test(navigator.userAgent));
    await page.keyboard.press(isMac ? 'Meta+A' : 'Control+A');
    await page.keyboard.type(code, { delay: 2 });
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('fillet', { timeout: 30_000 });
    const status = page.getByTestId('status-bar');
    await expect(status.getByText('Computing...', { exact: true })).toBeVisible({ timeout: 30_000 });
    await waitForModelReady(page);
}

async function showCapturePanel(page: Page, title: string, payload: unknown): Promise<void> {
    await page.evaluate(({ panelTitle, panelPayload }) => {
        let panel = document.getElementById('edge-picking-capture-panel');
        if (!panel) {
            panel = document.createElement('section');
            panel.id = 'edge-picking-capture-panel';
            panel.className = 'fixed bottom-8 right-4 z-[9999] max-w-[38rem] max-h-[18rem] overflow-auto rounded-lg border border-border bg-panel p-3 font-mono text-xs text-fg shadow-xl';
            document.body.append(panel);
        }
        const heading = document.createElement('h2');
        heading.className = 'mb-2 font-semibold text-fg';
        heading.textContent = panelTitle;
        const result = document.createElement('pre');
        result.className = 'whitespace-pre-wrap text-fg-2';
        result.textContent = JSON.stringify(panelPayload, null, 2);
        panel.replaceChildren(heading, result);
    }, { panelTitle: title, panelPayload: payload });
}

test.describe('Opt-in edge picking capture', () => {
    test.skip(process.env.KCAD_CAPTURE !== '1', 'run only with npm run capture:edge-picking');

    test('captures Studio edge multi-pick, MCP blend, and the updated model', async ({ page }, testInfo) => {
        test.setTimeout(240_000);
        const video = page.video();
        let verification: Record<string, unknown> | null = null;
        const temporaryWebmPath = resolve(testInfo.outputDir, 'edge-picking.capture.webm');
        const temporaryMp4Path = resolve(testInfo.outputDir, 'edge-picking.capture.mp4');
        mkdirSync(demoDirectory, { recursive: true });
        // A previous failed run must never leave a deliverable-looking MP4.
        rmSync(mp4Path, { force: true });
        rmSync(resolve(demoDirectory, 'edge-picking.webm'), { force: true });

        try {
            await page.setViewportSize({ width: 1280, height: 800 });
            const configuredBaseUrl = testInfo.project.use.baseURL;
            const studioUrl = new URL(typeof configuredBaseUrl === 'string' ? configuredBaseUrl : 'http://127.0.0.1:5173');
            const studioOrigin = studioUrl.origin;
            // Browser requests use studio.test (resolved by Chromium above),
            // while MCP tools and APIRequestContext run in Node and use IPv4.
            const studioApiUrl = new URL(studioOrigin);
            if (studioApiUrl.hostname === 'studio.test') studioApiUrl.hostname = '127.0.0.1';
            const studioApiOrigin = studioApiUrl.origin;
            const viewerUrl = new URL('/studio', studioOrigin);
            viewerUrl.searchParams.set('script', script);
            // The source route gets the session-backed model used by MCP picks.
            await page.goto(viewerUrl.toString());
            await waitForStudio(page);

            const agentPane = page.getByTestId('left-pane-agent');
            if (await agentPane.isVisible()) await agentPane.getByRole('button', { name: 'Close agent' }).click();
            const inspector = page.getByTestId('inspector');
            if (await inspector.getAttribute('data-open') === 'true') await page.getByTestId('toolbar-inspector').click();
            await expect(inspector).toHaveAttribute('data-open', 'false');
            const canvas = page.locator('canvas').first();
            await expect.poll(async () => (await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(700);
            await page.waitForTimeout(250);

            const sessionUrl = new URL('/__kernelcad/session', studioApiOrigin);
            sessionUrl.searchParams.set('script', script);
            const sessionResponse = await page.request.get(sessionUrl.toString());
            expect(sessionResponse.ok()).toBe(true);
            const { sessionToken } = await sessionResponse.json() as { sessionToken: string };

            const meshUrl = new URL('/__kernelcad/mesh', studioApiOrigin);
            meshUrl.searchParams.set('session', sessionToken);
            const meshResponse = await page.request.get(meshUrl.toString());
            expect(meshResponse.ok()).toBe(true);
            const mesh = await meshResponse.json() as { features?: SerializedEdgeMesh[] };
            const volumeBefore = mesh.features?.at(-1)?.volume;
            expect(volumeBefore).toBeGreaterThan(0);
            const bounds = await canvas.boundingBox();
            expect(bounds).not.toBeNull();
            await expect.poll(async () => canvas.evaluate((element) => typeof (
                element as HTMLCanvasElement & { __kernelcadCameraProbe?: () => CameraProbeState }
            ).__kernelcadCameraProbe === 'function')).toBe(true);
            const camera = await canvas.evaluate((element) => (
                element as HTMLCanvasElement & { __kernelcadCameraProbe?: () => CameraProbeState }
            ).__kernelcadCameraProbe?.() ?? null);
            if (!camera) throw new Error('Studio camera probe is unavailable in this local capture.');
            const edgeFeature = [...(mesh.features ?? [])].reverse().find((feature) =>
                feature.edges && feature.edgeRanges && feature.edgeStableIds,
            );
            if (!edgeFeature) throw new Error('The current Studio mesh has no stable edge geometry.');
            const candidates = projectEdgesToCanvas(edgeMidpoints(edgeFeature), camera, bounds!);
            if (candidates.length === 0) throw new Error('No stable edge midpoint projects into the visible Studio canvas.');
            const picked = await clickUntilTwoEdgesAreSelected(page, candidates, studioApiOrigin, sessionToken);
            const { selection, first: firstEdge, second: secondEdge } = picked;
            expect(firstEdge.ref).toMatch(/^@kc\[[^/]+\/edge\/s[0-9a-f]{16}\]$/);
            expect(secondEdge.ref).toMatch(/^@kc\[[^/]+\/edge\/s[0-9a-f]{16}\]$/);
            const pickedEdges = edgeItems(selection).filter((item) => item.ref === firstEdge.ref || item.ref === secondEdge.ref);
            expect(pickedEdges.some((item) => item.ref === firstEdge.ref)).toBe(true);
            expect(pickedEdges.some((item) => item.ref === secondEdge.ref)).toBe(true);

            // Request the shared-selection endpoint directly and display its
            // actual response while keeping the picked model visible.
            const selectionUrl = new URL('/__kernelcad/selection', studioApiOrigin);
            selectionUrl.searchParams.set('session', sessionToken);
            const endpointResponse = await page.request.get(selectionUrl.toString());
            expect(endpointResponse.ok()).toBe(true);
            const endpointSelection = await endpointResponse.json() as SelectionRead;
            expect(edgeItems(endpointSelection).map((item) => item.ref)).toEqual(pickedEdges.map((item) => item.ref));
            await showCapturePanel(page, 'GET /__kernelcad/selection', {
                ok: endpointSelection.ok,
                modelGeneration: endpointSelection.modelGeneration,
                selection: endpointSelection.selection,
                selections: endpointSelection.selections,
            });
            await page.waitForTimeout(1500);

            const refs = pickedEdges.map((item) => item.ref!);
            const blend = await invokeMcpTool('apply_surface_blend', {
                code: source,
                shape_binding: 'body',
                radius: 1,
                selector: refs,
            }) as SurfaceBlendResult;
            const volumeAfter = blend.sceneSummary?.volume;
            expect(blend.ok).toBe(true);
            expect(blend.operation).toBe('fillet');
            expect(blend.sceneSummary?.valid).toBe(true);
            expect(volumeAfter).toBeLessThan(volumeBefore!);
            expect(blend.new_code).toContain(refs[0]!);
            expect(blend.new_code).toContain(refs[1]!);

            // Keep the endpoint payload beside the real MCP result in-frame.
            await showCapturePanel(page, 'MCP selection → apply_surface_blend', {
                selectionEndpoint: {
                    ok: endpointSelection.ok,
                    selection: endpointSelection.selection,
                    selections: endpointSelection.selections,
                },
                blend: {
                    operation: blend.operation,
                    radius: 1,
                    edgeRefs: refs,
                    volumeBefore,
                    volumeAfter,
                    valid: blend.sceneSummary?.valid,
                },
            });
            await page.waitForTimeout(1500);

            // Reopen the edited source in the normal local Studio path, then
            // apply the MCP-generated source through the editor like a user.
            await page.goto(new URL('/studio', studioOrigin).toString());
            await waitForStudio(page, false);
            await replaceEditorSource(page, blend.new_code!);
            await page.waitForTimeout(2500);

            verification = {
                environment: 'local Studio + MCP, captured by Playwright',
                script,
                operation: 'fillet',
                radius: 1,
                selectedEdges: refs,
                valid: blend.sceneSummary?.valid,
                beforeVolume: volumeBefore,
                afterVolume: volumeAfter,
                outputSource: 'apply_surface_blend MCP result shown in Studio',
                video: 'edge-picking.mp4',
            };
        } finally {
            await page.close().catch(() => undefined);
        }

        // Encode and publish only after every workflow assertion above succeeds.
        if (!video || !verification) throw new Error('Capture completed without video or workflow verification.');
        try {
            await video.saveAs(temporaryWebmPath);
            execFileSync('/opt/homebrew/bin/ffmpeg', [
                '-y', '-i', temporaryWebmPath, '-movflags', '+faststart', '-pix_fmt', 'yuv420p', temporaryMp4Path,
            ], { stdio: 'inherit' });
            execFileSync('/opt/homebrew/bin/ffmpeg', ['-v', 'error', '-i', temporaryMp4Path, '-f', 'null', '-'], { stdio: 'inherit' });
            writeFileSync(resolve(demoDirectory, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);
            renameSync(temporaryMp4Path, mp4Path);
        } catch (error) {
            rmSync(mp4Path, { force: true });
            throw error;
        } finally {
            rmSync(temporaryWebmPath, { force: true });
            rmSync(temporaryMp4Path, { force: true });
        }
    });
});
