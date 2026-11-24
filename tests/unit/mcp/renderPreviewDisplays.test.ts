// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/mcp/renderPreviewDisplays.test.ts
//
// render_preview displays / indicators (browser-free):
//   - image resolution to data URLs (PNG file on disk, inline data URI, and
//     refusals for corrupt bytes / a missing file);
//   - the tool validates both lists, resolves the images and forwards the
//     resolved planes + indicator states to the renderer.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  MAX_DISPLAY_IMAGE_BYTES,
  resolveDisplaySurfaceImages,
} from '../../../src/agent/render/displaySurfaceImages';
import { renderPreviewTool, type RenderPreviewDeps } from '../../../src/agent/mcp/tools/renderPreview';
import type { HeadlessRenderOpts, HeadlessRenderResult } from '../../../src/agent/render/headlessRender';
import { DEFAULT_DISPLAY_OFFSET_MM, DEFAULT_INDICATOR_INTENSITY } from '../../../src/shared/render/displaySurface';
import { getToolDefinition } from '../../../src/agent/mcp/toolRegistry';

/** 1×1 opaque PNG. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const tmpDirs: string[] = [];
afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

async function makeTmpDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'kcad-display-'));
  tmpDirs.push(dir);
  return dir;
}

describe('resolveDisplaySurfaceImages', () => {
  it('reads a real PNG from disk and encodes it as a data URL with defaults', async () => {
    const dir = await makeTmpDir();
    await writeFile(join(dir, 'screen.png'), PNG_1X1);
    const [resolved] = await resolveDisplaySurfaceImages([{ part: 'oled', image: 'screen.png' }], dir);
    expect(resolved).toMatchObject({
      part: 'oled',
      face: '+z',
      rotation: 0,
      mode: 'oled',
      offsetMm: DEFAULT_DISPLAY_OFFSET_MM,
    });
    expect(resolved!.region).toEqual([0, 0, 1, 1]);
    expect(resolved!.imageDataUrl).toBe(`data:image/png;base64,${PNG_1X1.toString('base64')}`);
  });

  it('keeps an inline data URI (normalised to the sniffed format)', async () => {
    const image = `data:image/jpeg;base64,${PNG_1X1.toString('base64')}`;
    const [resolved] = await resolveDisplaySurfaceImages([{ part: 'oled', image }], '/nonexistent');
    expect(resolved!.imageDataUrl).toBe(`data:image/png;base64,${PNG_1X1.toString('base64')}`);
  });

  it('detects JPEG and WebP magic bytes', async () => {
    const dir = await makeTmpDir();
    await writeFile(join(dir, 'shot.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));
    const webp = Buffer.concat([
      Buffer.from('RIFF', 'latin1'),
      Buffer.from([0x20, 0, 0, 0]),
      Buffer.from('WEBPVP8 ', 'latin1'),
    ]);
    await writeFile(join(dir, 'shot.webp'), webp);
    const resolved = await resolveDisplaySurfaceImages(
      [{ part: 'a', image: 'shot.jpg' }, { part: 'b', image: 'shot.webp' }],
      dir,
    );
    expect(resolved[0]!.imageDataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(resolved[1]!.imageDataUrl.startsWith('data:image/webp;base64,')).toBe(true);
  });

  it('refuses corrupt bytes and a missing file with a display-surface: error', async () => {
    const dir = await makeTmpDir();
    await writeFile(join(dir, 'broken.png'), Buffer.from('definitely not an image', 'utf8'));
    await expect(resolveDisplaySurfaceImages([{ part: 'a', image: 'broken.png' }], dir))
      .rejects.toThrow(/display-surface:/);
    await expect(resolveDisplaySurfaceImages([{ part: 'a', image: 'missing.png' }], dir))
      .rejects.toThrow(/display-surface:/);
    await expect(resolveDisplaySurfaceImages([{ part: 'a', image: 'data:image/png;base64,   ' }], dir))
      .rejects.toThrow(/display-surface:/);
  });

  it('caps one image at the documented byte limit (including inline data URIs)', async () => {
    expect(MAX_DISPLAY_IMAGE_BYTES).toBe(16 * 1024 * 1024);
    const oversized = Buffer.alloc(MAX_DISPLAY_IMAGE_BYTES + 1);
    PNG_1X1.copy(oversized, 0, 0, 8);
    const inlineOversized = `data:image/png;base64,${oversized.toString('base64')}`;
    await expect(resolveDisplaySurfaceImages([{ part: 'a', image: inlineOversized }], '/nonexistent'))
      .rejects.toThrow(/display-surface:.*limit/);
  });
});

function recordingDeps(): { deps: RenderPreviewDeps; calls: HeadlessRenderOpts[] } {
  const calls: HeadlessRenderOpts[] = [];
  const deps: RenderPreviewDeps = {
    render: async (opts): Promise<HeadlessRenderResult> => {
      calls.push(opts);
      const tile = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
      const pngsByView: HeadlessRenderResult['pngsByView'] = {};
      for (const v of opts.views ?? []) pngsByView[v] = tile;
      return { pngsByView, pngsByPose: {}, bounds: { min: [0, 0, 0], max: [10, 10, 10] } };
    },
    resolveBaseUrl: async () => ({ baseUrl: 'http://127.0.0.1:1', source: 'static-player', close: async () => undefined }),
    mechanismProbe: async () => ({ mechanism: 'unverified', failures: [] }),
  };
  return { deps, calls };
}

describe('render_preview displays / indicators', () => {
  it('forwards the resolved display planes and indicator states to the renderer', async () => {
    const dir = await makeTmpDir();
    const imagePath = join(dir, 'screen.png');
    await writeFile(imagePath, PNG_1X1);
    const { deps, calls } = recordingDeps();
    const r = await renderPreviewTool(
      {
        file: join(dir, 'model.kcad.ts'),
        views: ['iso'],
        displays: [{ part: 'oled', image: imagePath, face: '+y', mode: 'lcd' }],
        indicators: [{ part: 'led1', color: '#33ff66', level: 0.5 }],
      },
      deps,
    );
    if (r.out_dir) tmpDirs.push(r.out_dir);
    expect(r.ok, r.error).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.displays).toHaveLength(1);
    expect(calls[0]!.displays![0]).toMatchObject({
      part: 'oled',
      face: '+y',
      mode: 'lcd',
      offsetMm: DEFAULT_DISPLAY_OFFSET_MM,
    });
    expect(calls[0]!.displays![0]!.imageDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(calls[0]!.indicators).toEqual([
      { part: 'led1', color: '#33ff66', level: 0.5, intensity: DEFAULT_INDICATOR_INTENSITY },
    ]);
  });

  it('leaves both lists undefined when the call names none', async () => {
    const { deps, calls } = recordingDeps();
    const r = await renderPreviewTool({ code: 'return box(10, 10, 10);', views: ['iso'] }, deps);
    if (r.out_dir) tmpDirs.push(r.out_dir);
    expect(r.ok, r.error).toBe(true);
    expect(calls[0]!.displays).toBeUndefined();
    expect(calls[0]!.indicators).toBeUndefined();
  });

  it('refuses an invalid display spec, an invalid indicator and an unreadable image', async () => {
    const dir = await makeTmpDir();
    await writeFile(join(dir, 'broken.png'), Buffer.from('nope', 'utf8'));
    const { deps, calls } = recordingDeps();
    const bad = [
      await renderPreviewTool({ file: join(dir, 'model.kcad.ts'), displays: [{ part: 'oled', image: 'a.png', face: 'up' } as never] }, deps),
      await renderPreviewTool({ file: join(dir, 'model.kcad.ts'), displays: [{ part: '', image: 'a.png' }] }, deps),
      await renderPreviewTool({ file: join(dir, 'model.kcad.ts'), indicators: [{ part: 'led', color: 'red' }] }, deps),
      await renderPreviewTool({ file: join(dir, 'model.kcad.ts'), indicators: [{ part: 'led', color: '#ffffff', level: 2 }] }, deps),
      await renderPreviewTool({ file: join(dir, 'model.kcad.ts'), displays: [{ part: 'oled', image: join(dir, 'broken.png') }] }, deps),
      await renderPreviewTool({ file: join(dir, 'model.kcad.ts'), displays: [{ part: 'oled', image: join(dir, 'missing.png') }] }, deps),
    ];
    for (const r of bad) {
      if (r.out_dir) tmpDirs.push(r.out_dir);
      expect(r.ok).toBe(false);
      expect(r.errorCode).toBe('cli.invalid-args');
      expect(r.errorHint).toBeTruthy();
    }
    expect(calls).toHaveLength(0);
  });

  it('is advertised on both registry schemas with the shared field shapes', () => {
    for (const name of ['render_preview', 'capture_animation']) {
      const def = getToolDefinition(name)!;
      const props = (def.inputSchema as { properties: Record<string, unknown> }).properties;
      const displays = props.displays as { items: { required: string[]; properties: Record<string, unknown> } };
      const indicators = props.indicators as { items: { required: string[]; properties: Record<string, unknown> } };
      expect(displays.items.required).toEqual(['part', 'image']);
      expect(displays.items.properties.face).toMatchObject({ enum: ['+x', '-x', '+y', '-y', '+z', '-z'] });
      expect(indicators.items.required).toEqual(['part', 'color']);
      expect(def.description).toContain('DISPLAYS / INDICATORS');
    }
  });
});
