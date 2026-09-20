// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
//   - per-frame param-update/solve/mesh  → 'recompute.lowering.exception'
//     throw                                (MODEL fault)
//   - per-frame browser render op throw  → 'cli.export-exception'
//     (load meshes / evaluate / screenshot — ENVIRONMENT fault)
//   - ffmpeg missing / encode failure /
//     frame output write failure         → 'cli.export-exception'
//
// Per-frame failure containment: a frame whose param-update/solve/mesh (model
// fault) OR browser render / output write (environment fault) throws aborts
// the capture cleanly — ffmpeg stdin ended + process killed, the partial MP4
// deleted (never reported as success); framesDir mode keeps the
// already-written PNGs but the result still says ok:false.

import { rm } from 'node:fs/promises';
import type { BuiltModel } from '../../modeling/buildModel';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { AnimationViewMetadata } from '../../shared/intent/animationViewRecord';
import type { AnimationCollision } from '../../modeling/animation/verifyAnimation';
import { sampleTracks } from '../../modeling/animation/animationSampler';
import { openDemoPlayerPage, type DemoPlayerPageHandle, type HeadlessObjectFilter } from './headlessRender';
import { resolveRenderBaseUrl, type ResolvedRenderBase } from './playerServer';
import {
  bootstrapPagePhase,
  buildErrorsGate,
  buildModelPhase,
  coldMeshPhase,
  defaultSpawnFfmpeg,
  diag,
  errMsg,
  finalizeCapturePhase,
  resolveAnimRecord,
  resolveCapturePaths,
  resolveFps,
  runFrameLoopPhase,
  startEncoderPhase,
  verifyPosesPhase,
  waitFfmpegCloseBounded,
} from './captureAnimationPhases';

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
   *  schedule (unioned with the keyframe sample set / verifySampleTimesMs).
   *  Contract: must be a finite number >= 1 (the floor is taken). An invalid
   *  value (non-finite or < 1) is NOT a hard error mid-API — it emits a
   *  `cli.invalid-args` WARNING diagnostic on the result and is ignored
   *  (the keyframe sample set / verifySampleTimesMs still runs). */
  verifyEveryNthFrame?: number;
  /** Object-visibility filter applied to the rendered scene — SAME shape
   *  `headlessRender` / `kernelcad render --focus/--hide` use ({ mode:
   *  'focus' | 'hide', patterns }). 'focus' shows only matching parts;
   *  'hide' hides them. Re-applied AFTER each frame's mesh reload, because
   *  loadFeatureMeshes rebuilds every feature group with visible:true (the
   *  filter would otherwise be wiped on frame 1). Visibility is a render-only
   *  concern — it does NOT affect the animation-pose interference
   *  verification, which always runs against the FULL model. */
  objectFilter?: HeadlessObjectFilter;
  /** Optional render-surface override (e.g. `http://localhost:5173` for a
   *  running studio dev server). When omitted, resolveRenderBaseUrl()
   *  provisions the bundled static player (dist/headless-player) on an
   *  ephemeral 127.0.0.1 port, so a capture needs NO running dev server.
   *  An explicit value takes resolveRenderBaseUrl's 'explicit' lane and
   *  bypasses provisioning entirely. */
  baseUrl?: string;
}

/** Which side is at fault when a capture refuses or aborts. Lets CLI/MCP
 *  surfaces map failures to exit codes without string-matching messages:
 *  'model' = the script/model is at fault (build error, no animationView
 *  record, bad record fps, a pose the kernel cannot solve/mesh);
 *  'environment' = the surroundings are (ffmpeg missing or crashed, browser
 *  bootstrap failure, a per-frame browser render op — load meshes /
 *  page.evaluate / screenshot — throwing, frame output write failure). */
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

export { animationFrameFileName } from './captureAnimationPhases';

type VerifyFieldsFn = () => Pick<CaptureAnimationResult, 'verified' | 'collisions' | 'verifySkipped'>;
type FrameList = ReturnType<typeof sampleTracks>['frames'];

function resolveCaptureDeps(
  deps: CaptureAnimationDeps,
  opts: CaptureAnimationOpts,
): {
  openPage: typeof openDemoPlayerPage;
  spawnFfmpeg: (args: readonly string[]) => FfmpegProcessLike;
  onProgress: (msg: string) => void;
} {
  const openPage = deps.openPage ?? openDemoPlayerPage;
  const spawnFfmpeg = deps.spawnFfmpeg ?? defaultSpawnFfmpeg;
  const onProgress = opts.onProgress ?? (() => undefined);
  return { openPage, spawnFfmpeg, onProgress };
}

async function runVerificationPhase(
  verifySkipped: boolean,
  opts: CaptureAnimationOpts,
  model: BuiltModel,
  metadata: AnimationViewMetadata,
  frames: FrameList,
  durationMs: number,
  fps: number,
  stashedWarns: CompilerDiagnostic[],
  onProgress: (msg: string) => void,
  t0: number,
): Promise<{ kind: 'done'; verified: boolean; collisions: AnimationCollision[] } | { kind: 'failure'; failure: CaptureAnimationResult }> {
  if (verifySkipped) return { kind: 'done', verified: false, collisions: [] };
  return verifyPosesPhase(opts, model, metadata, frames, durationMs, fps, stashedWarns, onProgress, t0);
}

async function closeCaptureResources(
  pageHandle: DemoPlayerPageHandle | undefined,
  renderSurface: ResolvedRenderBase | undefined,
): Promise<void> {
  if (pageHandle) await pageHandle.close();
  // Tear the ephemeral static-player server down on EVERY exit path
  // (success, typed refusal, throw) — a no-op for the explicit/dev-server
  // lanes.
  if (renderSurface) await renderSurface.close();
}

function captureThrowFailure(
  e: unknown,
  written: number,
  durationMs: number,
  fps: number,
  stashedWarns: CompilerDiagnostic[],
  verifyFields: VerifyFieldsFn,
): CaptureAnimationResult {
  return {
    ok: false, frameCount: written, durationMs, fps, failureKind: 'environment', ...verifyFields(),
    diagnostics: [...stashedWarns, diag(
      'cli.export-exception',
      `captureAnimation: ${errMsg(e)}`,
      'Read the diagnostic message; common causes are a missing playwright chromium or an unavailable render surface (run `npm run build:player` once to bundle the static player, or start `npm run dev`).',
    )],
  };
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
  const { openPage, spawnFfmpeg, onProgress } = resolveCaptureDeps(deps, opts);
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

  const { scriptPath, framesDir, outPath } = resolveCapturePaths(opts);

  // 1. Build the model.
  const buildResult = await buildModelPhase(scriptPath, opts, verifyFields);
  if ('failure' in buildResult) return buildResult.failure;
  const model = buildResult.model;
  onProgress(`build done (${Date.now() - t0}ms)`);

  // 2. Build-error diagnostics gate — capture's only precondition check
  //    (see the function jsdoc / file header: the full-range mechanism
  //    probe was deliberately removed; animated-pose interference is the
  //    upcoming verifyAnimation surface's job). Refuse before any browser
  //    or encoder starts, passing the model's own diagnostics through.
  const buildErrorsFailure = buildErrorsGate(model, opts, verifyFields);
  if (buildErrorsFailure) return buildErrorsFailure;

  // 3. Find the animationView record — last wins (metadata is already
  //    normalized to the track shape by the capture session; the legacy
  //    sweep form arrives as one linear two-key track).
  const animResult = resolveAnimRecord(model, opts, scriptPath, verifyFields);
  if ('failure' in animResult) return animResult.failure;
  const metadata = animResult.metadata;
  // Capture-time warns stashed on the record (range clamps, shadowed
  // records) ride along on every result so the agent surface never loses
  // them.
  const stashedWarns = animResult.stashedWarns;

  const fpsResult = resolveFps(opts, metadata, stashedWarns, verifyFields);
  if ('failure' in fpsResult) return fpsResult.failure;
  const fps = fpsResult.fps;

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
  const outcome = await runVerificationPhase(verifySkipped, opts, model, metadata, frames, durationMs, fps, stashedWarns, onProgress, t0);
  if (outcome.kind === 'failure') return outcome.failure;
  verified = outcome.verified;
  collisions = outcome.collisions;

  // 5. Cold mesh — populates the per-session triangle cache so the per-frame
  //    recompute below is warm.
  const meshResult = await coldMeshPhase(model, durationMs, fps, stashedWarns, verifyFields);
  if ('failure' in meshResult) return meshResult.failure;
  const initial = meshResult.initial;

  let pageHandle: DemoPlayerPageHandle | undefined;
  /** Provisioned render surface (bundled static player unless opts.baseUrl
   *  overrides it). Torn down in the same `finally` as the page so a failed
   *  capture never leaks a listening socket. */
  let renderSurface: ResolvedRenderBase | undefined;
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
    const encoderResult = await startEncoderPhase(framesDir, outPath, fps, spawnFfmpeg, durationMs, stashedWarns, verifyFields);
    if ('failure' in encoderResult) return encoderResult.failure;
    ffmpeg = encoderResult.ffmpeg;

    // 6. Demo-player page via the shared bootstrap — CDP attach to an
    //    existing Chrome first (PW_CDP_URL ?? 127.0.0.1:9222), fresh
    //    chromium fallback.
    //    The base URL is PROVISIONED, not assumed: resolveRenderBaseUrl
    //    serves the bundled static player (dist/headless-player) on an
    //    ephemeral 127.0.0.1 port, falling back to a live dev-server probe
    //    (DEFAULT_RENDER_BASE_URL / VITE_PORT) and finally to a typed error
    //    naming the fix. `opts.baseUrl` takes the 'explicit' lane and skips
    //    provisioning. Mirrors `kernelcad render` (#625) — one source of
    //    truth for how a render surface is obtained.
    renderSurface = await resolveRenderBaseUrl(opts.baseUrl);
    if (renderSurface.source !== 'explicit') {
      onProgress(`render surface = ${renderSurface.source} (${renderSurface.baseUrl})`);
    }
    pageHandle = await bootstrapPagePhase(renderSurface.baseUrl, initial, t0, onProgress, openPage);

    const loopResult = await runFrameLoopPhase({
      frames, model, page: pageHandle.page, ffmpeg, framesDir, durationMs, fps, stashedWarns, verifyFields, onProgress, opts, t0, abortFfmpeg,
    });
    if ('failure' in loopResult) return loopResult.failure;
    written = loopResult.written;

    const finalFailure = await finalizeCapturePhase({
      framesDir, ffmpeg, clearFfmpeg: () => { ffmpeg = undefined; }, outPath, written, durationMs, fps, stashedWarns, verifyFields, onProgress,
    });
    if (finalFailure) return finalFailure;

    onProgress(`total ${Date.now() - t0}ms`);
    return { ok: true, outPath, frameCount: written, durationMs, fps, diagnostics: [...stashedWarns], ...verifyFields() };
  } catch (e) {
    // Unexpected non-frame failure (browser connect, page bootstrap, fs).
    await abortFfmpeg();
    return captureThrowFailure(e, written, durationMs, fps, stashedWarns, verifyFields);
  } finally {
    await closeCaptureResources(pageHandle, renderSurface);
  }
}
