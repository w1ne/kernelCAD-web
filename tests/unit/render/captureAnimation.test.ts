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
// safety at the animated poses is the verifyAnimation step (4b), which runs
// by default BEFORE the browser/ffmpeg phase. Tests that assert exact
// per-frame updateModelParams sequences or inject synthetic solve failures
// by call index pass `skipVerify: true` so the verification sweep's own
// updateModelParams calls don't shift the indices; the verification
// behavior itself is covered by the dedicated describe-block below against
// the real animation fixtures.

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

function makeFakePage(opts: { screenshotThrowAt?: number } = {}) {
  let screenshotCalls = 0;
  const page = {
    evaluate: vi.fn(async () => undefined),
    screenshot: vi.fn(async () => {
      screenshotCalls += 1;
      // 1-based: throw on the Nth frame screenshot (frame index N-1). A
      // browser op throwing mid-loop is an ENVIRONMENT fault.
      if (opts.screenshotThrowAt !== undefined && screenshotCalls === opts.screenshotThrowAt) {
        throw new Error('page.screenshot: Target page crashed');
      }
      return FAKE_PNG;
    }),
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
  pageOpts: { screenshotThrowAt?: number } = {},
) {
  const { handle, page, close } = makeFakePage(pageOpts);
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
    expect(result.failureKind).toBe('model');
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
    expect(result.failureKind).toBe('model');
    expect(openPage).not.toHaveBeenCalled();
    expect(spawnFfmpeg).not.toHaveBeenCalled();
    expect(paramCtl.calls).toHaveLength(0);
  });

  it('happy path (mp4): frame count from sampler, params forwarded in order, mp4 path returned', async () => {
    const { deps, state, close } = makeDeps();
    const outPath = join(tmp, 'out.mp4');
    const result = await captureAnimation({ scriptPath: animScript, outPath, skipVerify: true }, deps);
    expect(result.ok).toBe(true);
    expect(result.outPath).toBe(outPath);
    expect(result.frameCount).toBe(3);
    expect(result.durationMs).toBe(100);
    expect(result.fps).toBe(30);
    expect(result.diagnostics).toEqual([]);
    expect(result.failureKind).toBeUndefined();
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
    const result = await captureAnimation({ scriptPath: animScript, outPath, skipVerify: true }, deps);
    expect(result.ok).toBe(false);
    expect(result.outPath).toBeUndefined();
    expect(result.frameCount).toBe(1); // only frame 0 made it
    const d = result.diagnostics.find((x) => x.code === 'recompute.lowering.exception');
    expect(d).toBeDefined();
    expect(d!.message).toContain('tMs=50');
    expect(d!.message).toContain('synthetic solve failure');
    expect(result.failureKind).toBe('model');
    expect(state.ffmpeg!.ended).toBe(true);
    expect(state.ffmpeg!.killed).toBe(true);
    expect(existsSync(outPath)).toBe(false); // partial artifact deleted
    expect(close).toHaveBeenCalled(); // no zombie chromium
  });

  it('mid-frame browser render failure → abort with failureKind environment + cli.export-exception (NOT a model fault)', async () => {
    // page.screenshot throws on the 2nd frame (index 1, tMs=50). A browser
    // op throwing is the ENVIRONMENT, not the kernel — review fix #2 split.
    const { deps, state, close } = makeDeps({}, undefined, { screenshotThrowAt: 2 });
    const outPath = join(tmp, 'render-fail.mp4');
    writeFileSync(outPath, 'partial-mp4-bytes');
    const result = await captureAnimation({ scriptPath: animScript, outPath, skipVerify: true }, deps);
    expect(result.ok).toBe(false);
    expect(result.failureKind).toBe('environment');
    expect(result.frameCount).toBe(1); // only frame 0 made it through the write
    const d = result.diagnostics.find((x) => x.code === 'cli.export-exception');
    expect(d).toBeDefined();
    expect(d!.message).toContain('tMs=50');
    expect(d!.message).toMatch(/browser render|screenshot/);
    // NOT misclassified as a kernel solve/mesh failure.
    expect(result.diagnostics.some((x) => x.code === 'recompute.lowering.exception')).toBe(false);
    expect(result.outPath).toBeUndefined();
    expect(state.ffmpeg!.killed).toBe(true);
    expect(existsSync(outPath)).toBe(false); // partial artifact deleted
    expect(close).toHaveBeenCalled();
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
    const result = await captureAnimation({ scriptPath: animScript, framesDir, skipVerify: true }, deps);
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
    expect(result.failureKind).toBe('environment');
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
    expect(result.failureKind).toBe('environment');
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
    expect(result.failureKind).toBe('environment');
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
    expect(bad.failureKind).toBe('model');
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

describe('captureAnimation pose verification (step 4b)', () => {
  const COLLIDING_FIXTURE = 'tests/fixtures/animation/colliding-sweep.kcad.ts';

  it('collision fixture: verify runs BEFORE the browser/ffmpeg phase, capture still completes, result carries verified:false + collisions', async () => {
    const { deps, openPage, spawnFfmpeg, state } = makeDeps();
    const messages: string[] = [];
    const outPath = join(tmp, 'colliding.mp4');
    const result = await captureAnimation(
      { scriptPath: COLLIDING_FIXTURE, outPath, onProgress: (m) => messages.push(m) },
      deps,
    );
    // Capture SUCCEEDS — the MP4 is evidence; collisions don't flip ok.
    expect(result.ok).toBe(true);
    expect(result.outPath).toBe(outPath);
    expect(result.frameCount).toBeGreaterThan(0);
    expect(result.verified).toBe(false);
    expect(result.verifySkipped).toBeUndefined();
    expect(result.collisions.length).toBeGreaterThanOrEqual(1);
    for (const c of result.collisions) {
      expect(c.tMs).toBeGreaterThan(0);
      expect(c.tMs).toBeLessThan(result.durationMs);
      expect([c.a, c.b].sort()).toEqual(['arm', 'base']);
    }
    // The animation.collision diagnostics ride on the (otherwise ok) result.
    const collisionDiags = result.diagnostics.filter((d) => d.code === 'animation.collision');
    expect(collisionDiags).toHaveLength(result.collisions.length);
    // Page/ffmpeg phases still ran — frames were rendered and encoded.
    expect(openPage).toHaveBeenCalled();
    expect(spawnFfmpeg).toHaveBeenCalled();
    expect(state.ffmpeg!.written).toHaveLength(result.frameCount);
    // Ordering: verification progress precedes the page-ready message.
    const verifyIdx = messages.findIndex((m) => /^verify: \d+ poses/.test(m));
    const foundIdx = messages.findIndex((m) => /^verify: \d+ collisions found$/.test(m));
    const pageIdx = messages.findIndex((m) => /^page ready/.test(m));
    expect(verifyIdx).toBeGreaterThanOrEqual(0);
    expect(foundIdx).toBeGreaterThan(verifyIdx);
    expect(pageIdx).toBeGreaterThan(foundIdx);
  }, 120_000);

  it('skipVerify: verification never runs; result says verifySkipped with no collisions', async () => {
    const { deps } = makeDeps();
    const outPath = join(tmp, 'colliding-skip.mp4');
    const messages: string[] = [];
    const result = await captureAnimation(
      { scriptPath: COLLIDING_FIXTURE, outPath, skipVerify: true, onProgress: (m) => messages.push(m) },
      deps,
    );
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(false);
    expect(result.verifySkipped).toBe(true);
    expect(result.collisions).toEqual([]);
    expect(result.diagnostics.some((d) => d.code === 'animation.collision')).toBe(false);
    expect(messages.some((m) => m.startsWith('verify:'))).toBe(false);
  }, 120_000);

  it('verifySampleTimesMs replaces the keyframe sample set (collision pose excluded → verified clean)', async () => {
    const { deps } = makeDeps();
    const outPath = join(tmp, 'colliding-times.mp4');
    const messages: string[] = [];
    const result = await captureAnimation(
      {
        scriptPath: COLLIDING_FIXTURE,
        outPath,
        // Only the two keyed poses — the mid-travel collision pose (tMs=500)
        // is deliberately excluded, so verification reports clean.
        verifySampleTimesMs: [0, 1000],
        onProgress: (m) => messages.push(m),
      },
      deps,
    );
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.collisions).toEqual([]);
    expect(messages).toContain('verify: clean');
    expect(messages.some((m) => /^verify: 2 poses/.test(m))).toBe(true);
  }, 120_000);

  it('verifyEveryNthFrame unions frame times onto the sample set (catches the collision a sparse explicit set missed)', async () => {
    const { deps } = makeDeps();
    const outPath = join(tmp, 'colliding-nth.mp4');
    const result = await captureAnimation(
      {
        scriptPath: COLLIDING_FIXTURE,
        outPath,
        // [0] alone is clean; every 4th frame time of the 12-frame schedule
        // adds mid-travel poses (~33° / ~65°) that DO collide.
        verifySampleTimesMs: [0],
        verifyEveryNthFrame: 4,
        onProgress: () => undefined,
      },
      deps,
    );
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(false);
    expect(result.collisions.length).toBeGreaterThanOrEqual(1);
    // The collision rows sit at frame times, none of which is 0.
    expect(result.collisions.every((c) => c.tMs > 0)).toBe(true);
  }, 120_000);

  it('invalid verifyEveryNthFrame → warn diagnostic + ignored (default sample set still verifies); never a hard throw', async () => {
    const { deps } = makeDeps();
    const outPath = join(tmp, 'bad-nth.mp4');
    const result = await captureAnimation(
      // 0 is invalid (< 1); contract is warn + ignore, not refuse.
      { scriptPath: animScript, outPath, verifyEveryNthFrame: 0 },
      deps,
    );
    expect(result.ok).toBe(true);
    // Verification still ran on the keyframe sample set — clean box fixture.
    expect(result.verified).toBe(true);
    const warn = result.diagnostics.find(
      (d) => d.code === 'cli.invalid-args' && d.severity === 'warn',
    );
    expect(warn).toBeDefined();
    expect(warn!.message).toMatch(/verifyEveryNthFrame/);
    expect(warn!.message).toMatch(/ignoring/i);
  }, 120_000);

  it('clean fixture: verified true with no collisions on the full default sample set', async () => {
    const { deps } = makeDeps();
    const outPath = join(tmp, 'clean.mp4');
    const result = await captureAnimation(
      { scriptPath: 'tests/fixtures/animation/revolute-sweep.kcad.ts', outPath },
      deps,
    );
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.collisions).toEqual([]);
  }, 120_000);
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
