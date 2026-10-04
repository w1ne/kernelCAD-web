// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/mcp/renderPreviewPublish.test.ts
//
// render_preview preset: 'publish' — browser-free via the tool's deps seam.
// Asserts the preset's parameters reach the renderer (stage spec, hero
// pose, default size) and that the preset-only fields are validated.
import { describe, it, expect, afterEach } from 'vitest';
import { rm } from 'node:fs/promises';
import sharp from 'sharp';
import { PUBLISH_HERO_NAME, renderPreviewTool, type RenderPreviewDeps } from '../../../src/agent/mcp/tools/renderPreview';
import type { HeadlessRenderOpts, HeadlessRenderResult } from '../../../src/agent/render/headlessRender';
import { PUBLISH_PRESET } from '../../../src/shared/render/publishPreset';
import { getToolDefinition } from '../../../src/agent/mcp/toolRegistry';

const tmpDirs: string[] = [];
afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

const CODE = 'return box(10, 10, 10);';

function recordingDeps(): { deps: RenderPreviewDeps; calls: HeadlessRenderOpts[] } {
  const calls: HeadlessRenderOpts[] = [];
  const deps: RenderPreviewDeps = {
    render: async (opts): Promise<HeadlessRenderResult> => {
      calls.push(opts);
      const tile = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
      const pngsByView: HeadlessRenderResult['pngsByView'] = {};
      for (const v of opts.views ?? []) pngsByView[v] = tile;
      const pngsByPose: Record<string, Buffer> = {};
      for (const p of opts.poses ?? []) pngsByPose[p] = tile;
      return { pngsByView, pngsByPose, bounds: { min: [0, 0, 0], max: [10, 10, 10] } };
    },
    resolveBaseUrl: async () => ({ baseUrl: 'http://127.0.0.1:1', source: 'static-player', close: async () => undefined }),
    mechanismProbe: async () => ({ mechanism: 'unverified', failures: [] }),
  };
  return { deps, calls };
}

describe("render_preview preset: 'publish'", () => {
  it('renders ONE hero image at the 3/4 hero pose, 1600×1200, white backdrop + shadow', async () => {
    const { deps, calls } = recordingDeps();
    const r = await renderPreviewTool({ code: CODE, preset: 'publish' }, deps);
    if (r.out_dir) tmpDirs.push(r.out_dir);
    expect(r.ok, r.error).toBe(true);
    expect(calls).toHaveLength(1);
    const opts = calls[0];
    expect(opts.publish).toEqual({ background: '#ffffff', shadow: true });
    expect(opts.views).toEqual([]);
    expect(opts.poses).toEqual([`${PUBLISH_PRESET.heroAzDeg},${PUBLISH_PRESET.heroElDeg}`]);
    expect([opts.viewportWidth, opts.viewportHeight]).toEqual([1600, 1200]);
    expect(r.images.map((i) => i.name)).toEqual([PUBLISH_HERO_NAME]);
    expect(r.images[0].path.endsWith('/hero.png')).toBe(true);
  });

  it('forwards transparent background, shadow: false and a 2048 px size', async () => {
    const { deps, calls } = recordingDeps();
    const r = await renderPreviewTool(
      { code: CODE, preset: 'publish', background: 'transparent', shadow: false, width: 2048, height: 2048 },
      deps,
    );
    if (r.out_dir) tmpDirs.push(r.out_dir);
    expect(r.ok, r.error).toBe(true);
    expect(calls[0].publish).toEqual({ background: 'transparent', shadow: false });
    expect([calls[0].viewportWidth, calls[0].viewportHeight]).toEqual([2048, 2048]);
  });

  it('explicit views / pose still work under the preset (no hero substitution)', async () => {
    const { deps, calls } = recordingDeps();
    const r = await renderPreviewTool({ code: CODE, preset: 'publish', views: ['front'], pose: '120,15' }, deps);
    if (r.out_dir) tmpDirs.push(r.out_dir);
    expect(r.ok, r.error).toBe(true);
    expect(calls[0].views).toEqual(['front']);
    expect(calls[0].poses).toEqual(['120,15']);
    expect(r.images.map((i) => i.name)).toEqual(['front', 'pose 120,15']);
  });

  it('the default preset is unchanged: four views, 768², no publish stage', async () => {
    const { deps, calls } = recordingDeps();
    const r = await renderPreviewTool({ code: CODE }, deps);
    if (r.out_dir) tmpDirs.push(r.out_dir);
    expect(r.ok, r.error).toBe(true);
    expect(calls[0].publish).toBeUndefined();
    expect(calls[0].views).toEqual(['front', 'right', 'top', 'iso']);
    expect([calls[0].viewportWidth, calls[0].viewportHeight]).toEqual([768, 768]);
  });

  it('refuses an unknown preset, a bad background, and publish-only fields without the preset', async () => {
    const { deps, calls } = recordingDeps();
    const bad = [
      await renderPreviewTool({ code: CODE, preset: 'glossy' as never }, deps),
      await renderPreviewTool({ code: CODE, preset: 'publish', background: 'chartreuse-ish' }, deps),
      await renderPreviewTool({ code: CODE, background: 'white' }, deps),
      await renderPreviewTool({ code: CODE, shadow: false }, deps),
    ];
    for (const r of bad) {
      expect(r.ok).toBe(false);
      expect(r.errorCode).toBe('cli.invalid-args');
      expect(r.errorHint).toBeTruthy();
    }
    expect(calls).toHaveLength(0);
  });

  it('is advertised on the registry schema', () => {
    const def = getToolDefinition('render_preview')!;
    const props = (def.inputSchema as { properties: Record<string, unknown> }).properties;
    expect(props.preset).toMatchObject({ enum: ['default', 'publish'] });
    expect(props.background).toBeDefined();
    expect(props.shadow).toBeDefined();
    expect(def.description).toContain("preset: 'publish'");
  });
});
