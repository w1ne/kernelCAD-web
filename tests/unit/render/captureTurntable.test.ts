// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/render/captureTurntable.test.ts
//
// capture_animation turntable mode — browser/ffmpeg/OCCT-free:
//   - the engine walks a seamless 360° schedule with one orbit fit, the
//     publish preset's elevation and size, and writes every frame;
//   - MP4 vs GIF encoder arguments;
//   - the tool's turntable field validation (defaults, transparent needs
//     frames_dir, even MP4 sizes, mode-specific fields refused).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { captureTurntable, turntableFrameCount, type CaptureTurntableDeps } from '../../../src/agent/render/captureTurntable';
import { ffmpegEncodeArgs } from '../../../src/agent/render/captureAnimationPhases';
import type { FfmpegProcessLike } from '../../../src/agent/render/captureAnimation';
import type { PublishTileRequest } from '../../../src/agent/render/publishCapture';
import { resolveTurntableSettings } from '../../../src/agent/mcp/tools/captureTurntableInput';
import { captureAnimationTool } from '../../../src/agent/mcp/tools/captureAnimation';
import { PUBLISH_PRESET } from '../../../src/shared/render/publishPreset';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

class FakeFfmpeg extends EventEmitter {
  frames = 0;
  stdin = {
    write: (_chunk: Buffer, cb: (err?: Error | null) => void): void => {
      this.frames += 1;
      cb();
    },
    end: (): void => {
      queueMicrotask(() => this.emit('close', 0));
    },
  };
  constructor() {
    super();
    queueMicrotask(() => this.emit('spawn'));
  }
  kill(): boolean {
    return true;
  }
}

function fakes() {
  const tiles: PublishTileRequest[] = [];
  const pageClose = vi.fn(async () => undefined);
  const surfaceClose = vi.fn(async () => undefined);
  const openPage = vi.fn(async () => ({
    pageHandle: { page: {} as never, attachedOverCdp: false, close: pageClose },
    objectVisibility: undefined,
  }));
  const state: { ffmpeg?: FakeFfmpeg; args?: readonly string[] } = {};
  const deps: CaptureTurntableDeps = {
    mesh: vi.fn(async () => ({ meshing: { bounds: { min: [0, 0, 0], max: [1, 1, 1] } } as never, serialized: [] })),
    openPage: openPage as unknown as CaptureTurntableDeps['openPage'],
    resolveBaseUrl: vi.fn(async () => ({ baseUrl: 'http://127.0.0.1:1', source: 'static-player' as const, close: surfaceClose })),
    captureTile: vi.fn(async (_page, tile: PublishTileRequest) => {
      tiles.push(tile);
      return sharp({ create: { width: tile.width, height: tile.height, channels: 3, background: '#fff' } }).png().toBuffer();
    }),
    spawnFfmpeg: (args) => {
      state.args = args;
      state.ffmpeg = new FakeFfmpeg();
      return state.ffmpeg as unknown as FfmpegProcessLike;
    },
  };
  return { deps, tiles, openPage, pageClose, surfaceClose, state };
}

const BASE = {
  scriptPath: '/tmp/model.kcad.ts',
  width: 64,
  height: 64,
  fps: 4,
  durationMs: 2000,
  elevationDeg: 22,
  startAzDeg: 30,
  publish: { background: '#ffffff', shadow: true },
};

describe('captureTurntable engine', () => {
  it('frames a seamless 360° loop with one orbit fit and writes every frame (PNG sequence)', async () => {
    const framesDir = mkdtempSync(join(tmpdir(), 'turntable-'));
    dirs.push(framesDir);
    const { deps, tiles, openPage, pageClose, surfaceClose } = fakes();
    const r = await captureTurntable({ ...BASE, framesDir }, deps);
    expect(r.ok, JSON.stringify(r.diagnostics)).toBe(true);
    expect(r.frameCount).toBe(8);
    expect(r.verifySkipped).toBe(true);
    expect(readdirSync(framesDir).sort()).toHaveLength(8);
    expect(tiles.map((t) => t.azDeg)).toEqual([30, 75, 120, 165, 210, 255, 300, 345]);
    for (const t of tiles) {
      expect(t).toMatchObject({ width: 64, height: 64, elDeg: 22, fit: 'orbit', supersample: PUBLISH_PRESET.turntableSupersample });
    }
    // The publish stage reaches the page bootstrap.
    expect(openPage.mock.calls[0][0]).toMatchObject({ publish: { background: '#ffffff', shadow: true }, viewportWidth: 64 });
    expect(pageClose).toHaveBeenCalled();
    expect(surfaceClose).toHaveBeenCalled();
  });

  it('pipes every frame into ffmpeg and picks GIF args from the extension', async () => {
    const out = mkdtempSync(join(tmpdir(), 'turntable-'));
    dirs.push(out);
    const { deps, state } = fakes();
    const r = await captureTurntable({ ...BASE, outPath: join(out, 'loop.gif') }, deps);
    expect(r.ok, JSON.stringify(r.diagnostics)).toBe(true);
    expect(state.ffmpeg!.frames).toBe(8);
    expect(state.args).toContain('-loop');
  });

  it('frame count: duration × fps, at least 2', () => {
    expect(turntableFrameCount(6000, 30)).toBe(180);
    expect(turntableFrameCount(100, 1)).toBe(2);
  });
});

describe('ffmpeg encode args', () => {
  it('MP4 stays H.264 yuv420p; .gif gets a palette pass and loops', () => {
    const mp4 = ffmpegEncodeArgs('/x/a.mp4', 30);
    expect(mp4).toEqual(['-y', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '22', '/x/a.mp4']);
    const gif = ffmpegEncodeArgs('/x/a.GIF', 15);
    expect(gif.join(' ')).toContain('palettegen');
    expect(gif.join(' ')).toContain('paletteuse');
    expect(gif.slice(-3)).toEqual(['-loop', '0', '/x/a.GIF']);
  });
});

describe('turntable input validation', () => {
  it('defaults to the publish look, 1080², 6 s @ 30 fps, 22° elevation', () => {
    expect(resolveTurntableSettings({ turntable: true })).toEqual({
      width: 1080, height: 1080, fps: 30, durationMs: 6000, elevationDeg: 22,
      publish: { background: '#ffffff', shadow: true },
    });
    expect(resolveTurntableSettings({ turntable: true, preset: 'default' })).toMatchObject({ publish: undefined });
  });

  it('transparent needs frames_dir; MP4 needs even sizes; GIF may be odd', () => {
    expect(resolveTurntableSettings({ background: 'transparent' })).toHaveProperty('message');
    expect(resolveTurntableSettings({ background: 'transparent', frames_dir: '/tmp/f' })).toMatchObject({ publish: { background: 'transparent' } });
    expect(resolveTurntableSettings({ width: 1081 })).toHaveProperty('message');
    expect(resolveTurntableSettings({ width: 1081, output_path: '/tmp/a.gif' })).toMatchObject({ width: 1081 });
    expect(resolveTurntableSettings({ width: 4096 })).toHaveProperty('message');
    expect(resolveTurntableSettings({ verify_every: 2 })).toHaveProperty('message');
    expect(resolveTurntableSettings({ duration_ms: 100 })).toHaveProperty('message');
    expect(resolveTurntableSettings({ preset: 'default', background: 'dark' })).toHaveProperty('message');
  });

  it('the tool refuses turntable-only fields in timeline mode (no silent ignore)', async () => {
    const r = await captureAnimationTool({ file: '/tmp/model.kcad.ts', width: 512 });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.invalid-args');
    expect(r.error).toContain('turntable');
    const r2 = await captureAnimationTool({ file: '/tmp/model.kcad.ts', turntable: true, background: 'transparent' });
    expect(r2.ok).toBe(false);
    expect(r2.error).toContain('frames_dir');
  });
});
