// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { evaluateScriptTool } from './evaluateScript';
import { callMcpTool } from '../toolRegistry';
import { closeMcpViewer } from '../liveViewer';

let dist: string;
beforeAll(async () => {
  dist = await mkdtemp(join(tmpdir(), 'kcad-eval-viewer-'));
  await writeFile(join(dist, 'index.html'), '<html>Studio</html>');
  vi.stubEnv('KERNELCAD_VIEWER_DIST', dist);
});
afterAll(async () => { await closeMcpViewer(); vi.unstubAllEnvs(); await rm(dist, { recursive: true, force: true }); });
function api(link: string, route: string) { const url = new URL(link); url.pathname = `/__kernelcad/${route}`; return url; }

describe('evaluate_script live viewer', () => {
  it('returns a live link on the first build and replaces real geometry on the next build', async () => {
    const first = await evaluateScriptTool({ code: 'return box(10, 10, 10);' });
    expect(first.ok).toBe(true);
    expect(first.viewerUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//);
    const mesh1 = await (await fetch(api(first.viewerUrl!, 'mesh'))).json();
    expect(mesh1.features.at(-1).volume).toBeCloseTo(1000);
    const second = await evaluateScriptTool({ code: 'return box(20, 10, 10);' });
    expect(second.viewerUrl).toBe(first.viewerUrl);
    const mesh2 = await (await fetch(api(second.viewerUrl!, 'mesh'))).json();
    expect(mesh2.features.at(-1).volume).toBeCloseTo(2000);
    expect(await (await fetch(api(first.viewerUrl!, 'source'))).json()).toEqual({ source: 'return box(20, 10, 10);' });
  });
  it('returns the same link from later MCP source-edit results', async () => {
    const code = "const width = param('width', 10); return box(width, 10, 10);";
    const first = await callMcpTool('evaluate_script', { code }) as { viewerUrl: string };
    const edited = await callMcpTool('set_param', { code, param_name: 'width', new_value: 20 }) as { ok: boolean; viewerUrl: string };
    expect(edited.ok).toBe(true);
    expect(edited.viewerUrl).toBe(first.viewerUrl);
    expect((await (await fetch(api(first.viewerUrl, 'source'))).json()).source).toContain("param('width', 20)");
  });
  it('does not replace the viewer on dry runs or genuine build failures', async () => {
    const first = await evaluateScriptTool({ code: 'return box(10, 10, 10);' });
    const dry = await evaluateScriptTool({ code: 'return box(50, 10, 10);', dryRun: true });
    expect(dry.viewerUrl).toBeUndefined();
    const failed = await evaluateScriptTool({ code: 'throw new Error("failed step");' });
    expect(failed.ok).toBe(false);
    expect(failed.viewerUrl).toBeUndefined();
    expect(await (await fetch(api(first.viewerUrl!, 'source'))).json()).toEqual({ source: 'return box(10, 10, 10);' });
    const recovered = await evaluateScriptTool({ code: 'return box(30, 10, 10);' });
    expect(recovered.viewerUrl).toBe(first.viewerUrl);
  });
  it('returns a link for built geometry even when a DFM gate fails', async () => {
    const result = await evaluateScriptTool({ code: "dfmSpec({ minWall: 1.5 }); return box(20, 20, 1);" });
    expect(result.ok).toBe(false);
    expect(result.viewerUrl).toBeDefined();
  });
  it('keeps successful CAD results when viewer provisioning fails', async () => {
    await closeMcpViewer();
    vi.stubEnv('KERNELCAD_VIEWER_DIST', '/missing-viewer-assets');
    const result = await evaluateScriptTool({ code: 'return box(10, 10, 10);' });
    expect(result.ok).toBe(true);
    expect(result.viewerUrl).toBeUndefined();
    expect(result.viewerError).toContain('build:mcp-viewer');
    vi.stubEnv('KERNELCAD_VIEWER_DIST', dist);
  });
});
