// src/agent/render/captureAnimation.ts
//
// Typed animation-capture engine. Powers `scripts/captureAnimationView.mjs`
// (thin argv wrapper) and the upcoming CLI / MCP animation surfaces.
//
// Pipeline: buildModel → build-error diagnostics gate → last animationView
// record → sampleTracks (shared animationSampler — Studio playback must
// agree bit-for-bit) → animation-pose interference verification
// (verifyAnimation, default-on; BEFORE any browser/ffmpeg cost) → per
// frame: updateModelParams + meshFeaturesPerFeature (per-session triangle
// cache keeps warm frames ~5 ms) → demo-player page render → PNG → ffmpeg
// stdin (MP4 mode) or frame-%04d.png files (framesDir mode, zero external
// deps).
//
// DECISION (agent-animation workstream): capture does NOT run the
// full-range mechanism-truth probe (`kernelcad render` does). On real
// assemblies that probe sweeps every mate's full limit range BEFORE frame 1
// — measured at 48 minutes on the gearfinity planetary stage — and its
// verdict covers poses the animation may never visit. Capture's
// precondition gate is cheap build-level diagnostics; motion safety for the
// poses the animation ACTUALLY visits is checked by the animation-pose
// interference verification (`verifyAnimation`, step 4b — keyframe times +
// segment midpoints by default), whose cost is bounded by the keyframe
// schedule. Collisions do NOT abort the capture (the MP4 is evidence): the
// result reports `verified: false` + `collisions` and CLI surfaces map that
// to their exit code; `skipVerify` opts out entirely.
//
// Failure surface is typed: every refusal returns `{ ok: false }` plus
// CompilerDiagnostics drawn from the EXISTING registry vocabulary — no new
// codes are minted here:
//   - no animationView record / bad fps  → 'cli.invalid-args'
//                                          (the export command's
//                                          "script resolved to zero parts"
//                                          precedent)
//   - script build failure               → 'cli.script-exception'
//   - build-time error diagnostics       → the model's own diagnostics,
//                                          passed through
//   - per-frame solve/mesh/render throw  → 'recompute.lowering.exception'
//   - ffmpeg missing / encode failure /
//     frame output write failure         → 'cli.export-exception'
//
// Per-frame failure containment: a frame whose param-update/solve/mesh/render
// throws aborts the capture cleanly — ffmpeg stdin ended + process killed,
// the partial MP4 deleted (never reported as success); framesDir mode keeps
// the already-written PNGs but the result still says ok:false.

import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { Page } from 'playwright';
import {
  buildModelFromFile,
  updateModelParams,
  type BuiltModel,
  type ParamUpdateEdit,
} from '../../modeling/buildModel';
import { meshFeaturesPerFeature } from '../../modeling/capture/featureMeshing';
import { serializeForBridge } from '../../modeling/capture/featureMeshSerialize';
import type { CompilerDiagnostic, DiagnosticCode } from '../../shared/diagnostics/diagnostic';
import { withNextAction, withNextActions } from '../../shared/diagnostics/diagnostic';
import type { AnimationViewMetadata } from '../../shared/intent/animationViewRecord';
import { keyframeSampleSet, sampleTracks } from './animationSampler';
import { verifyAnimation, type AnimationCollision } from './verifyAnimation';
import {
  DEFAULT_RENDER_BASE_URL,
  HEADLESS_VIEWPORT,
  loadFeatureMeshesIntoPage,
  openDemoPlayerPage,
  type DemoPlayerPageHandle,
} from './headlessRender';

// `page.evaluate(...)` callbacks execute inside the browser. The CLI
// tsconfig (lib: ES2022, no DOM) doesn't know that, so declare the narrow
// shim of the demo-player API this engine drives (same pattern as
// headlessRender.ts; the full API lives in DemoPlayerPage.tsx, which the
// CLI build deliberately excludes).
declare const window: {
  __demoPlayer?: {
    setVersion: (v: string) => void;
    onEvent: (e: unknown) => void;
    advance: (ms: number) => void;
    forceFullOpacity: () => void;
    showOnlyTailFeatures: () => void;
    setRenderView: (view: string) => void;
  };
};

export interface CaptureAnimationOpts {
  scriptPath: string;
  /** MP4 output path; default `<scriptDir>/<basename>-animation.mp4`.
   *  Ignored in framesDir mode. */
  outPath?: string;
  /** PNG-sequence mode: write `frame-%04d.png` files here and skip ffmpeg
   *  entirely (zero external dependencies). */
  framesDir?: string;
  /** Override the animationView record's fps. */
  fps?: number;
  /** Progress sink for long captures (build done, schedule, verify, page
   *  ready, every 10th frame, encode done, total). Default: no-op. The
   *  script wrapper passes one that writes timestamped lines to stderr. */
  onProgress?: (msg: string) => void;
  /** Skip the animation-pose interference verification that otherwise runs
   *  by default (after build + schedule, BEFORE the browser/ffmpeg phase). */
  skipVerify?: boolean;
  /** Power knob: explicit timeline positions (ms) to verify at, replacing
   *  the default keyframe sample set (key times + segment midpoints). */
  verifySampleTimesMs?: number[];
  /** Power knob: additionally verify at every n-th FRAME time of the fps
   *  schedule (unioned with the keyframe sample set / verifySampleTimesMs). */
  verifyEveryNthFrame?: number;
}

/** Which side is at fault when a capture refuses or aborts. Lets CLI/MCP
 *  surfaces map failures to exit codes without string-matching messages:
 *  'model' = the script/model is at fault (build error, no animationView
 *  record, bad record fps, a pose the kernel cannot solve/mesh/render);
 *  'environment' = the surroundings are (ffmpeg missing or crashed, browser
 *  bootstrap failure, frame output write failure). */
export type CaptureFailureKind = 'model' | 'environment';

export interface CaptureAnimationResult {
  ok: boolean;
  /** MP4 path (mp4 mode) or framesDir (PNG-sequence mode); set on success. */
  outPath?: string;
  /** Frames successfully captured (== scheduled frames on success). */
  frameCount: number;
  /** Animation timeline duration in milliseconds (max key atMs). */
  durationMs: number;
  /** Resolved frames-per-second the schedule was sampled at. */
  fps: number;
  diagnostics: CompilerDiagnostic[];
  /** True when the animation-pose interference verification ran AND every
   *  sampled pose was collision-free. False when collisions were found, when
   *  verification was skipped (`verifySkipped` discriminates), or when the
   *  capture refused before verification could run. Collisions do NOT flip
   *  `ok` — the MP4/frames are still produced as evidence; CLI surfaces map
   *  `collisions` to their exit code. */
  verified: boolean;
  /** One row per colliding pair per verified pose (empty when clean,
   *  skipped, or refused before verification). The matching
   *  `animation.collision` error diagnostics ride on `diagnostics`. */
  collisions: AnimationCollision[];
  /** True when `skipVerify` suppressed verification. */
  verifySkipped?: boolean;
  /** Set on every ok:false result; absent on success. */
  failureKind?: CaptureFailureKind;
}

/** Minimal ffmpeg child-process surface the engine drives; lets unit tests
 *  inject a fake without spawning a real encoder. */
export interface FfmpegProcessLike {
  stdin: {
    write(chunk: Buffer, cb: (err?: Error | null) => void): unknown;
    end(): void;
  };
  once(event: 'spawn', listener: () => void): unknown;
  once(event: 'error', listener: (err: Error) => void): unknown;
  once(event: 'close', listener: (code: number | null) => void): unknown;
  kill(signal?: NodeJS.Signals): unknown;
}

/** Injection seams for unit tests (browser / ffmpeg stay out of the test
 *  process). All default to the real implementations; the public API
 *  (`captureAnimation(opts)`) is unchanged for production callers. */
export interface CaptureAnimationDeps {
  openPage?: typeof openDemoPlayerPage;
  spawnFfmpeg?: (args: readonly string[]) => FfmpegProcessLike;
}

function defaultSpawnFfmpeg(args: readonly string[]): FfmpegProcessLike {
  const proc = spawn('ffmpeg', [...args], { stdio: ['pipe', 'ignore', 'pipe'] });
  // Drain stderr so the encoder never blocks on a full pipe buffer.
  proc.stderr?.on('data', () => undefined);
  // An encoder dying mid-encode delivers EPIPE on stdin; without a stream
  // 'error' listener Node crashes the whole process before the typed
  // failure can be returned. The per-write callback already routes the
  // same failure into the frame loop, so the stream-level event is noise.
  proc.stdin?.on('error', () => undefined);
  return proc as unknown as FfmpegProcessLike;
}

function diag(code: DiagnosticCode, message: string, hint: string): CompilerDiagnostic {
  return withNextAction({ target: 'export-occt', code, severity: 'error', message, hint });
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function animationFrameFileName(index: number): string {
  return `frame-${String(index).padStart(4, '0')}.png`;
}

/** Wait for ffmpeg to exit, bounded by `timeoutMs` (abort path only — a
 *  SIGKILLed encoder normally closes immediately, but never hang cleanup). */
function waitFfmpegCloseBounded(proc: FfmpegProcessLike, timeoutMs: number): Promise<void> {
  return new Promise<void>((res) => {
    const t = setTimeout(res, timeoutMs);
    t.unref?.();
    proc.once('close', () => {
      clearTimeout(t);
      res();
    });
  });
}

/**
 * Capture the script's animationView timeline.
 *
 * Precondition gate (agent-animation workstream decision): cheap
 * build-level diagnostics ONLY — any error-severity diagnostic on the built
 * model refuses the capture before a browser or encoder starts. Capture
 * deliberately does NOT run the full-range mechanism-truth probe that
 * `kernelcad render` runs: that probe sweeps every mate's full limit range
 * (48 minutes before frame 1 on the gearfinity planetary stage) and judges
 * poses the animation never visits. Interference at the poses the animation
 * ACTUALLY visits is verified by the animation-pose interference check
 * (`verifyAnimation`, default-on at step 4b; `skipVerify` opts out), whose
 * cost is bounded by the keyframe schedule. Collisions don't abort the
 * capture — the result carries `verified` / `collisions` instead.
 */
export async function captureAnimation(
  opts: CaptureAnimationOpts,
  deps: CaptureAnimationDeps = {},
): Promise<CaptureAnimationResult> {
  const openPage = deps.openPage ?? openDemoPlayerPage;
  const spawnFfmpeg = deps.spawnFfmpeg ?? defaultSpawnFfmpeg;
  const onProgress = opts.onProgress ?? (() => undefined);
  const t0 = Date.now();

  // Animation-pose verification state, threaded onto EVERY result (refusals
  // before verification report verified:false with no collisions).
  let verified = false;
  let collisions: AnimationCollision[] = [];
  const verifySkipped = opts.skipVerify === true;
  const verifyFields = () => ({
    verified,
    collisions,
    ...(verifySkipped ? { verifySkipped: true } : {}),
  });

  const scriptPath = resolve(opts.scriptPath);
  const framesDir = opts.framesDir !== undefined ? resolve(opts.framesDir) : undefined;
  const stem = basename(scriptPath).replace(/\.kcad\.ts$/, '').replace(/\.ts$/, '');
  const outPath = framesDir
    ?? resolve(opts.outPath ?? join(dirname(scriptPath), `${stem}-animation.mp4`));

  // 1. Build the model.
  let model: BuiltModel;
  try {
    model = await buildModelFromFile({ file: scriptPath });
  } catch (e) {
    return {
      ok: false, frameCount: 0, durationMs: 0, fps: opts.fps ?? 0, failureKind: 'model', ...verifyFields(),
      diagnostics: [diag(
        'cli.script-exception',
        `captureAnimation: building '${scriptPath}' failed: ${errMsg(e)}`,
        'Fix the script error in the message, then re-run the capture.',
      )],
    };
  }
  onProgress(`build done (${Date.now() - t0}ms)`);

  // 2. Build-error diagnostics gate — capture's only precondition check
  //    (see the function jsdoc / file header: the full-range mechanism
  //    probe was deliberately removed; animated-pose interference is the
  //    upcoming verifyAnimation surface's job). Refuse before any browser
  //    or encoder starts, passing the model's own diagnostics through.
  const buildErrors = model.diagnostics.filter((d) => d.severity === 'error');
  if (buildErrors.length > 0) {
    return {
      ok: false, frameCount: 0, durationMs: 0, fps: opts.fps ?? 0, failureKind: 'model', ...verifyFields(),
      diagnostics: withNextActions(model.diagnostics),
    };
  }

  // 3. Find the animationView record — last wins (metadata is already
  //    normalized to the track shape by the capture session; the legacy
  //    sweep form arrives as one linear two-key track).
  const animRecords = model.records.filter((r) => r.kind === 'animationView');
  if (animRecords.length === 0) {
    return {
      ok: false, frameCount: 0, durationMs: 0, fps: opts.fps ?? 0, failureKind: 'model', ...verifyFields(),
      diagnostics: [diag(
        'cli.invalid-args',
        `The script has no animationView({...}) record; nothing to capture: ${scriptPath}`,
        "Declare a numeric param() and add e.g. animationView({ param: 'driveAngleDeg', from: 0, to: 360, durationMs: 4000 }), then re-run.",
      )],
    };
  }
  const metadata = animRecords[animRecords.length - 1]
    .metadata as unknown as AnimationViewMetadata & { diagnostics?: CompilerDiagnostic[] };
  // Capture-time warns stashed on the record (range clamps, shadowed
  // records) ride along on every result so the agent surface never loses
  // them.
  const stashedWarns = withNextActions(metadata.diagnostics ?? []);

  const fps = opts.fps ?? metadata.fps;
  if (!Number.isFinite(fps) || fps <= 0) {
    return {
      ok: false, frameCount: 0, durationMs: metadata.durationMs, fps, failureKind: 'model', ...verifyFields(),
      diagnostics: [...stashedWarns, diag(
        'cli.invalid-args',
        `captureAnimation: fps must be a finite number > 0 (got ${fps}).`,
        'Pass a positive fps override, or fix the animationView fps field.',
      )],
    };
  }

  // 4. Frame schedule from the shared sampler.
  const { frames, durationMs } = sampleTracks(metadata.tracks, fps);
  onProgress(`${frames.length} frames scheduled @ ${fps} fps (durationMs=${durationMs})`);

  // 4b. Animation-pose interference verification — BEFORE the browser/ffmpeg
  //     phase (cheaper to fail before rendering; the poses are the same model
  //     state either way). Default sample set = keyframe times + segment
  //     midpoints; `verifySampleTimesMs` replaces it and `verifyEveryNthFrame`
  //     unions every n-th frame time of the fps schedule on top. Collisions
  //     do NOT abort the capture — the MP4/frames are evidence — but a pose
  //     that fails to SOLVE during verification is a model fault and refuses
  //     here, exactly as it would have in the frame loop.
  if (!verifySkipped) {
    let sampleTimesMs = opts.verifySampleTimesMs;
    const nth = opts.verifyEveryNthFrame;
    if (nth !== undefined && Number.isFinite(nth) && nth >= 1) {
      const base = sampleTimesMs ?? keyframeSampleSet(metadata.tracks);
      const extra = frames.filter((_, i) => i % Math.floor(nth) === 0).map((f) => f.tMs);
      sampleTimesMs = [...new Set([...base, ...extra])].sort((a, b) => a - b);
    }
    const v = await verifyAnimation(
      model,
      metadata.tracks,
      sampleTimesMs !== undefined ? { sampleTimesMs } : {},
    );
    onProgress(`verify: ${v.posesSampled} poses (${Date.now() - t0}ms)`);
    collisions = v.collisions;
    stashedWarns.push(...v.diagnostics);
    // Honesty rule: a pose the kernel cannot solve is a model fault — refuse
    // before any browser or encoder starts (never silently skip a pose).
    const poseFailures = v.diagnostics.filter(
      (d) => d.severity === 'error' && d.code !== 'animation.collision',
    );
    if (poseFailures.length > 0) {
      return {
        ok: false, frameCount: 0, durationMs, fps, failureKind: 'model', ...verifyFields(),
        diagnostics: [...stashedWarns],
      };
    }
    verified = v.ok;
    onProgress(
      collisions.length > 0 ? `verify: ${collisions.length} collisions found` : 'verify: clean',
    );
  }

  // 5. Cold mesh — populates the per-session triangle cache so the per-frame
  //    recompute below is warm.
  let initial;
  try {
    initial = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
  } catch (e) {
    return {
      ok: false, frameCount: 0, durationMs, fps, failureKind: 'model', ...verifyFields(),
      diagnostics: [...stashedWarns, diag(
        'recompute.lowering.exception',
        `captureAnimation: initial meshing failed: ${errMsg(e)}`,
        'Read the diagnostic message for the kernel error and fix the failing feature.',
      )],
    };
  }
  if (initial.failedFeatureIds.length > 0) {
    return {
      ok: false, frameCount: 0, durationMs, fps, failureKind: 'model', ...verifyFields(),
      diagnostics: [...stashedWarns, diag(
        'recompute.lowering.exception',
        `captureAnimation: ${initial.failedFeatureIds.length} feature(s) failed to compile: ${initial.failedFeatureIds.join(', ')}`,
        'Fix the failing feature(s) named in the message, then re-run the capture.',
      )],
    };
  }

  let pageHandle: DemoPlayerPageHandle | undefined;
  let ffmpeg: FfmpegProcessLike | undefined;
  let written = 0;

  /** Abort-path ffmpeg cleanup: end stdin, kill, wait bounded, delete the
   *  partial MP4 so no partial artifact can be mistaken for success.
   *  framesDir mode never has an ffmpeg process, and its already-written
   *  frames are deliberately kept. */
  const abortFfmpeg = async (): Promise<void> => {
    if (!ffmpeg) return;
    const proc = ffmpeg;
    ffmpeg = undefined;
    try { proc.stdin.end(); } catch { /* already closed */ }
    try { proc.kill('SIGKILL'); } catch { /* already exited */ }
    await waitFfmpegCloseBounded(proc, 1500);
    await rm(outPath, { force: true }).catch(() => undefined);
  };

  try {
    if (framesDir === undefined) {
      // MP4 mode: detect ffmpeg availability FIRST — before any browser
      // spins up — by waiting for the child's spawn/error event.
      ffmpeg = spawnFfmpeg([
        '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '22',
        outPath,
      ]);
      try {
        await new Promise<void>((res, rej) => {
          ffmpeg!.once('spawn', () => res());
          ffmpeg!.once('error', (err) => rej(err));
        });
      } catch (e) {
        ffmpeg = undefined;
        const enoent = (e as NodeJS.ErrnoException | null)?.code === 'ENOENT';
        return {
          ok: false, frameCount: 0, durationMs, fps, failureKind: 'environment', ...verifyFields(),
          diagnostics: [...stashedWarns, diag(
            'cli.export-exception',
            enoent
              ? 'ffmpeg was not found on PATH; MP4 capture requires it. Use the PNG-sequence frames mode (framesDir / --frames <dir>) which needs no external tools, or install ffmpeg.'
              : `ffmpeg failed to start: ${errMsg(e)}`,
            enoent
              ? 'Re-run in frames mode (framesDir / --frames <dir>), or install ffmpeg and retry.'
              : 'Read the diagnostic message for the spawn error, fix it, and retry.',
          )],
        };
      }
    } else {
      await mkdir(framesDir, { recursive: true });
    }

    // 6. Demo-player page via the shared bootstrap — CDP attach to an
    //    existing Chrome first (PW_CDP_URL ?? 127.0.0.1:9222), fresh
    //    chromium fallback.
    // VITE_PORT keeps the same host as DEFAULT_RENDER_BASE_URL (localhost) —
    // vite may bind ::1 only, where a 127.0.0.1 URL never connects.
    const port = process.env.VITE_PORT;
    pageHandle = await openPage({
      baseUrl: port !== undefined ? `http://localhost:${port}` : DEFAULT_RENDER_BASE_URL,
      // DemoPlayer's headless ViewerPane is fixed at 1920×1080; any other
      // viewport clips the canvas (headlessRender captures the full pane and
      // crops afterwards). Animation capture always emits 1920×1080 frames,
      // so CaptureAnimationOpts deliberately has no viewport options.
      viewport: HEADLESS_VIEWPORT,
      extraQueryParts: ['nowatermark=1'],
      cdpUrl: process.env.PW_CDP_URL ?? 'http://127.0.0.1:9222',
      gotoTimeoutMs: 90_000,
      readyTimeoutMs: 30_000,
      pageDefaultTimeoutMs: 180_000,
    });
    const page: Page = pageHandle.page;
    await page.evaluate(() => window.__demoPlayer!.setVersion('animation'));
    onProgress(`page ready (${Date.now() - t0}ms)`);

    // Initial load — populates the scene, then settle the AnimationEngine
    // to final state (matches captureRotateOnly).
    await loadFeatureMeshesIntoPage(page, initial.features.map(serializeForBridge), initial.bounds);
    for (const fm of initial.features) {
      await page.evaluate((e) => window.__demoPlayer!.onEvent(e), {
        kind: 'feature.compiled',
        featureId: fm.featureId,
        featureKind: fm.featureKind,
        predecessors: fm.predecessors,
        diagnostics: [],
        health: 'healthy',
        shape: null,
        op: fm.op,
      });
    }
    await page.evaluate(() => window.__demoPlayer!.advance(2000));
    await page.evaluate(() => window.__demoPlayer!.forceFullOpacity());
    await page.evaluate(() => window.__demoPlayer!.showOnlyTailFeatures());
    await page.evaluate(() => window.__demoPlayer!.setRenderView('iso'));

    // 7. Frame loop with per-frame failure containment. Two separate
    //    try-blocks so the diagnostic names the right subsystem: the
    //    param-update/solve/mesh/render phase reports
    //    'recompute.lowering.exception'; the frame OUTPUT write (ffmpeg
    //    stdin / frame PNG file) reports 'cli.export-exception' — an
    //    encoder dying mid-encode surfaces as an EPIPE on the write
    //    callback, which is not a kernel failure.
    for (let i = 0; i < frames.length; i += 1) {
      const frame = frames[i];
      let png: Buffer;
      try {
        const updates: ParamUpdateEdit[] = Object.entries(frame.values)
          .map(([name, value]) => ({ name, value }));
        await updateModelParams(model, updates);
        const meshing = await meshFeaturesPerFeature(
          model.records, model.session.paramTable, model.session,
        );
        await loadFeatureMeshesIntoPage(page, meshing.features.map(serializeForBridge), meshing.bounds);
        await page.evaluate(() => window.__demoPlayer!.forceFullOpacity());
        // Tick the AnimationEngine so Three.js renders the updated scene.
        await page.evaluate(() => window.__demoPlayer!.advance(16));
        png = await page.screenshot({ type: 'png' });
      } catch (e) {
        await abortFfmpeg();
        return {
          ok: false, frameCount: written, durationMs, fps, failureKind: 'model', ...verifyFields(),
          diagnostics: [...stashedWarns, diag(
            'recompute.lowering.exception',
            `captureAnimation: frame ${i} (tMs=${frame.tMs}) failed during param-update/solve/mesh/render: ${errMsg(e)}. `
              + (framesDir !== undefined
                ? `The ${written} frame PNG(s) already written to ${framesDir} were kept.`
                : 'The partial MP4 was deleted.'),
            'Fix the underlying solve/mesh error in the message, or adjust the animationView keyframes to avoid the failing pose.',
          )],
        };
      }
      try {
        if (framesDir !== undefined) {
          await writeFile(join(framesDir, animationFrameFileName(i)), png);
        } else {
          await new Promise<void>((res, rej) =>
            ffmpeg!.stdin.write(png, (err) => (err ? rej(err) : res())));
        }
      } catch (e) {
        await abortFfmpeg();
        return {
          ok: false, frameCount: written, durationMs, fps, failureKind: 'environment', ...verifyFields(),
          diagnostics: [...stashedWarns, diag(
            'cli.export-exception',
            framesDir !== undefined
              ? `captureAnimation: writing frame ${i} (tMs=${frame.tMs}) to ${framesDir} failed: ${errMsg(e)}. The ${written} frame PNG(s) already written were kept.`
              : `captureAnimation: the ffmpeg encoder rejected the frame ${i} (tMs=${frame.tMs}) stdin write: ${errMsg(e)}. The encoder likely crashed mid-encode; the partial MP4 was deleted.`,
            framesDir !== undefined
              ? 'Check the frames directory is writable and has free space, then re-run.'
              : 'Re-run in frames mode (framesDir / --frames <dir>) to bypass the encoder, or read the ffmpeg error and retry.',
          )],
        };
      }
      written += 1;
      if (written % 10 === 0 || written === frames.length) {
        onProgress(`frame ${written}/${frames.length} (tMs=${Math.round(frame.tMs)}) +${Date.now() - t0}ms`);
      }
    }

    // 8. Finalize.
    if (framesDir === undefined) {
      const proc = ffmpeg!;
      ffmpeg = undefined;
      proc.stdin.end();
      const code = await new Promise<number | null>((res, rej) => {
        proc.once('close', (c) => res(c));
        proc.once('error', (e) => rej(e));
      }).catch(() => -1);
      if (code !== 0) {
        await rm(outPath, { force: true }).catch(() => undefined);
        return {
          ok: false, frameCount: written, durationMs, fps, failureKind: 'environment', ...verifyFields(),
          diagnostics: [...stashedWarns, diag(
            'cli.export-exception',
            `ffmpeg exited with code ${code} while encoding ${outPath}; the partial MP4 was deleted.`,
            'Re-run in frames mode (framesDir / --frames <dir>) to bypass the encoder, or read the ffmpeg error and retry.',
          )],
        };
      }
      onProgress(`encode done: ${outPath}`);
    } else {
      onProgress(`${written} frames written to ${framesDir}`);
    }

    onProgress(`total ${Date.now() - t0}ms`);
    return { ok: true, outPath, frameCount: written, durationMs, fps, diagnostics: [...stashedWarns], ...verifyFields() };
  } catch (e) {
    // Unexpected non-frame failure (browser connect, page bootstrap, fs).
    await abortFfmpeg();
    return {
      ok: false, frameCount: written, durationMs, fps, failureKind: 'environment', ...verifyFields(),
      diagnostics: [...stashedWarns, diag(
        'cli.export-exception',
        `captureAnimation: ${errMsg(e)}`,
        'Read the diagnostic message; common causes are a missing studio dev server (run `npm run dev`) or a missing playwright chromium.',
      )],
    };
  } finally {
    if (pageHandle) await pageHandle.close();
  }
}
