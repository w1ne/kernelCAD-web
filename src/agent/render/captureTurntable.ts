// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/render/captureTurntable.ts
//
// Turntable capture: a seamless 360° orbit around a script's (static)
// model, written as MP4 / GIF (ffmpeg) or a PNG frame sequence. Powers
// capture_animation({ turntable: true }).
//
// REUSE, NOT A NEW PIPELINE: meshing + page bootstrap are headlessRender's
// (meshForHeadlessRender / openRenderPage — same filter, environment and
// publish-stage handling as render_preview), every frame is a publish
// canvas capture (publishCapture.ts), and the encoder / frame writer /
// finalize phases are the animation engine's (captureAnimationPhases.ts).
//
// SEAMLESS LOOP: frame i sits at az0 + 360°·i/N — the 360° endpoint is
// excluded, so frame N-1 flows into frame 0 without a duplicated pose. The
// camera distance is the worst-case fit over the whole orbit (fit: 'orbit'),
// so the model never zooms while it turns. The publish light rig follows
// the camera azimuth: the product turns under fixed studio lights.
//
// A turntable shows a static model, so there is no pose verification: the
// result reports verified: false with verifySkipped: true.

import { mkdir, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { PUBLISH_PRESET, turntableAzimuths, type PublishStageSpec } from '../../shared/render/publishPreset';
import {
  meshForHeadlessRender,
  openRenderPage,
  type DemoPlayerPageHandle,
  type HeadlessObjectFilter,
} from './headlessRender';
import { resolveRenderBaseUrl, type ResolvedRenderBase } from './playerServer';
import { capturePublishTile } from './publishCapture';
import type { CaptureAnimationResult, FfmpegProcessLike } from './captureAnimation';
import {
  defaultSpawnFfmpeg,
  diag,
  errMsg,
  finalizeCapturePhase,
  startEncoderPhase,
  waitFfmpegCloseBounded,
  writeFrameOutputPhase,
} from './captureAnimationPhases';

export interface CaptureTurntableOpts {
  scriptPath: string;
  /** Output path; `.gif` → GIF, anything else → MP4. Default
   *  `<scriptDir>/<basename>-turntable.mp4`. Ignored in framesDir mode. */
  outPath?: string;
  /** PNG-sequence mode: write `frame-%04d.png` and skip ffmpeg. The only
   *  mode that keeps a transparent backdrop's alpha. */
  framesDir?: string;
  width: number;
  height: number;
  fps: number;
  /** One full revolution, in ms. */
  durationMs: number;
  /** Camera elevation above the horizon (deg). */
  elevationDeg: number;
  /** Azimuth of frame 0 (deg; 0 = front view). */
  startAzDeg: number;
  /** 'publish' stage; undefined keeps the engineering look. */
  publish?: PublishStageSpec;
  objectFilter?: HeadlessObjectFilter;
  environment?: string;
  baseUrl?: string;
  onProgress?: (msg: string) => void;
}

/** Test seams (no real chromium / ffmpeg / OCCT in unit tests). */
export interface CaptureTurntableDeps {
  mesh?: typeof meshForHeadlessRender;
  openPage?: typeof openRenderPage;
  resolveBaseUrl?: typeof resolveRenderBaseUrl;
  captureTile?: typeof capturePublishTile;
  spawnFfmpeg?: (args: readonly string[]) => FfmpegProcessLike;
}

/** Frame count of one revolution: at least 2 frames. */
export function turntableFrameCount(durationMs: number, fps: number): number {
  return Math.max(2, Math.round((durationMs / 1000) * fps));
}

export function defaultTurntableOutPath(scriptPath: string): string {
  const stem = basename(scriptPath).replace(/\.kcad\.ts$/, '').replace(/\.ts$/, '');
  return join(dirname(scriptPath), `${stem}-turntable.mp4`);
}

const noVerify = () => ({ verified: false, collisions: [], verifySkipped: true as const });

function failure(
  kind: 'model' | 'environment',
  code: 'cli.script-exception' | 'cli.export-exception',
  message: string,
  hint: string,
  frameCount: number,
  opts: CaptureTurntableOpts,
): CaptureAnimationResult {
  return {
    ok: false, frameCount, durationMs: opts.durationMs, fps: opts.fps, failureKind: kind, ...noVerify(),
    diagnostics: [diag(code, message, hint)],
  };
}

async function meshPhase(
  opts: CaptureTurntableOpts,
  mesh: typeof meshForHeadlessRender,
): Promise<{ meshed: Awaited<ReturnType<typeof meshForHeadlessRender>> } | { failure: CaptureAnimationResult }> {
  try {
    return { meshed: await mesh({ scriptPath: opts.scriptPath, viewportWidth: opts.width, viewportHeight: opts.height }) };
  } catch (e) {
    return {
      failure: failure(
        'model', 'cli.script-exception',
        `captureTurntable: building '${opts.scriptPath}' failed: ${errMsg(e)}`,
        'Run evaluate_script on the same file to get per-feature diagnostics, fix the script, then retry.',
        0, opts,
      ),
    };
  }
}

async function frameLoop(args: {
  opts: CaptureTurntableOpts;
  handle: DemoPlayerPageHandle;
  ffmpeg: FfmpegProcessLike | undefined;
  framesDir: string | undefined;
  captureTile: typeof capturePublishTile;
  abortFfmpeg: () => Promise<void>;
  stashedWarns: CompilerDiagnostic[];
}): Promise<{ written: number } | { failure: CaptureAnimationResult }> {
  const { opts, handle, ffmpeg, framesDir, captureTile, abortFfmpeg, stashedWarns } = args;
  const frameCount = turntableFrameCount(opts.durationMs, opts.fps);
  const azimuths = turntableAzimuths(frameCount, opts.startAzDeg);
  const onProgress = opts.onProgress ?? (() => undefined);
  const t0 = Date.now();
  let written = 0;
  for (let i = 0; i < azimuths.length; i++) {
    const tMs = (opts.durationMs * i) / frameCount;
    let png: Buffer;
    try {
      png = await captureTile(handle.page, {
        width: opts.width, height: opts.height, azDeg: azimuths[i], elDeg: opts.elevationDeg, fit: 'orbit',
        supersample: PUBLISH_PRESET.turntableSupersample,
      });
    } catch (e) {
      await abortFfmpeg();
      return {
        failure: failure(
          'environment', 'cli.export-exception',
          `captureTurntable: frame ${i} (az=${azimuths[i].toFixed(1)}°) failed during the browser render: ${errMsg(e)}`,
          'Ensure playwright chromium is installed (npx playwright install chromium) and retry.',
          written, opts,
        ),
      };
    }
    const out = await writeFrameOutputPhase({
      frame: { tMs, values: {} }, i, framesDir, ffmpeg, png, written,
      durationMs: opts.durationMs, fps: opts.fps, stashedWarns, verifyFields: noVerify, abortFfmpeg,
    });
    if ('failure' in out) return out;
    written += 1;
    if (written % 30 === 0 || written === frameCount) onProgress(`turntable frame ${written}/${frameCount} (${Date.now() - t0}ms)`);
  }
  return { written };
}

/** Capture a seamless 360° turntable of the script's model. */
export async function captureTurntable(
  opts: CaptureTurntableOpts,
  deps: CaptureTurntableDeps = {},
): Promise<CaptureAnimationResult> {
  const scriptPath = resolve(opts.scriptPath);
  const framesDir = opts.framesDir !== undefined ? resolve(opts.framesDir) : undefined;
  const outPath = framesDir ?? resolve(opts.outPath ?? defaultTurntableOutPath(scriptPath));
  const run = { ...opts, scriptPath };
  const stashedWarns: CompilerDiagnostic[] = [];

  const meshResult = await meshPhase(run, deps.mesh ?? meshForHeadlessRender);
  if ('failure' in meshResult) return meshResult.failure;

  let ffmpeg: FfmpegProcessLike | undefined;
  let handle: DemoPlayerPageHandle | undefined;
  let surface: ResolvedRenderBase | undefined;
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
    if (framesDir === undefined) await mkdir(dirname(outPath), { recursive: true });
    const encoder = await startEncoderPhase(
      framesDir, outPath, opts.fps, deps.spawnFfmpeg ?? defaultSpawnFfmpeg, opts.durationMs, stashedWarns, noVerify,
    );
    if ('failure' in encoder) return encoder.failure;
    ffmpeg = encoder.ffmpeg;

    surface = await (deps.resolveBaseUrl ?? resolveRenderBaseUrl)(opts.baseUrl);
    const opened = await (deps.openPage ?? openRenderPage)(
      {
        scriptPath, viewportWidth: opts.width, viewportHeight: opts.height, noWatermark: true,
        ...(opts.publish !== undefined ? { publish: opts.publish } : {}),
        ...(opts.objectFilter !== undefined ? { objectFilter: opts.objectFilter } : {}),
        ...(opts.environment !== undefined ? { environment: opts.environment } : {}),
      },
      surface.baseUrl, meshResult.meshed.serialized, meshResult.meshed.meshing,
    );
    handle = opened.pageHandle;

    const loop = await frameLoop({
      opts: run, handle, ffmpeg, framesDir, captureTile: deps.captureTile ?? capturePublishTile, abortFfmpeg, stashedWarns,
    });
    if ('failure' in loop) return loop.failure;

    const finalFailure = await finalizeCapturePhase({
      framesDir, ffmpeg, clearFfmpeg: () => { ffmpeg = undefined; }, outPath, written: loop.written,
      durationMs: opts.durationMs, fps: opts.fps, stashedWarns, verifyFields: noVerify, onProgress: opts.onProgress ?? (() => undefined),
    });
    if (finalFailure) return finalFailure;
    return { ok: true, outPath, frameCount: loop.written, durationMs: opts.durationMs, fps: opts.fps, diagnostics: stashedWarns, ...noVerify() };
  } catch (e) {
    await abortFfmpeg();
    return failure(
      'environment', 'cli.export-exception', `captureTurntable: ${errMsg(e)}`,
      'Common causes: a missing playwright chromium (npx playwright install chromium) or no render surface (run `npm run build:player`).',
      0, opts,
    );
  } finally {
    if (handle) await handle.close();
    if (surface) await surface.close();
  }
}
