// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/render/captureAnimationPhases.ts
//
// Phase helpers for the typed animation-capture engine in
// `captureAnimation.ts` (build gate → schedule → pose verification → cold
// mesh → encoder/page bootstrap → frame loop → finalize). Split out so
// neither module grows past the max-lines ratchet; behaviour is the same
// as the single-function pipeline it was extracted from.

import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { Page } from 'playwright';
import {
  buildModelFromFile,
  updateModelParams,
  type BuiltModel,
  type ParamUpdateEdit,
} from '../../composition/buildModel';
import { meshFeaturesPerFeature } from '../../modeling/capture/featureMeshing';
import { serializeForBridge } from '../../modeling/capture/featureMeshSerialize';
import type { CompilerDiagnostic, DiagnosticCode } from '../../shared/diagnostics/diagnostic';
import { withNextAction, withNextActions } from '../../shared/diagnostics/diagnostic';
import type { AnimationViewMetadata } from '../../shared/intent/animationViewRecord';
import { keyframeSampleSet, sampleTracks } from '../../modeling/animation/animationSampler';
import { verifyAnimation, type AnimationCollision } from '../../modeling/animation/verifyAnimation';
import {
  HEADLESS_VIEWPORT,
  loadFeatureMeshesIntoPage,
  openDemoPlayerPage,
  type DemoPlayerPageHandle,
  type HeadlessObjectFilter,
} from './headlessRender';
import type {
  CaptureAnimationOpts,
  CaptureAnimationResult,
  FfmpegProcessLike,
} from './captureAnimation';

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
    applyObjectVisibilityFilter: (filter: HeadlessObjectFilter) => unknown;
  };
};

export function defaultSpawnFfmpeg(args: readonly string[]): FfmpegProcessLike {
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

export function diag(code: DiagnosticCode, message: string, hint: string): CompilerDiagnostic {
  return withNextAction({ target: 'export-occt', code, severity: 'error', message, hint });
}

function warnDiag(code: DiagnosticCode, message: string, hint: string): CompilerDiagnostic {
  return withNextAction({ target: 'export-occt', code, severity: 'warn', message, hint });
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function animationFrameFileName(index: number): string {
  return `frame-${String(index).padStart(4, '0')}.png`;
}

/** Wait for ffmpeg to exit, bounded by `timeoutMs` (abort path only — a
 *  SIGKILLed encoder normally closes immediately, but never hang cleanup). */
export function waitFfmpegCloseBounded(proc: FfmpegProcessLike, timeoutMs: number): Promise<void> {
  return new Promise<void>((res) => {
    const t = setTimeout(res, timeoutMs);
    t.unref?.();
    proc.once('close', () => {
      clearTimeout(t);
      res();
    });
  });
}

type FrameList = ReturnType<typeof sampleTracks>['frames'];
type MeshResult = Awaited<ReturnType<typeof meshFeaturesPerFeature>>;
type VerifyFields = Pick<CaptureAnimationResult, 'verified' | 'collisions' | 'verifySkipped'>;
type VerifyFieldsFn = () => VerifyFields;

export function resolveCapturePaths(opts: CaptureAnimationOpts): { scriptPath: string; framesDir: string | undefined; outPath: string } {
  const scriptPath = resolve(opts.scriptPath);
  const framesDir = opts.framesDir !== undefined ? resolve(opts.framesDir) : undefined;
  const stem = basename(scriptPath).replace(/\.kcad\.ts$/, '').replace(/\.ts$/, '');
  const outPath = framesDir
    ?? resolve(opts.outPath ?? join(dirname(scriptPath), `${stem}-animation.mp4`));
  return { scriptPath, framesDir, outPath };
}

export async function buildModelPhase(
  scriptPath: string,
  opts: CaptureAnimationOpts,
  verifyFields: VerifyFieldsFn,
): Promise<{ model: BuiltModel } | { failure: CaptureAnimationResult }> {
  try {
    const model = await buildModelFromFile({ file: scriptPath });
    return { model };
  } catch (e) {
    return {
      failure: {
        ok: false, frameCount: 0, durationMs: 0, fps: opts.fps ?? 0, failureKind: 'model', ...verifyFields(),
        diagnostics: [diag(
          'cli.script-exception',
          `captureAnimation: building '${scriptPath}' failed: ${errMsg(e)}`,
          'Fix the script error in the message, then re-run the capture.',
        )],
      },
    };
  }
}

export function buildErrorsGate(
  model: BuiltModel,
  opts: CaptureAnimationOpts,
  verifyFields: VerifyFieldsFn,
): CaptureAnimationResult | null {
  const buildErrors = model.diagnostics.filter((d) => d.severity === 'error');
  if (buildErrors.length > 0) {
    return {
      ok: false, frameCount: 0, durationMs: 0, fps: opts.fps ?? 0, failureKind: 'model', ...verifyFields(),
      diagnostics: withNextActions(model.diagnostics),
    };
  }
  return null;
}

export function resolveAnimRecord(
  model: BuiltModel,
  opts: CaptureAnimationOpts,
  scriptPath: string,
  verifyFields: VerifyFieldsFn,
): { metadata: AnimationViewMetadata & { diagnostics?: CompilerDiagnostic[] }; stashedWarns: CompilerDiagnostic[] } | { failure: CaptureAnimationResult } {
  const animRecords = model.records.filter((r) => r.kind === 'animationView');
  if (animRecords.length === 0) {
    return {
      failure: {
        ok: false, frameCount: 0, durationMs: 0, fps: opts.fps ?? 0, failureKind: 'model', ...verifyFields(),
        diagnostics: [diag(
          'cli.invalid-args',
          `The script has no animationView({...}) record; nothing to capture: ${scriptPath}`,
          "Declare a numeric param() and add e.g. animationView({ param: 'driveAngleDeg', from: 0, to: 360, durationMs: 4000 }), then re-run.",
        )],
      },
    };
  }
  const metadata = animRecords[animRecords.length - 1]
    .metadata as unknown as AnimationViewMetadata & { diagnostics?: CompilerDiagnostic[] };
  // Capture-time warns stashed on the record (range clamps, shadowed
  // records) ride along on every result so the agent surface never loses
  // them.
  const stashedWarns = withNextActions(metadata.diagnostics ?? []);
  return { metadata, stashedWarns };
}

export function resolveFps(
  opts: CaptureAnimationOpts,
  metadata: AnimationViewMetadata,
  stashedWarns: CompilerDiagnostic[],
  verifyFields: VerifyFieldsFn,
): { fps: number } | { failure: CaptureAnimationResult } {
  const fps = opts.fps ?? metadata.fps;
  if (!Number.isFinite(fps) || fps <= 0) {
    return {
      failure: {
        ok: false, frameCount: 0, durationMs: metadata.durationMs, fps, failureKind: 'model', ...verifyFields(),
        diagnostics: [...stashedWarns, diag(
          'cli.invalid-args',
          `captureAnimation: fps must be a finite number > 0 (got ${fps}).`,
          'Pass a positive fps override, or fix the animationView fps field.',
        )],
      },
    };
  }
  return { fps };
}

export async function verifyPosesPhase(
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
  let sampleTimesMs = opts.verifySampleTimesMs;
  const nth = opts.verifyEveryNthFrame;
  if (nth !== undefined) {
    if (Number.isFinite(nth) && nth >= 1) {
      const base = sampleTimesMs ?? keyframeSampleSet(metadata.tracks);
      const extra = frames.filter((_, i) => i % Math.floor(nth) === 0).map((f) => f.tMs);
      sampleTimesMs = [...new Set([...base, ...extra])].sort((a, b) => a - b);
    } else {
      // Invalid mid-API value: warn + ignore (documented contract), never
      // a hard throw. The keyframe / verifySampleTimesMs schedule still runs.
      stashedWarns.push(warnDiag(
        'cli.invalid-args',
        `captureAnimation: verifyEveryNthFrame must be a finite number >= 1 (got ${nth}); ignoring it and verifying the default sample set only.`,
        'Pass a finite verifyEveryNthFrame >= 1 to densify the verification schedule, or omit it.',
      ));
    }
  }
  // Defensive: verifyAnimation restores params internally on every path,
  // but if it throws OUTSIDE that contract (an unexpected kernel error in
  // the sweep) the model session may be left mid-pose — there is no clean
  // restore to attempt here. Classify as a MODEL fault (the inputs are all
  // model-derived) and refuse; the message says the params may be unrestored.
  let v: Awaited<ReturnType<typeof verifyAnimation>>;
  try {
    v = await verifyAnimation(
      model,
      metadata.tracks,
      sampleTimesMs !== undefined ? { sampleTimesMs } : {},
    );
  } catch (e) {
    return {
      kind: 'failure',
      failure: {
        ok: false, frameCount: 0, durationMs, fps, failureKind: 'model', verified: false, collisions: [],
        diagnostics: [...stashedWarns, diag(
          'recompute.lowering.exception',
          `captureAnimation: animation-pose verification threw: ${errMsg(e)}. `
            + 'The model session may be left at a mid-verification pose (params not restored); rebuild before reuse.',
          'Fix the underlying solve error in the message, or pass --no-verify to skip the pose check (the capture then renders without motion verification).',
        )],
      },
    };
  }
  onProgress(`verify: ${v.posesSampled} poses (${Date.now() - t0}ms)`);
  const collisions = v.collisions;
  stashedWarns.push(...v.diagnostics);
  // Honesty rule: a pose the kernel cannot solve is a model fault — refuse
  // before any browser or encoder starts (never silently skip a pose).
  const poseFailures = v.diagnostics.filter(
    (d) => d.severity === 'error' && d.code !== 'animation.collision',
  );
  if (poseFailures.length > 0) {
    return {
      kind: 'failure',
      failure: {
        ok: false, frameCount: 0, durationMs, fps, failureKind: 'model', verified: false, collisions,
        diagnostics: [...stashedWarns],
      },
    };
  }
  onProgress(
    collisions.length > 0 ? `verify: ${collisions.length} collisions found` : 'verify: clean',
  );
  return { kind: 'done', verified: v.ok, collisions };
}

export async function coldMeshPhase(
  model: BuiltModel,
  durationMs: number,
  fps: number,
  stashedWarns: CompilerDiagnostic[],
  verifyFields: VerifyFieldsFn,
): Promise<{ initial: MeshResult } | { failure: CaptureAnimationResult }> {
  let initial;
  try {
    initial = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
  } catch (e) {
    return {
      failure: {
        ok: false, frameCount: 0, durationMs, fps, failureKind: 'model', ...verifyFields(),
        diagnostics: [...stashedWarns, diag(
          'recompute.lowering.exception',
          `captureAnimation: initial meshing failed: ${errMsg(e)}`,
          'Read the diagnostic message for the kernel error and fix the failing feature.',
        )],
      },
    };
  }
  if (initial.failedFeatureIds.length > 0) {
    return {
      failure: {
        ok: false, frameCount: 0, durationMs, fps, failureKind: 'model', ...verifyFields(),
        diagnostics: [...stashedWarns, diag(
          'recompute.lowering.exception',
          `captureAnimation: ${initial.failedFeatureIds.length} feature(s) failed to compile: ${initial.failedFeatureIds.join(', ')}`,
          'Fix the failing feature(s) named in the message, then re-run the capture.',
        )],
      },
    };
  }
  return { initial };
}

export async function startEncoderPhase(
  framesDir: string | undefined,
  outPath: string,
  fps: number,
  spawnFfmpeg: (args: readonly string[]) => FfmpegProcessLike,
  durationMs: number,
  stashedWarns: CompilerDiagnostic[],
  verifyFields: VerifyFieldsFn,
): Promise<{ ffmpeg: FfmpegProcessLike | undefined } | { failure: CaptureAnimationResult }> {
  if (framesDir === undefined) {
    // MP4 mode: detect ffmpeg availability FIRST — before any browser
    // spins up — by waiting for the child's spawn/error event.
    const ffmpeg = spawnFfmpeg([
      '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '22',
      outPath,
    ]);
    try {
      await new Promise<void>((res, rej) => {
        ffmpeg.once('spawn', () => res());
        ffmpeg.once('error', (err) => rej(err));
      });
    } catch (e) {
      const enoent = (e as NodeJS.ErrnoException | null)?.code === 'ENOENT';
      return {
        failure: {
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
        },
      };
    }
    return { ffmpeg };
  }
  await mkdir(framesDir, { recursive: true });
  return { ffmpeg: undefined };
}

export async function bootstrapPagePhase(
  baseUrl: string,
  initial: MeshResult,
  t0: number,
  onProgress: (msg: string) => void,
  openPage: typeof openDemoPlayerPage,
): Promise<DemoPlayerPageHandle> {
  // 6. Demo-player page via the shared bootstrap — CDP attach to an
  //    existing Chrome first (PW_CDP_URL ?? 127.0.0.1:9222), fresh
  //    chromium fallback.
  const pageHandle = await openPage({
    baseUrl,
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
  return pageHandle;
}

async function updateFrameModelPhase(params: {
  frame: FrameList[number];
  i: number;
  model: BuiltModel;
  written: number;
  durationMs: number;
  fps: number;
  stashedWarns: CompilerDiagnostic[];
  verifyFields: VerifyFieldsFn;
  partialNote: string;
  abortFfmpeg: () => Promise<void>;
}): Promise<{ meshing: MeshResult } | { failure: CaptureAnimationResult }> {
  const { frame, i, model, written, durationMs, fps, stashedWarns, verifyFields, partialNote, abortFfmpeg } = params;
  // (a) param-update / solve / mesh — MODEL fault.
  let meshing;
  try {
    const updates: ParamUpdateEdit[] = Object.entries(frame.values)
      .map(([name, value]) => ({ name, value }));
    await updateModelParams(model, updates);
    meshing = await meshFeaturesPerFeature(
      model.records, model.session.paramTable, model.session,
    );
  } catch (e) {
    await abortFfmpeg();
    return {
      failure: {
        ok: false, frameCount: written, durationMs, fps, failureKind: 'model', ...verifyFields(),
        diagnostics: [...stashedWarns, diag(
          'recompute.lowering.exception',
          `captureAnimation: frame ${i} (tMs=${frame.tMs}) failed during param-update/solve/mesh: ${errMsg(e)}. `
            + partialNote,
          'Fix the underlying solve/mesh error in the message, or adjust the animationView keyframes to avoid the failing pose.',
        )],
      },
    };
  }
  return { meshing };
}

async function renderFramePhase(params: {
  frame: FrameList[number];
  i: number;
  page: Page;
  meshing: MeshResult;
  opts: CaptureAnimationOpts;
  written: number;
  durationMs: number;
  fps: number;
  stashedWarns: CompilerDiagnostic[];
  verifyFields: VerifyFieldsFn;
  partialNote: string;
  abortFfmpeg: () => Promise<void>;
}): Promise<{ png: Buffer } | { failure: CaptureAnimationResult }> {
  const { frame, i, page, meshing, opts, written, durationMs, fps, stashedWarns, verifyFields, partialNote, abortFfmpeg } = params;
  // (b) browser render ops — ENVIRONMENT fault.
  let png: Buffer;
  try {
    await loadFeatureMeshesIntoPage(page, meshing.features.map(serializeForBridge), meshing.bounds);
    // Re-apply the object-visibility filter AFTER each reload:
    // loadFeatureMeshes rebuilds every feature group with visible:true
    // (DemoPlayerPage.loadFeatureMeshes), so a once-after-first-load
    // application would be wiped on frame 1. Re-applying every frame keeps
    // the hidden/focused parts hidden across the whole capture. Visibility
    // is render-only — it never touches the (already-run) pose verification.
    if (opts.objectFilter !== undefined) {
      await page.evaluate(
        (filter) => window.__demoPlayer!.applyObjectVisibilityFilter(filter),
        opts.objectFilter,
      );
    }
    await page.evaluate(() => window.__demoPlayer!.forceFullOpacity());
    // Tick the AnimationEngine so Three.js renders the updated scene.
    await page.evaluate(() => window.__demoPlayer!.advance(16));
    png = await page.screenshot({ type: 'png' });
  } catch (e) {
    await abortFfmpeg();
    return {
      failure: {
        ok: false, frameCount: written, durationMs, fps, failureKind: 'environment', ...verifyFields(),
        diagnostics: [...stashedWarns, diag(
          'cli.export-exception',
          `captureAnimation: frame ${i} (tMs=${frame.tMs}) failed during the browser render (load meshes / page eval / screenshot): ${errMsg(e)}. `
            + partialNote,
          'Read the diagnostic message; common causes are a crashed/wedged demo-player page or a lost studio dev server (run `npm run dev`). Retry once the page is healthy.',
        )],
      },
    };
  }
  return { png };
}

async function writeFrameOutputPhase(params: {
  frame: FrameList[number];
  i: number;
  framesDir: string | undefined;
  ffmpeg: FfmpegProcessLike | undefined;
  png: Buffer;
  written: number;
  durationMs: number;
  fps: number;
  stashedWarns: CompilerDiagnostic[];
  verifyFields: VerifyFieldsFn;
  abortFfmpeg: () => Promise<void>;
}): Promise<{ done: true } | { failure: CaptureAnimationResult }> {
  const { frame, i, framesDir, ffmpeg, png, written, durationMs, fps, stashedWarns, verifyFields, abortFfmpeg } = params;
  // (c) frame OUTPUT write — ENVIRONMENT fault.
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
      failure: {
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
      },
    };
  }
  return { done: true };
}

export async function runFrameLoopPhase(params: {
  frames: FrameList;
  model: BuiltModel;
  page: Page;
  ffmpeg: FfmpegProcessLike | undefined;
  framesDir: string | undefined;
  durationMs: number;
  fps: number;
  stashedWarns: CompilerDiagnostic[];
  verifyFields: VerifyFieldsFn;
  onProgress: (msg: string) => void;
  opts: CaptureAnimationOpts;
  t0: number;
  abortFfmpeg: () => Promise<void>;
}): Promise<{ written: number } | { failure: CaptureAnimationResult }> {
  const { frames, model, page, ffmpeg, framesDir, durationMs, fps, stashedWarns, verifyFields, onProgress, opts, t0, abortFfmpeg } = params;
  let written = 0;
  // 7. Frame loop with per-frame failure containment. THREE failure
  //    classes, each naming the right subsystem and fault side:
  //      a) param-update/solve/mesh (kernel, MODEL fault) →
  //         'recompute.lowering.exception';
  //      b) browser ops — load meshes / page.evaluate / screenshot
  //         (ENVIRONMENT fault: a wedged/crashed page is not a kernel
  //         failure) → 'cli.export-exception';
  //      c) the frame OUTPUT write — ffmpeg stdin / frame PNG file
  //         (ENVIRONMENT fault) → 'cli.export-exception'; an encoder dying
  //         mid-encode surfaces as an EPIPE on the write callback.
  const partialNote = framesDir !== undefined
    ? `The ${written} frame PNG(s) already written to ${framesDir} were kept.`
    : 'The partial MP4 was deleted.';
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    const meshResult = await updateFrameModelPhase({
      frame, i, model, written, durationMs, fps, stashedWarns, verifyFields, partialNote, abortFfmpeg,
    });
    if ('failure' in meshResult) return meshResult;
    const renderResult = await renderFramePhase({
      frame, i, page, meshing: meshResult.meshing, opts, written, durationMs, fps, stashedWarns, verifyFields, partialNote, abortFfmpeg,
    });
    if ('failure' in renderResult) return renderResult;
    const writeResult = await writeFrameOutputPhase({
      frame, i, framesDir, ffmpeg, png: renderResult.png, written, durationMs, fps, stashedWarns, verifyFields, abortFfmpeg,
    });
    if ('failure' in writeResult) return writeResult;
    written += 1;
    if (written % 10 === 0 || written === frames.length) {
      onProgress(`frame ${written}/${frames.length} (tMs=${Math.round(frame.tMs)}) +${Date.now() - t0}ms`);
    }
  }
  return { written };
}

export async function finalizeCapturePhase(params: {
  framesDir: string | undefined;
  ffmpeg: FfmpegProcessLike | undefined;
  clearFfmpeg: () => void;
  outPath: string;
  written: number;
  durationMs: number;
  fps: number;
  stashedWarns: CompilerDiagnostic[];
  verifyFields: VerifyFieldsFn;
  onProgress: (msg: string) => void;
}): Promise<CaptureAnimationResult | null> {
  const { framesDir, ffmpeg, clearFfmpeg, outPath, written, durationMs, fps, stashedWarns, verifyFields, onProgress } = params;
  // 8. Finalize.
  if (framesDir === undefined) {
    const proc = ffmpeg!;
    clearFfmpeg();
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
  return null;
}
