// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/cli/animateTurntable.test.ts
//
// `kernelcad animate --turntable`: the CLI face of capture_animation
// ({ turntable: true }). Flags resolve through the MCP tool's validator
// (resolveTurntableSettings) into the same engine (captureTurntable); the
// turntable-only flags are refused without --turntable. Engines mocked.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CaptureAnimationResult } from '../../../src/agent/render/captureAnimation';

vi.mock('../../../src/agent/render/captureAnimation', () => ({ captureAnimation: vi.fn() }));
vi.mock('../../../src/agent/render/captureTurntable', () => ({ captureTurntable: vi.fn() }));

import { animateCommand, runAnimate } from '../../../src/agent/cli/commands/animate';
import { captureAnimation } from '../../../src/agent/render/captureAnimation';
import { captureTurntable } from '../../../src/agent/render/captureTurntable';
import { PUBLISH_PRESET } from '../../../src/shared/render/publishPreset';

const mockTimeline = captureAnimation as ReturnType<typeof vi.fn>;
const mockTurntable = captureTurntable as ReturnType<typeof vi.fn>;

function okTurntable(outPath = '/tmp/demo-turntable.mp4'): CaptureAnimationResult {
  return { ok: true, outPath, frameCount: 180, durationMs: 6000, fps: 30, diagnostics: [], verified: false, collisions: [], verifySkipped: true };
}

describe('animate --turntable', () => {
  beforeEach(() => {
    mockTimeline.mockReset();
    mockTurntable.mockReset();
    mockTurntable.mockResolvedValue(okTurntable());
  });
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('defaults to the publish look at the MCP defaults and exits 0', async () => {
    const r = await runAnimate({ file: '/m/demo.kcad.ts', turntable: true });
    expect(r.exitCode).toBe(0);
    expect(mockTimeline).not.toHaveBeenCalled();
    expect(mockTurntable).toHaveBeenCalledOnce();
    expect(mockTurntable.mock.calls[0][0]).toEqual({
      scriptPath: '/m/demo.kcad.ts',
      width: PUBLISH_PRESET.turntableSize,
      height: PUBLISH_PRESET.turntableSize,
      fps: PUBLISH_PRESET.turntableFps,
      durationMs: PUBLISH_PRESET.turntableDurationMs,
      elevationDeg: PUBLISH_PRESET.heroElDeg,
      startAzDeg: PUBLISH_PRESET.heroAzDeg,
      publish: { background: PUBLISH_PRESET.background, shadow: true },
    });
    expect(r.summary).toContain('verify skipped');
  });

  it('threads every turntable flag through the command parser', async () => {
    mockTurntable.mockResolvedValue(okTurntable('/m/x.gif'));
    const cmd = animateCommand().exitOverride();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await cmd.parseAsync([
      '/m/demo.kcad.ts', '/m/x.gif', '--turntable', '--quiet',
      '--width', '640', '--height', '480', '--fps', '15', '--duration-ms', '4000', '--elevation', '30',
      '--background', 'dark', '--no-shadow', '--environment', 'studio', '--focus', 'seat', '--base-url', 'http://x',
    ], { from: 'user' });
    log.mockRestore();
    expect(process.exitCode).toBe(0);
    expect(mockTurntable.mock.calls[0][0]).toEqual({
      scriptPath: '/m/demo.kcad.ts',
      outPath: '/m/x.gif',
      width: 640,
      height: 480,
      fps: 15,
      durationMs: 4000,
      elevationDeg: 30,
      startAzDeg: PUBLISH_PRESET.heroAzDeg,
      publish: { background: '#1f2328', shadow: false },
      objectFilter: { mode: 'focus', patterns: ['seat'] },
      environment: 'studio',
      baseUrl: 'http://x',
    });
  });

  it('--preset default drops the publish stage', async () => {
    await runAnimate({ file: '/m/demo.kcad.ts', turntable: true, preset: 'default' });
    expect(mockTurntable.mock.calls[0][0].publish).toBeUndefined();
  });

  it('--frames keeps a transparent backdrop (PNG sequence)', async () => {
    await runAnimate({ file: '/m/demo.kcad.ts', turntable: true, frames: '/m/frames', background: 'transparent' });
    expect(mockTurntable.mock.calls[0][0]).toMatchObject({ framesDir: '/m/frames', publish: { background: 'transparent' } });
  });

  it.each([
    ['transparent MP4', { background: 'transparent' }, '--frames'],
    ['odd MP4 size', { width: 641 }, 'even'],
    ['--background under --preset default', { preset: 'default', background: 'dark' }, "apply only to preset: 'publish'"],
    ['an invalid background', { background: 'plaid' }, "invalid background 'plaid'"],
    ['--verify-every', { verifyEvery: 2 }, '--verify-every'],
    ['a too-short revolution', { durationMs: 100 }, '--duration-ms'],
  ])('refuses %s with exit 2 before capturing, in CLI wording', async (_label, extra, needle) => {
    const r = await runAnimate({ file: '/m/demo.kcad.ts', turntable: true, ...extra });
    expect(r.exitCode).toBe(2);
    expect(mockTurntable).not.toHaveBeenCalled();
    const d = r.result.diagnostics[0];
    expect(d.code).toBe('cli.invalid-args');
    expect(d.message).toMatch(/^animate --turntable: /);
    expect(`${d.message} ${d.hint}`).toContain(needle);
  });

  it('refuses turntable-only flags without --turntable (timeline untouched)', async () => {
    const r = await runAnimate({ file: '/m/demo.kcad.ts', background: 'dark', shadow: false, width: 640 });
    expect(r.exitCode).toBe(2);
    expect(r.result.diagnostics[0].message).toBe('animate: --width, --background, --no-shadow apply only to --turntable.');
    expect(mockTimeline).not.toHaveBeenCalled();
    expect(mockTurntable).not.toHaveBeenCalled();
  });

  it('--no-shadow without --turntable is refused through the parser', async () => {
    const cmd = animateCommand().exitOverride();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await cmd.parseAsync(['/m/demo.kcad.ts', '--no-shadow', '--quiet'], { from: 'user' });
    log.mockRestore();
    expect(process.exitCode).toBe(2);
    expect(mockTimeline).not.toHaveBeenCalled();
  });

  it('a plain animate call still captures the timeline with no turntable keys', async () => {
    mockTimeline.mockResolvedValue({ ...okTurntable('/m/a.mp4'), verified: true, verifySkipped: undefined });
    const r = await runAnimate({ file: '/m/demo.kcad.ts' });
    expect(r.exitCode).toBe(0);
    expect(mockTurntable).not.toHaveBeenCalled();
    expect(mockTimeline.mock.calls[0][0]).toEqual({ scriptPath: '/m/demo.kcad.ts' });
  });
});
