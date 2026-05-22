// tests/unit/cli/renderCommand.test.ts
//
// Verifies focused render CLI behavior without invoking the real browser renderer.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock headlessRender before importing the command so the module under test
// picks up the stub.
vi.mock('../../../src/agent/render/headlessRender', () => {
  const ALL_VIEWS = ['front', 'right', 'top', 'iso'] as const;
  const mockHeadlessRender = vi.fn();
  const composite2x2 = vi.fn().mockResolvedValue(Buffer.alloc(0));
  return { headlessRender: mockHeadlessRender, composite2x2, ALL_VIEWS };
});

// Import after mock registration.
import { renderInspectBundle, renderScript, renderCommand } from '../../../src/agent/cli/commands/render';
import { headlessRender } from '../../../src/agent/render/headlessRender';

const mockHeadlessRender = headlessRender as ReturnType<typeof vi.fn>;

/** Minimal PerView buffer map the mock returns. */
function makeMockResult() {
  const buf = Buffer.alloc(4);
  const depthBuf = Buffer.from('depth');
  const normalsBuf = Buffer.from('normals');
  return {
    pngsByView: { front: buf, right: buf, top: buf, iso: buf },
    maskPngsByView: { front: buf, right: buf, top: buf, iso: buf },
    inspectionPngsByChannel: {
      depth: { front: depthBuf, right: depthBuf, top: depthBuf, iso: depthBuf },
      normals: { front: normalsBuf, right: normalsBuf, top: normalsBuf, iso: normalsBuf },
    },
    inspectionChannelMetadata: {
      depth: {
        encoding: 'linear-camera-depth-rgba8',
        units: 'mm',
        near: 0.1,
        far: 100,
        background: 'rgba(0,0,0,0)',
        meaning: 'nearest visible model surface after the active object filter, measured along the camera view direction and normalized from near to far',
      },
      normals: {
        encoding: 'view-space-normal-rgb8',
        mapping: 'rgb = round((normal_view * 0.5 + 0.5) * 255)',
        background: 'rgba(0,0,0,0)',
        meaning: 'visible model-surface normal in the camera coordinate frame after the active object filter',
      },
    },
    maskObjects: [
      {
        featureId: 'assembly_1__wheel',
        names: ['assembly_1__wheel', 'wheel'],
        color: '#000001',
        rgb: [0, 0, 1] as [number, number, number],
        visibleIndex: 0,
      },
    ],
    bounds: { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] },
    objectVisibility: {
      filter: { mode: 'focus' as const, patterns: ['wheel'] },
      visible: [{ featureId: 'assembly_1__wheel', names: ['assembly_1__wheel', 'wheel'] }],
      hidden: [{ featureId: 'assembly_1__base', names: ['assembly_1__base', 'base'] }],
    },
  };
}

describe('render command', () => {
  let tmp: string;
  let scriptPath: string;

  beforeEach(() => {
    mockHeadlessRender.mockReset();
    mockHeadlessRender.mockResolvedValue(makeMockResult());
    tmp = mkdtempSync(join(tmpdir(), 'kcad-render-test-'));
    scriptPath = join(tmp, 'demo.kcad.ts');
    // File must exist for resolve() to work; headlessRender is mocked so content
    // doesn't matter.
    writeFileSync(scriptPath, 'return box(1,1,1);');
  });

  it('passes hideReferenceImages: true when flag is set', async () => {
    await renderScript({
      file: scriptPath,
      out: join(tmp, 'out.png'),
      separate: false,
      width: 512,
      height: 512,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: true,
    });

    expect(mockHeadlessRender).toHaveBeenCalledOnce();
    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({
      hideReferenceImages: true,
    });
  });

  it('passes hideReferenceImages: false when flag is not set', async () => {
    await renderScript({
      file: scriptPath,
      out: join(tmp, 'out.png'),
      separate: false,
      width: 512,
      height: 512,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
    });

    expect(mockHeadlessRender).toHaveBeenCalledOnce();
    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({
      hideReferenceImages: false,
    });
  });

  it('renderCommand declares --hide-reference-images option with correct description', () => {
    const cmd = renderCommand();
    const opt = cmd.options.find((o) => o.long === '--hide-reference-images');
    expect(opt).toBeDefined();
    expect(opt?.description).toBe('hide referenceImage() overlays in rendered output (default false)');
    // Default value must be false (not undefined / not true).
    expect(opt?.defaultValue).toBe(false);
  });

  it('renderCommand declares the inspect subcommand', () => {
    const cmd = renderCommand();
    const inspect = cmd.commands.find((subcommand) => subcommand.name() === 'inspect');
    expect(inspect).toBeDefined();
    expect(inspect?.description()).toBe('Render a .kcad.ts script to an inspection bundle directory');
    expect(inspect?.options.find((o) => o.long === '--hide-reference-images')?.defaultValue).toBe(false);
  });

  it('writes an rgb inspection bundle with manifest and four view PNGs', async () => {
    const outDir = join(tmp, 'inspect-bundle');

    const result = await renderInspectBundle({
      file: scriptPath,
      outDir,
      width: 640,
      height: 480,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: true,
    });

    expect(result.exitCode).toBe(0);
    expect(mockHeadlessRender).toHaveBeenCalledOnce();
    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({
      scriptPath,
      viewportWidth: 640,
      viewportHeight: 480,
      views: ['front', 'right', 'top', 'iso'],
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: true,
    });

    for (const view of ['front', 'right', 'top', 'iso']) {
      expect(existsSync(join(outDir, 'channels', 'rgb', `${view}.png`))).toBe(true);
    }

    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({
      bundleVersion: 1,
      scriptPath,
      requestedChannels: ['rgb'],
      emittedChannels: ['rgb'],
      viewport: { width: 640, height: 480 },
      views: ['front', 'right', 'top', 'iso'],
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      command: {
        name: 'kernelcad render inspect',
        channels: ['rgb'],
      },
      caveats: ['Channels are view-dependent and reflect the same camera, visibility filter, tail-feature filtering, and reference-image visibility used for RGB.'],
      channels: {
        rgb: {
          front: 'channels/rgb/front.png',
          right: 'channels/rgb/right.png',
          top: 'channels/rgb/top.png',
          iso: 'channels/rgb/iso.png',
        },
      },
    });
    expect(typeof manifest.generatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(manifest.generatedAt))).toBe(false);
    expect(result.outputPaths).toEqual([
      join(outDir, 'manifest.json'),
      join(outDir, 'channels', 'rgb', 'front.png'),
      join(outDir, 'channels', 'rgb', 'right.png'),
      join(outDir, 'channels', 'rgb', 'top.png'),
      join(outDir, 'channels', 'rgb', 'iso.png'),
    ]);
  });

  it('passes focus filters through and records object visibility in the manifest', async () => {
    const outDir = join(tmp, 'inspect-focus');

    await renderInspectBundle({
      file: scriptPath,
      outDir,
      width: 640,
      height: 480,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
      focus: ['wheel'],
    });

    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({
      objectFilter: { mode: 'focus', patterns: ['wheel'] },
    });

    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    expect(manifest.filters).toEqual({ object: { mode: 'focus', patterns: ['wheel'] } });
    expect(manifest.objects).toEqual({
      visible: [{ featureId: 'assembly_1__wheel', names: ['assembly_1__wheel', 'wheel'] }],
      hidden: [{ featureId: 'assembly_1__base', names: ['assembly_1__base', 'base'] }],
    });
  });

  it('writes requested mask channel PNGs and object color metadata', async () => {
    const outDir = join(tmp, 'inspect-mask');

    const result = await renderInspectBundle({
      file: scriptPath,
      outDir,
      width: 640,
      height: 480,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
      channels: ['rgb,mask'],
    });

    expect(result.exitCode).toBe(0);
    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({
      inspectionChannels: ['rgb', 'mask'],
    });

    for (const view of ['front', 'right', 'top', 'iso']) {
      expect(existsSync(join(outDir, 'channels', 'mask', `${view}.png`))).toBe(true);
    }

    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    expect(manifest.requestedChannels).toEqual(['rgb', 'mask']);
    expect(manifest.emittedChannels).toEqual(['rgb', 'mask']);
    expect(manifest.channels.mask).toEqual({
      front: 'channels/mask/front.png',
      right: 'channels/mask/right.png',
      top: 'channels/mask/top.png',
      iso: 'channels/mask/iso.png',
    });
    expect(manifest.channelMetadata.mask).toEqual({
      encoding: 'object-id-rgb8',
      background: '#000000',
      objects: [{
        featureId: 'assembly_1__wheel',
        names: ['assembly_1__wheel', 'wheel'],
        color: '#000001',
        rgb: [0, 0, 1],
        visibleIndex: 0,
      }],
    });
    expect(result.outputPaths).toContain(join(outDir, 'channels', 'mask', 'iso.png'));
  });

  it('writes requested depth and normals channel PNGs with channel metadata', async () => {
    const outDir = join(tmp, 'inspect-aux');

    const result = await renderInspectBundle({
      file: scriptPath,
      outDir,
      width: 640,
      height: 480,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
      channels: ['rgb,depth,normals'],
    });

    expect(result.exitCode).toBe(0);
    expect(mockHeadlessRender.mock.calls[0][0]).toMatchObject({
      inspectionChannels: ['rgb', 'depth', 'normals'],
    });

    for (const view of ['front', 'right', 'top', 'iso']) {
      expect(existsSync(join(outDir, 'channels', 'depth', `${view}.png`))).toBe(true);
      expect(existsSync(join(outDir, 'channels', 'normals', `${view}.png`))).toBe(true);
    }

    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    expect(manifest.requestedChannels).toEqual(['rgb', 'depth', 'normals']);
    expect(manifest.emittedChannels).toEqual(['rgb', 'depth', 'normals']);
    expect(manifest.command.channels).toEqual(['rgb', 'depth', 'normals']);
    expect(manifest.channels.depth).toEqual({
      front: 'channels/depth/front.png',
      right: 'channels/depth/right.png',
      top: 'channels/depth/top.png',
      iso: 'channels/depth/iso.png',
    });
    expect(manifest.channels.normals).toEqual({
      front: 'channels/normals/front.png',
      right: 'channels/normals/right.png',
      top: 'channels/normals/top.png',
      iso: 'channels/normals/iso.png',
    });
    expect(manifest.channelMetadata.depth).toMatchObject({
      encoding: 'linear-camera-depth-rgba8',
      units: 'mm',
      near: 0.1,
      far: 100,
      background: 'rgba(0,0,0,0)',
    });
    expect(manifest.channelMetadata.normals).toMatchObject({
      encoding: 'view-space-normal-rgb8',
      mapping: 'rgb = round((normal_view * 0.5 + 0.5) * 255)',
      background: 'rgba(0,0,0,0)',
    });
    expect(result.outputPaths).toContain(join(outDir, 'channels', 'depth', 'front.png'));
    expect(result.outputPaths).toContain(join(outDir, 'channels', 'normals', 'iso.png'));
  });

  it('rejects simultaneous focus and hide filters', async () => {
    const outDir = join(tmp, 'inspect-invalid');

    const result = await renderInspectBundle({
      file: scriptPath,
      outDir,
      width: 640,
      height: 480,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
      focus: ['wheel'],
      hide: ['base'],
    });

    expect(result.exitCode).toBe(1);
    expect(mockHeadlessRender).not.toHaveBeenCalled();
  });

  it('rejects unsupported inspection channels before rendering', async () => {
    const outDir = join(tmp, 'inspect-unsupported-channel');

    const result = await renderInspectBundle({
      file: scriptPath,
      outDir,
      width: 640,
      height: 480,
      baseUrl: 'http://localhost:5173',
      hideReferenceImages: false,
      channels: ['rgb', 'topology'],
    });

    expect(result.exitCode).toBe(1);
    expect(mockHeadlessRender).not.toHaveBeenCalled();
  });
});
