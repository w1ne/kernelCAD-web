// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/captureAnimation.ts
//
// MCP `capture_animation` tool — runs a kernelCAD script's animationView({...})
// timeline through the typed capture engine (src/agent/render/captureAnimation.ts)
// and writes an MP4 (ffmpeg) or a PNG frame sequence (framesDir mode). Thin
// request/response wrapper over the engine; mirrors the `kernelcad animate` CLI
// semantics (animate.ts) on the MCP surface.
//
// FILE-ONLY (no { code } mode) — DELIBERATE asymmetry vs export_model. The
// capture engine takes a `scriptPath` ONLY: the pipeline (buildModelFromFile →
// verifyAnimation → per-frame meshing → browser render) is driven entirely
// from a file on disk, and exposes no inline-source entry point. export_model
// runs from { code } because its runtime (runAndExport) accepts inline source;
// the capture engine does not. Rather than invent a brittle temp-file bridge
// (write { code } to a tmp .kcad.ts, fix up scriptDir for relative imports,
// clean up on every failure path), this tool ACCEPTS FILE ONLY. Inline
// animation capture can be added later if the engine grows a code entry point.
//
// COLLISIONS DO NOT FLIP ok (mirrors the CLI / engine contract): a captured
// artifact with interfering poses is still `ok: true` with the MP4/frames
// written as evidence — the agent reads `verified: false` + the `collisions`
// array. Only a could-not-capture fault (bad file, build error, no
// animationView record, unsolvable pose, ffmpeg missing, browser bootstrap
// failure) returns `ok: false`.
//
// TIMEOUT: MCP is request/response with no onProgress channel, so a runaway
// capture (a wedged browser, a pathologically long timeline) would hang the
// call indefinitely. The engine exposes no timeout knob and no AbortController
// seam, so this tool wraps the capture in a Promise.race against a generous
// 10-minute deadline. On timeout it returns a typed ENVIRONMENT failure
// (cli.export-exception). HONESTY NOTE: the race only abandons the RESULT — the
// underlying capture (browser, ffmpeg child) may still be finishing in the
// background; there is no kill seam to interrupt it.
//
// PRODUCTION CONSTRAINT (stated in the registry description): like
// `kernelcad render`, capture drives a headless browser against a running
// studio dev server reachable at DEFAULT_RENDER_BASE_URL (http://localhost:5173)
// or the VITE_PORT override — there is NO bundled-static-dist serving mode yet
// (render.ts: "a bundled-static-dist mode is on the v2 list"). The production
// MCP install (npx kernelcad mcp) shares the same openDemoPlayerPage bootstrap,
// so the same dev-server precondition applies there.

import {
  captureAnimation,
  type CaptureAnimationResult,
  type CaptureFailureKind,
} from '../../render/captureAnimation';
import { buildObjectFilter } from '../../cli/commands/render';
import type { AnimationCollision } from '../../render/verifyAnimation';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

/** Generous request/response deadline for a single capture (10 minutes). */
export const CAPTURE_ANIMATION_TIMEOUT_MS = 10 * 60 * 1000;

export interface CaptureAnimationInput {
  /** Path to a .kcad.ts script with an animationView({...}) record. Required —
   *  there is no { code } mode (see the file header for the asymmetry). */
  file?: string;
  /** Inline source. NOT supported — present only to give a clear refusal; the
   *  capture engine is file-only. */
  code?: string;
  /** MP4 output path; default <scriptDir>/<basename>-animation.mp4. Mutually
   *  exclusive with frames_dir. */
  output_path?: string;
  /** PNG-sequence mode directory: write frame-0000.png ... and skip ffmpeg
   *  entirely (zero external dependencies). Mutually exclusive with
   *  output_path. */
  frames_dir?: string;
  /** Override the animationView record's fps. */
  fps?: number;
  /** Skip the animation-pose interference verification (default: verify on). */
  no_verify?: boolean;
  /** Additionally verify at every n-th frame time of the fps schedule
   *  (unioned with the default keyframe sample set). */
  verify_every?: number;
  /** Show only matching objects by feature id / assembly part name. Maps to a
   *  'focus' object-visibility filter. Mutually exclusive with hide. */
  focus?: string[];
  /** Hide matching objects by feature id / assembly part name. Maps to a
   *  'hide' object-visibility filter. Mutually exclusive with focus. */
  hide?: string[];
}

export interface CaptureAnimationCollisionRow {
  t_ms: number;
  a: string;
  b: string;
  volume_mm3: number;
}

export interface CaptureAnimationOutput {
  ok: boolean;
  /** MP4 path (mp4 mode) or frames_dir (PNG-sequence mode); set on success. */
  output_path?: string;
  frame_count?: number;
  /** Animation timeline duration in milliseconds. */
  duration_ms?: number;
  /** Resolved frames-per-second the schedule was sampled at. */
  fps?: number;
  /** True when verification ran AND every sampled pose was collision-free.
   *  False when collisions were found, verification was skipped, or the
   *  capture refused before verification. Does NOT track `ok`. */
  verified?: boolean;
  /** True when no_verify suppressed verification. */
  verify_skipped?: boolean;
  /** One row per colliding pair per verified pose (empty when clean/skipped). */
  collisions?: CaptureAnimationCollisionRow[];
  diagnostics: CompilerDiagnostic[];
  /** Top-level error message on ok:false. */
  error?: string;
  /** First error diagnostic's registry code on ok:false (already a valid
   *  registry code — the engine mints no new codes). */
  errorCode?: string;
  /** Actionable next-step hint from the first error diagnostic, when present. */
  errorHint?: string;
  /** Which side is at fault on ok:false: 'model' or 'environment'. */
  failure_kind?: CaptureFailureKind;
}

function mapCollisions(collisions: readonly AnimationCollision[]): CaptureAnimationCollisionRow[] {
  return collisions.map((c) => ({
    t_ms: c.tMs,
    a: c.a,
    b: c.b,
    volume_mm3: c.volumeMm3,
  }));
}

/** Shape the engine result into the snake_case MCP envelope. ok, verified,
 *  collisions are carried through verbatim (collisions DON'T flip ok). */
function toOutput(r: CaptureAnimationResult): CaptureAnimationOutput {
  const base: CaptureAnimationOutput = {
    ok: r.ok,
    frame_count: r.frameCount,
    duration_ms: r.durationMs,
    fps: r.fps,
    verified: r.verified,
    collisions: mapCollisions(r.collisions),
    diagnostics: r.diagnostics,
    ...(r.outPath !== undefined ? { output_path: r.outPath } : {}),
    ...(r.verifySkipped === true ? { verify_skipped: true } : {}),
  };
  if (r.ok) return base;

  // Failure: surface the first error diagnostic's code/message/hint at the top
  // level (inspectStep clamping precedent — the engine already emits only
  // registry codes, so no clamping table is needed here).
  const firstError = r.diagnostics.find((d) => d.severity === 'error');
  return {
    ...base,
    ...(firstError !== undefined
      ? {
          error: firstError.message,
          errorCode: firstError.code,
          ...(firstError.hint !== undefined ? { errorHint: firstError.hint } : {}),
        }
      : {}),
    ...(r.failureKind !== undefined ? { failure_kind: r.failureKind } : {}),
  };
}

/** A typed environment failure synthesized by the tool (not the engine): used
 *  for the file/code usage refusal and the timeout race. */
function toolRefusal(
  code: string,
  message: string,
  hint: string,
  failureKind: CaptureFailureKind,
): CaptureAnimationOutput {
  const diagnostic: CompilerDiagnostic = {
    target: 'export-occt',
    code: code as CompilerDiagnostic['code'],
    severity: 'error',
    message,
    hint,
  };
  return {
    ok: false,
    frame_count: 0,
    duration_ms: 0,
    fps: 0,
    verified: false,
    collisions: [],
    diagnostics: [diagnostic],
    error: message,
    errorCode: code,
    errorHint: hint,
    failure_kind: failureKind,
  };
}

export async function captureAnimationTool(
  input: CaptureAnimationInput,
): Promise<CaptureAnimationOutput> {
  // File-only: a clear refusal beats a confusing engine crash. The asymmetry
  // vs export_model is documented in the file header.
  if (input.code !== undefined && input.file === undefined) {
    return toolRefusal(
      'cli.invalid-args',
      'capture_animation: inline { code } is not supported — the capture engine renders from a file on disk only. Write the script to a .kcad.ts file and pass { file }.',
      'Save the script to a .kcad.ts file (so relative lib.fromSTEP(...) imports resolve) and call capture_animation with { file } instead of { code }.',
      'environment',
    );
  }
  if (typeof input.file !== 'string' || input.file.length === 0) {
    return toolRefusal(
      'cli.invalid-args',
      'capture_animation: { file } is required (path to a .kcad.ts script with an animationView({...}) record).',
      'Pass { file: "<path-to-script.kcad.ts>" }; inline { code } is not supported by the capture engine.',
      'environment',
    );
  }
  if (input.output_path !== undefined && input.frames_dir !== undefined) {
    return toolRefusal(
      'cli.invalid-args',
      'capture_animation: output_path and frames_dir are mutually exclusive — pick MP4 mode (output_path) or PNG-sequence mode (frames_dir).',
      'Drop output_path to write a PNG sequence into frames_dir, or drop frames_dir to encode an MP4.',
      'environment',
    );
  }
  // focus / hide → object-visibility filter (render-parity: same builder, same
  // mutual-exclusivity rule). Visibility is render-only — it does NOT affect the
  // pose verification, which runs against the full model.
  let objectFilter;
  try {
    objectFilter = buildObjectFilter({
      ...(input.focus !== undefined ? { focus: input.focus } : {}),
      ...(input.hide !== undefined ? { hide: input.hide } : {}),
    });
  } catch (e) {
    return toolRefusal(
      'cli.invalid-args',
      e instanceof Error ? e.message.replace(/^render: /, 'capture_animation: ') : String(e),
      'Pass only focus OR hide, not both.',
      'environment',
    );
  }

  const capturePromise = captureAnimation({
    scriptPath: input.file,
    ...(input.output_path !== undefined ? { outPath: input.output_path } : {}),
    ...(input.frames_dir !== undefined ? { framesDir: input.frames_dir } : {}),
    ...(input.fps !== undefined ? { fps: input.fps } : {}),
    ...(input.no_verify === true ? { skipVerify: true } : {}),
    ...(input.verify_every !== undefined ? { verifyEveryNthFrame: input.verify_every } : {}),
    ...(objectFilter !== undefined ? { objectFilter } : {}),
    // No onProgress: MCP is request/response with no streaming channel.
  });

  // Promise.race against a generous deadline. The engine has no timeout/abort
  // seam, so on timeout we abandon the RESULT only — the underlying capture
  // may still be finishing in the background (documented in the header + hint).
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<CaptureAnimationOutput>((res) => {
    timer = setTimeout(
      () =>
        res(
          toolRefusal(
            'cli.export-exception',
            `capture_animation: the capture did not finish within ${Math.round(CAPTURE_ANIMATION_TIMEOUT_MS / 60000)} minutes and was abandoned. The underlying capture (browser/ffmpeg) may still be finishing in the background; no artifact is reported.`,
            'Reduce the animation duration/fps, pass no_verify to skip the pose check, ensure the studio dev server and a playwright chromium are healthy, then retry.',
            'environment',
          ),
        ),
      CAPTURE_ANIMATION_TIMEOUT_MS,
    );
    timer.unref?.();
  });

  // Map the engine result into the envelope. Attach a no-op .catch so that if
  // the timeout WINS the race and the underlying capture later REJECTS (a wedged
  // browser/ffmpeg child throwing in the background), the losing chain's
  // rejection is swallowed instead of surfacing as an unhandled rejection. The
  // race's own awaited branch still observes the rejection on the happy path.
  const resultPromise = capturePromise.then(toOutput);
  resultPromise.catch(() => undefined);

  try {
    const result = await Promise.race([resultPromise, timeoutPromise]);
    return result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
