// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/cli/renderPublishPreset.test.ts
//
// `kernelcad render --preset publish`: flag parsing, the publish stage
// reaching the shared renderer (headlessRender's `publish` option — the same
// path render_preview takes), output files, and the refusals that mirror
// render_preview (background/shadow without the preset, bad values). The
// renderer is mocked: no browser.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('../../../src/agent/render/headlessRender', () => ({
  headlessRender: vi.fn(),
  composite2x2: vi.fn().mockResolvedValue(Buffer.alloc(0)),
  ALL_VIEWS: ['front', 'right', 'top', 'iso'] as const,
}));

import { renderCommand, renderScript, type RenderInput } from '../../../src/agent/cli/commands/render';
import { headlessRender } from '../../../src/agent/render/headlessRender';
import { PUBLISH_PRESET } from '../../../src/shared/render/publishPreset';

const mockRender = headlessRender as ReturnType<typeof vi.fn>;
const HERO_POSE = `${PUBLISH_PRESET.heroAzDeg},${PUBLISH_PRESET.heroElDeg}`;

function mockResult(poses: string[] = [HERO_POSE], withViews = false) {
  const buf = Buffer.from('png');
  return {
    pngsByView: withViews ? { front: buf, right: buf, top: buf, iso: buf } : {},
    pngsByPose: Object.fromEntries(poses.map((p) => [p, buf])),
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
  };
}

describe('render --preset publish', () => {
  let tmp: string;
  let scriptPath: string;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  const base = (): RenderInput => ({
    file: scriptPath,
    separate: false,
    baseUrl: 'http://localhost:5173',
    hideReferenceImages: false,
    noMechanismCheck: true,
  });

  async function runCli(...args: string[]): Promise<void> {
    const cmd = renderCommand().exitOverride();
    await cmd.parseAsync([scriptPath, '--base-url', 'http://localhost:5173', '--no-mechanism-check', ...args], { from: 'user' });
  }

  beforeEach(() => {
    mockRender.mockReset();
    mockRender.mockResolvedValue(mockResult());
    tmp = mkdtempSync(join(tmpdir(), 'kcad-render-publish-'));
    scriptPath = join(tmp, 'demo.kcad.ts');
    writeFileSync(scriptPath, 'return box(1,1,1);');
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errSpy.mockRestore();
    logSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('declares --preset, --background, --no-shadow, and unset --width/--height defaults', () => {
    const cmd = renderCommand();
    expect(cmd.options.find((o) => o.long === '--preset')).toBeDefined();
    expect(cmd.options.find((o) => o.long === '--background')).toBeDefined();
    expect(cmd.options.find((o) => o.long === '--no-shadow')).toBeDefined();
    // No materialized 1024 default: the preset picks the size when omitted.
    expect(cmd.options.find((o) => o.long === '--width')?.defaultValue).toBeUndefined();
    expect(cmd.options.find((o) => o.long === '--height')?.defaultValue).toBeUndefined();
  });

  it('a bare --preset publish renders one hero shot with the publish stage (CLI parse)', async () => {
    await runCli('--preset', 'publish');
    expect(process.exitCode).toBe(0);
    expect(mockRender).toHaveBeenCalledOnce();
    const opts = mockRender.mock.calls[0][0];
    expect(opts).toMatchObject({
      publish: { background: '#ffffff', shadow: true },
      views: [],
      poses: [HERO_POSE],
      viewportWidth: PUBLISH_PRESET.stillWidth,
      viewportHeight: PUBLISH_PRESET.stillHeight,
    });
    expect(existsSync(join(tmp, 'demo.hero.png'))).toBe(true);
    expect(existsSync(join(tmp, 'demo.png'))).toBe(false);
  });

  it('--background and --no-shadow reach the renderer as the publish stage (CLI parse)', async () => {
    await runCli('--preset', 'publish', '--background', 'dark', '--no-shadow', '--width', '800', '--height', '600', '-o', join(tmp, 'shot.png'));
    expect(process.exitCode).toBe(0);
    expect(mockRender.mock.calls[0][0]).toMatchObject({
      publish: { background: '#1f2328', shadow: false },
      viewportWidth: 800,
      viewportHeight: 600,
    });
    expect(existsSync(join(tmp, 'shot.png'))).toBe(true);
  });

  it('transparent and hex backgrounds are normalised like render_preview', async () => {
    await renderScript({ ...base(), preset: 'publish', background: 'transparent' });
    await renderScript({ ...base(), preset: 'publish', background: '#ABC' });
    expect(mockRender.mock.calls[0][0].publish).toEqual({ background: 'transparent', shadow: true });
    expect(mockRender.mock.calls[1][0].publish).toEqual({ background: '#aabbcc', shadow: true });
  });

  it('--preset publish --separate renders the four views in the publish look, one file each', async () => {
    mockRender.mockResolvedValue(mockResult([], true));
    const r = await renderScript({ ...base(), preset: 'publish', separate: true });
    expect(r.exitCode).toBe(0);
    expect(mockRender.mock.calls[0][0]).toMatchObject({ views: ['front', 'right', 'top', 'iso'], publish: { background: '#ffffff' } });
    expect(r.outputPaths.map((p) => p.slice(tmp.length + 1)).sort()).toEqual(
      ['demo.front.png', 'demo.iso.png', 'demo.right.png', 'demo.top.png'],
    );
  });

  it('--preset publish --pose renders only the requested pose, no hero', async () => {
    mockRender.mockResolvedValue(mockResult(['45,10']));
    const r = await renderScript({ ...base(), preset: 'publish', poses: ['45,10'] });
    expect(r.exitCode).toBe(0);
    expect(mockRender.mock.calls[0][0]).toMatchObject({ views: [], poses: ['45,10'] });
    expect(r.outputPaths).toEqual([join(tmp, 'demo.pose-45-10.png')]);
  });

  it('the default look is unchanged: four views, 1024 px, no publish key', async () => {
    mockRender.mockResolvedValue(mockResult([], true));
    const r = await renderScript(base());
    expect(r.exitCode).toBe(0);
    const opts = mockRender.mock.calls[0][0];
    expect(opts).toMatchObject({ views: ['front', 'right', 'top', 'iso'], viewportWidth: 1024, viewportHeight: 1024 });
    expect('publish' in opts).toBe(false);
  });

  it.each([
    ['--background without --preset publish', ['--background', 'dark']],
    ['--no-shadow without --preset publish', ['--no-shadow']],
    ['--background under --preset default', ['--preset', 'default', '--background', 'white']],
    ['an unknown preset', ['--preset', 'glossy']],
    ['an invalid background', ['--preset', 'publish', '--background', 'plaid']],
    ['a publish size over the cap', ['--preset', 'publish', '--width', '4096']],
  ])('refuses %s with exit 1 before rendering', async (_label, args) => {
    await runCli(...args);
    expect(process.exitCode).toBe(1);
    expect(mockRender).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it('names the flags in the refusal message', async () => {
    await runCli('--background', 'dark');
    expect(String(errSpy.mock.calls[0][0])).toContain('--background and --no-shadow apply only to --preset publish');
  });
});
