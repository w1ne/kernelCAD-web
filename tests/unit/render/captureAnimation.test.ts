// tests/unit/render/captureAnimation.test.ts
//
// Typed animation-capture engine: unit tests with the browser / ffmpeg
// layers injected via the `deps` seam (no real chromium, no real encoder).
// The model BUILD phase is real — a tiny .kcad.ts fixture with a numeric
// param + animationView is written to a tmpdir and compiled in-process, so
// the record-finding, sampling, and per-frame updateModelParams plumbing
// are exercised against the real kernel.
//
// NOTE (agent-animation workstream): capture's precondition gate is cheap
// build-level diagnostics only — the full-range mechanism-truth probe was
// deliberately removed (48 min before frame 1 on a real assembly); motion
// safety at the animated poses belongs to the upcoming verifyAnimation
// surface. See the gate test below.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  CaptureAnimationDeps,
  FfmpegProcessLike,
} from '../../../src/agent/render/captureAnimation';
import type { DemoPlayerPageHandle } from '../../../src/agent/render/headlessRender';

// Wrap updateModelParams with a recording (and optionally failing) spy while
// keeping the real implementation — the engine's per-frame recompute is real.
const paramCtl = vi.hoisted(() => ({
  failAtCall: -1,
  calls: [] as Array<Array<{ name: string; value: number | boolean }>>,
}));

vi.mock('../../../src/modeling/buildModel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modeling/buildModel')>();
  return {
    ...actual,
    updateModelParams: vi.fn(async (model, edits) => {
      paramCtl.calls.push(edits);
      if (paramCtl.calls.length === paramCtl.failAtCall) {
        throw new Error('synthetic solve failure');
      }
      return actual.updateModelParams(model, edits);
    }),
  };
});

// Import after mock registration. buildModelFromFile comes through the mock
// (which spreads the actual module), so it is the REAL implementation.
import { captureAnimation } from '../../../src/agent/render/captureAnimation';
import { buildModelFromFile } from '../../../src/modeling/buildModel';

// Fixture: numeric param + box + animationView. durationMs=100 @ 30 fps →
// frameCount = max(2, ceil(0.1 · 30)) = 3 frames at tMs 0 / 50 / 100 with
// linearly swept values 10 / 15 / 20. NOTE: animationView is declared BEFORE
// the geometry (the gearfinity convention) — updateModelParams requires the
// chain TAIL record to lower to a shape, and a trailing virtual
// animationView record has none.
const ANIM_FIXTURE = `
const w = param('w', 10, { min: 0, max: 100 });
animationView({ param: 'w', from: 10, to: 20, durationMs: 100, fps: 30 });
const plate = box(w, 10, 2);
return plate;
`;

const NO_ANIM_FIXTURE = `
const plate = box(10, 10, 2);
return plate;
`;

// Builds without throwing but the fillet radius is impossible, so the model
// carries error-severity lowering diagnostics — the capture gate's refusal
// case (build-level diagnostics, NOT a mechanism probe).
const BUILD_ERROR_FIXTURE = `
const w = param('w', 10, { min: 0, max: 100 });
animationView({ param: 'w', from: 10, to: 20, durationMs: 100, fps: 30 });
const plate = box(w, 10, 2);
return plate.fillet(9999);
`;

const FAKE_PNG = Buffer.from('fake-png-bytes');

function makeFakePage() {
  const page = {
    evaluate: vi.fn(async () => undefined),
    screenshot: vi.fn(async () => FAKE_PNG),
    setDefaultTimeout: vi.fn(),
    setViewportSize: vi.fn(async () => undefined),
  };
  const close = vi.fn(async () => undefined);
  const handle = { page, attachedOverCdp: false, close } as unknown as DemoPlayerPageHandle;
  return { handle, page, close };
}

class FakeFfmpeg extends EventEmitter {
  written: Buffer[] = [];
  ended = false;
  killed = false;
  exitCode = 0;
  /** When ≥ 0, the write at this 0-based index fails via the callback —
   *  the EPIPE shape a real encoder produces when it dies mid-encode. */
  failWriteAt = -1;
  stdin = {
    write: (chunk: Buffer, cb: (err?: Error | null) => void): boolean => {
      if (this.written.length === this.failWriteAt) {
        cb(new Error('write EPIPE'));
        return false;
      }
      this.written.push(chunk);
      cb(null);
      return true;
    },
    end: (): void => {
      this.ended = true;
      queueMicrotask(() => this.emit('close', this.exitCode));
    },
  };
  constructor(failSpawnEnoent = false) {
    super();
    queueMicrotask(() => {
      if (failSpawnEnoent) {
        const e = new Error('spawn ffmpeg ENOENT') as NodeJS.ErrnoException;
        e.code = 'ENOENT';
        this.emit('error', e);
      } else {
        this.emit('spawn');
      }
    });
  }
  kill(): boolean {
    this.killed = true;
    queueMicrotask(() => this.emit('close', null));
    return true;
  }
}

function makeDeps(
  overrides: Partial<CaptureAnimationDeps> = {},
  configureFfmpeg?: (f: FakeFfmpeg) => void,
) {
  const { handle, page, close } = makeFakePage();
  // The fake emits 'spawn'/'error' one microtask after construction, so it
  // MUST be constructed inside the spawn hook (the engine attaches its
  // listeners right after calling it) — an eagerly-built instance would
  // fire before anyone listens. `configureFfmpeg` runs there too, so tests
  // can pre-set exitCode / failWriteAt before any frame is written.
  const state: { ffmpeg?: FakeFfmpeg } = {};
  const openPage = vi.fn(async () => handle);
  const spawnFfmpeg = vi.fn(() => {
    state.ffmpeg = new FakeFfmpeg();
    configureFfmpeg?.(state.ffmpeg);
    return state.ffmpeg as unknown as FfmpegProcessLike;
  });
  const deps: CaptureAnimationDeps = { openPage, spawnFfmpeg, ...overrides };
  return { deps, openPage, spawnFfmpeg, state, page, close };
}

let tmp: string;
let animScript: string;
let noAnimScript: string;
let buildErrorScript: string;

beforeEach(() => {
  paramCtl.failAtCall = -1;
  paramCtl.calls = [];
  tmp = mkdtempSync(join(tmpdir(), 'captureAnimation-'));
  animScript = join(tmp, 'anim-box.kcad.ts');
  noAnimScript = join(tmp, 'no-anim.kcad.ts');
  buildErrorScript = join(tmp, 'build-error.kcad.ts');
  writeFileSync(animScript, ANIM_FIXTURE);
  writeFileSync(noAnimScript, NO_ANIM_FIXTURE);
  writeFileSync(buildErrorScript, BUILD_ERROR_FIXTURE);
});

describe('captureAnimation', () => {
  it('no animationView record → ok:false with cli.invalid-args; no browser, no ffmpeg', async () => {
    const { deps, openPage, spawnFfmpeg } = makeDeps();
    const result = await captureAnimation({ scriptPath: noAnimScript }, deps);
    expect(result.ok).toBe(false);
    expect(result.frameCount).toBe(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].code).toBe('cli.invalid-args');
    expect(result.diagnostics[0].message).toMatch(/no animationView/);
    expect(result.diagnostics[0].hint).toContain('animationView');
    expect(openPage).not.toHaveBeenCalled();
    expect(spawnFfmpeg).not.toHaveBeenCalled();
  });

  it('build-error diagnostics → ok:false with the model diagnostics passed through; no browser, no ffmpeg', async () => {
    const { deps, openPage, spawnFfmpeg } = makeDeps();
    const result = await captureAnimation({ scriptPath: buildErrorScript }, deps);
    expect(result.ok).toBe(false);
    expect(result.frameCount).toBe(0);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(openPage).not.toHaveBeenCalled();
    expect(spawnFfmpeg).not.toHaveBeenCalled();
    expect(paramCtl.calls).toHaveLength(0);
  });

  it('happy path (mp4): frame count from sampler, params forwarded in order, mp4 path returned', async () => {
    const { deps, state, close } = makeDeps();
    const outPath = join(tmp, 'out.mp4');
    const result = await captureAnimation({ scriptPath: animScript, outPath }, deps);
    expect(result.ok).toBe(true);
    expect(result.outPath).toBe(outPath);
    expect(result.frameCount).toBe(3);
    expect(result.durationMs).toBe(100);
    expect(result.fps).toBe(30);
    expect(result.diagnostics).toEqual([]);
    // One PNG per frame went into ffmpeg stdin, then stdin was ended.
    expect(state.ffmpeg!.written).toHaveLength(3);
    expect(state.ffmpeg!.ended).toBe(true);
    // Param sequence: linear sweep 10 → 20 sampled at tMs 0 / 50 / 100.
    expect(paramCtl.calls).toEqual([
      [{ name: 'w', value: 10 }],
      [{ name: 'w', value: 15 }],
      [{ name: 'w', value: 20 }],
    ]);
    expect(close).toHaveBeenCalled();
  });

  it('default outPath is <scriptDir>/<basename>-animation.mp4', async () => {
    const { deps } = makeDeps();
    const result = await captureAnimation({ scriptPath: animScript }, deps);
    expect(result.ok).toBe(true);
    expect(result.outPath).toBe(join(tmp, 'anim-box-animation.mp4'));
  });

  it('mid-frame solve failure → abort: ffmpeg killed, partial mp4 deleted, ok:false names tMs', async () => {
    paramCtl.failAtCall = 2; // frame index 1 (tMs = 50)
    const { deps, state, close } = makeDeps();
    const outPath = join(tmp, 'partial.mp4');
    // Simulate the encoder having started writing the file.
    writeFileSync(outPath, 'partial-mp4-bytes');
    const result = await captureAnimation({ scriptPath: animScript, outPath }, deps);
    expect(result.ok).toBe(false);
    expect(result.outPath).toBeUndefined();
    expect(result.frameCount).toBe(1); // only frame 0 made it
    const d = result.diagnostics.find((x) => x.code === 'recompute.lowering.exception');
    expect(d).toBeDefined();
    expect(d!.message).toContain('tMs=50');
    expect(d!.message).toContain('synthetic solve failure');
    expect(state.ffmpeg!.ended).toBe(true);
    expect(state.ffmpeg!.killed).toBe(true);
    expect(existsSync(outPath)).toBe(false); // partial artifact deleted
    expect(close).toHaveBeenCalled(); // no zombie chromium
  });

  it('framesDir mode: ffmpeg never spawned, frames named frame-%04d.png, outPath = framesDir', async () => {
    const { deps, spawnFfmpeg } = makeDeps();
    const framesDir = join(tmp, 'frames');
    const result = await captureAnimation({ scriptPath: animScript, framesDir }, deps);
    expect(result.ok).toBe(true);
    expect(result.outPath).toBe(framesDir);
    expect(result.frameCount).toBe(3);
    expect(spawnFfmpeg).not.toHaveBeenCalled();
    expect(readdirSync(framesDir).sort()).toEqual([
      'frame-0000.png', 'frame-0001.png', 'frame-0002.png',
    ]);
  });

  it('framesDir mode mid-frame failure: keeps already-written frames but ok:false', async () => {
    paramCtl.failAtCall = 3; // frame index 2 (tMs = 100)
    const { deps } = makeDeps();
    const framesDir = join(tmp, 'frames-partial');
    const result = await captureAnimation({ scriptPath: animScript, framesDir }, deps);
    expect(result.ok).toBe(false);
    expect(result.frameCount).toBe(2);
    expect(result.diagnostics[0].message).toContain('tMs=100');
    expect(result.diagnostics[0].message).toContain('were kept');
    expect(readdirSync(framesDir).sort()).toEqual(['frame-0000.png', 'frame-0001.png']);
  });

  it('ffmpeg exits non-zero at finalize → ok:false with cli.export-exception; mp4 deleted', async () => {
    const { deps, state, close } = makeDeps({}, (f) => { f.exitCode = 1; });
    const outPath = join(tmp, 'encode-fail.mp4');
    // Simulate the encoder having written the (corrupt) file before exiting 1.
    writeFileSync(outPath, 'corrupt-mp4-bytes');
    const result = await captureAnimation({ scriptPath: animScript, outPath }, deps);
    expect(result.ok).toBe(false);
    expect(result.outPath).toBeUndefined();
    expect(result.frameCount).toBe(3); // every frame was captured fine
    expect(state.ffmpeg!.written).toHaveLength(3);
    const d = result.diagnostics.find((x) => x.code === 'cli.export-exception');
    expect(d).toBeDefined();
    expect(d!.message).toContain('exited with code 1');
    expect(existsSync(outPath)).toBe(false); // partial artifact deleted
    expect(close).toHaveBeenCalled();
  });

  it('ffmpeg stdin write failure mid-encode → cli.export-exception (not a kernel error); mp4 deleted', async () => {
    const { deps, state, close } = makeDeps({}, (f) => { f.failWriteAt = 1; });
    const outPath = join(tmp, 'epipe.mp4');
    writeFileSync(outPath, 'partial-mp4-bytes');
    const result = await captureAnimation({ scriptPath: animScript, outPath }, deps);
    expect(result.ok).toBe(false);
    expect(result.outPath).toBeUndefined();
    expect(result.frameCount).toBe(1); // only frame 0's write succeeded
    const d = result.diagnostics.find((x) => x.code === 'cli.export-exception');
    expect(d).toBeDefined();
    expect(d!.message).toContain('EPIPE');
    expect(d!.message).toMatch(/encoder/i);
    // NOT misclassified as a solve/mesh/render failure.
    expect(result.diagnostics.some((x) => x.code === 'recompute.lowering.exception')).toBe(false);
    expect(state.ffmpeg!.killed).toBe(true);
    expect(existsSync(outPath)).toBe(false);
    expect(close).toHaveBeenCalled();
  });

  it('ffmpeg ENOENT in mp4 mode → ok:false before any browser; message suggests frames mode', async () => {
    const { deps, openPage } = makeDeps({
      spawnFfmpeg: vi.fn(() => new FakeFfmpeg(true) as unknown as FfmpegProcessLike),
    });
    const result = await captureAnimation({ scriptPath: animScript }, deps);
    expect(result.ok).toBe(false);
    expect(result.frameCount).toBe(0);
    expect(result.diagnostics[0].code).toBe('cli.export-exception');
    expect(result.diagnostics[0].message).toMatch(/frames mode|--frames|framesDir/);
    expect(openPage).not.toHaveBeenCalled(); // availability detected FIRST
  });

  it('fps override flows into the schedule; invalid override is a typed refusal', async () => {
    const { deps } = makeDeps();
    const framesDir = join(tmp, 'frames-fps');
    // fps=60 over 100 ms → max(2, ceil(6)) = 6 frames.
    const result = await captureAnimation({ scriptPath: animScript, framesDir, fps: 60 }, deps);
    expect(result.ok).toBe(true);
    expect(result.fps).toBe(60);
    expect(result.frameCount).toBe(6);

    const bad = await captureAnimation({ scriptPath: animScript, fps: 0 }, makeDeps().deps);
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics[0].code).toBe('cli.invalid-args');
    expect(bad.diagnostics[0].message).toMatch(/fps/);
  });

  it('happy path emits build / schedule / page / frame / total progress messages in order', async () => {
    const { deps } = makeDeps();
    const messages: string[] = [];
    const result = await captureAnimation(
      { scriptPath: animScript, outPath: join(tmp, 'progress.mp4'), onProgress: (m) => messages.push(m) },
      deps,
    );
    expect(result.ok).toBe(true);
    // Assert SUBSEQUENCE (order), not exact strings: each pattern must match
    // at a strictly later message index than the previous one.
    const patterns = [/build done/, /frames scheduled @ /, /page ready/, /^frame \d+\/\d+/, /^total \d+ms/];
    let from = 0;
    for (const p of patterns) {
      const idx = messages.findIndex((m, i) => i >= from && p.test(m));
      expect(idx, `expected a message matching ${p} after index ${from}; got: ${JSON.stringify(messages)}`)
        .toBeGreaterThanOrEqual(from);
      from = idx + 1;
    }
  });
});

describe('revolute-sweep fixture (animation smoke fixture stays green)', () => {
  it('builds with zero error diagnostics and carries the two-track animationView', async () => {
    const model = await buildModelFromFile({ file: 'tests/fixtures/animation/revolute-sweep.kcad.ts' });
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const anims = model.records.filter((r) => r.kind === 'animationView');
    expect(anims).toHaveLength(1);
    const metadata = anims[0].metadata as { tracks: Array<{ param: string }>; fps: number; durationMs: number };
    expect(metadata.fps).toBe(12);
    expect(metadata.durationMs).toBe(2000);
    expect(metadata.tracks.map((t) => t.param).sort()).toEqual(['armDeg', 'slideMm']);
  });
});
