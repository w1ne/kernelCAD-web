// src/agent/cli/commands/animate.ts
//
// `kernelcad animate <file.kcad.ts> [out.mp4]` — capture the script's
// animationView({...}) timeline through the typed capture engine
// (src/agent/render/captureAnimation.ts): MP4 via ffmpeg by default, or a
// PNG frame sequence with `--frames <dir>` (zero external dependencies).
// Animation-pose interference verification runs by default (keyframe times
// + segment midpoints, BEFORE any browser/ffmpeg cost); `--no-verify` skips
// it and `--verify-every <n>` additionally samples every n-th frame time.
//
// Exit codes (pipe-friendly: `kernelcad animate part.kcad.ts && echo ok`):
//   0 — animation captured AND pose verification clean (or skipped via
//       --no-verify),
//   1 — animation captured BUT pose verification found collisions; the
//       MP4/frames ARE still written as evidence,
//   2 — could not capture (bad arguments, script/build errors, no
//       animationView record, a pose the kernel cannot solve/mesh, browser
//       render/page bootstrap failure, ffmpeg missing in MP4 mode, frame
//       output write failure).
// (This is animate's OWN scheme. It is NOT the dfm scheme: dfm puts
// build-fatals under exit 1; here every could-not-capture fault — build
// errors included — exits 2, and exit 1 is reserved strictly for the
// verification gate finding collisions on an otherwise-captured artifact.)
// The engine's typed `failureKind` discriminant stays on the --json
// envelope (still useful to attribute the fault), but BOTH kinds exit 2 —
// only verification collisions distinguish 1 from 0.
//
// Progress lines go to stderr (timestamped, like the deprecated
// scripts/captureAnimationView.mjs wrapper) in BOTH human and --json modes —
// under --json stdout carries exactly the envelope, so stderr is the only
// safe progress channel. `--quiet` suppresses them.
//
// Requires a studio dev server reachable on VITE_PORT (or the default
// render base URL); honors PW_CDP_URL to attach to an existing Chrome.

import { Command } from 'commander';
import { captureAnimation, type CaptureAnimationResult } from '../../render/captureAnimation';
import { formatHuman } from '../../../shared/diagnostics/formatter';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';

export interface AnimateCliInput {
  file: string;
  /** MP4 output path (positional). Mutually exclusive with `frames`. */
  out?: string;
  /** PNG-sequence mode directory (`--frames <dir>`). */
  frames?: string;
  /** Override the animationView record's fps (`--fps <n>`). */
  fps?: number;
  /** Skip the animation-pose interference verification (`--no-verify`). */
  skipVerify?: boolean;
  /** Additionally verify at every n-th frame time of the fps schedule
   *  (`--verify-every <n>`); unioned with the keyframe sample set. */
  verifyEvery?: number;
  /** Progress sink forwarded to the capture engine. The command wires a
   *  timestamped stderr writer here unless --quiet. */
  onProgress?: (msg: string) => void;
}

export interface AnimateCliResult {
  exitCode: 0 | 1 | 2;
  /** The engine result as-is — also the `--json` stdout envelope
   *  ({ok, outPath?, frameCount, durationMs, fps, diagnostics, verified,
   *  collisions, verifySkipped?, failureKind?}). Usage refusals synthesize
   *  a result-shaped object with failureKind 'environment'. */
  result: CaptureAnimationResult;
  /** One-line evidence summary; present on successful capture. */
  summary?: string;
}

/** Timestamped stderr progress writer — the single source for both the
 *  `animate` command and the deprecated scripts/captureAnimationView.mjs
 *  wrapper, so their progress lines stay byte-identical. Writes to stderr so
 *  that under --json stdout carries exactly the envelope. */
export function stderrProgressSink(msg: string): void {
  process.stderr.write(`[${new Date().toISOString()}] ${msg}\n`);
}

/** Least-misleading fps for a usage-refusal envelope: the caller's parsed
 *  fps when it is actually usable (finite, > 0), else 0. Avoids leaking a
 *  NaN/negative/zero sentinel that looks like a real fps in the JSON. */
function safeFps(fps: number | undefined): number {
  return fps !== undefined && Number.isFinite(fps) && fps > 0 ? fps : 0;
}

function usageRefusal(message: string, hint: string, fps: number): AnimateCliResult {
  const diagnostic: CompilerDiagnostic = {
    target: 'export-occt',
    code: 'cli.invalid-args',
    severity: 'error',
    message,
    hint,
  };
  return {
    exitCode: 2,
    result: {
      ok: false,
      frameCount: 0,
      durationMs: 0,
      fps,
      diagnostics: withNextActions([diagnostic]),
      verified: false,
      collisions: [],
      failureKind: 'environment',
    },
  };
}

/** `Wrote <path> — <n> frames, <d> ms @ <fps> fps` plus the verification
 *  verdict (`verify clean` / `N collision(s)` / `verify skipped`). */
export function formatAnimateSummary(r: {
  outPath: string;
  frameCount: number;
  durationMs: number;
  fps: number;
  collisionCount: number;
  verifySkipped?: boolean;
}): string {
  const verdict = r.verifySkipped
    ? 'verify skipped'
    : r.collisionCount > 0
      ? `${r.collisionCount} collision(s) found`
      : 'verify clean';
  return `Wrote ${r.outPath} — ${r.frameCount} frames, ${r.durationMs} ms @ ${r.fps} fps; ${verdict}`;
}

export async function runAnimate(input: AnimateCliInput): Promise<AnimateCliResult> {
  // Usage refusals — exit 2 before the engine builds anything.
  if (input.out !== undefined && input.frames !== undefined) {
    return usageRefusal(
      'animate: the out.mp4 positional and --frames <dir> are mutually exclusive — pick MP4 mode or PNG-sequence mode.',
      'Drop the out.mp4 positional to write a PNG sequence into the --frames directory, or drop --frames to encode an MP4.',
      safeFps(input.fps),
    );
  }
  if (input.fps !== undefined && (!Number.isFinite(input.fps) || input.fps <= 0)) {
    return usageRefusal(
      `animate: --fps must be a finite number > 0 (got ${input.fps}).`,
      'Pass a positive number to --fps, or drop the flag to use the animationView record’s fps.',
      input.fps,
    );
  }
  if (
    input.verifyEvery !== undefined
    && (!Number.isInteger(input.verifyEvery) || input.verifyEvery < 1)
  ) {
    return usageRefusal(
      `animate: --verify-every must be an integer >= 1 (got ${input.verifyEvery}).`,
      'Pass a positive integer to --verify-every, or drop the flag to verify the keyframe sample set only.',
      safeFps(input.fps),
    );
  }
  if (input.skipVerify === true && input.verifyEvery !== undefined) {
    return usageRefusal(
      'animate: --no-verify and --verify-every are mutually exclusive — there is no schedule to densify when verification is skipped.',
      'Drop --no-verify to verify with the densified schedule, or drop --verify-every to skip verification entirely.',
      safeFps(input.fps),
    );
  }

  const result = await captureAnimation({
    scriptPath: input.file,
    ...(input.out !== undefined ? { outPath: input.out } : {}),
    ...(input.frames !== undefined ? { framesDir: input.frames } : {}),
    ...(input.fps !== undefined ? { fps: input.fps } : {}),
    ...(input.skipVerify === true ? { skipVerify: true } : {}),
    ...(input.verifyEvery !== undefined ? { verifyEveryNthFrame: input.verifyEvery } : {}),
    ...(input.onProgress !== undefined ? { onProgress: input.onProgress } : {}),
  });

  if (result.ok && result.outPath !== undefined) {
    return {
      // Captured fine; pose verification distinguishes 0 from 1. The
      // artifact IS written either way — the MP4/frames are the evidence of
      // what collides — so the summary still reports it.
      exitCode: result.collisions.length > 0 ? 1 : 0,
      result,
      summary: formatAnimateSummary({
        outPath: result.outPath,
        frameCount: result.frameCount,
        durationMs: result.durationMs,
        fps: result.fps,
        collisionCount: result.collisions.length,
        ...(result.verifySkipped === true ? { verifySkipped: true } : {}),
      }),
    };
  }
  // Could not capture — exit 2 regardless of failureKind ('model' or
  // 'environment'; the discriminant stays on the --json envelope for fault
  // attribution).
  return { exitCode: 2, result };
}

export function animateCommand(): Command {
  const cmd = new Command('animate')
    .description("Capture the script's animationView({...}) timeline to MP4 (ffmpeg) or a PNG frame sequence, verifying the sampled poses for part interference")
    .argument('<file>', 'path to a .kcad.ts script with an animationView({...}) record')
    .argument(
      '[out]',
      'output MP4 path (default <scriptDir>/<basename>-animation.mp4); mutually exclusive with --frames',
    )
    .option(
      '--frames <dir>',
      'PNG-sequence mode: write frame-0000.png, frame-0001.png, ... into <dir> and skip ffmpeg entirely (mutually exclusive with the out positional)',
    )
    .option('--fps <n>', "override the animationView record's fps", (v) => Number(v))
    .option('--no-verify', 'skip the animation-pose interference verification')
    .option(
      '--verify-every <n>',
      'additionally verify at every n-th frame time of the fps schedule (unioned with the default keyframe sample set)',
      (v) => Number(v),
    )
    .option('--json', 'structured report to stdout (progress still goes to stderr)')
    .option('--quiet', 'suppress the stderr progress lines')
    .addHelpText(
      'after',
      `
Exit codes:
  0  animation captured; pose verification clean (or skipped via --no-verify)
  1  animation captured, but pose verification found part collisions —
     the MP4/frames are still written as evidence
  2  could not capture (bad arguments, script/build errors, no animationView
     record, an unsolvable pose, ffmpeg missing in MP4 mode, browser
     bootstrap failure, frame output write failure)

Requires a studio dev server (run \`npm run dev\` first); honors VITE_PORT and
PW_CDP_URL (attach to an existing Chrome over CDP).`,
    )
    .action(async (file: string, out: string | undefined, opts: {
      frames?: string;
      fps?: number;
      /** Commander negation: `--no-verify` sets this false; default true. */
      verify: boolean;
      verifyEvery?: number;
      json?: boolean;
      quiet?: boolean;
    }) => {
      const r = await runAnimate({
        file,
        ...(out !== undefined ? { out } : {}),
        ...(opts.frames !== undefined ? { frames: opts.frames } : {}),
        ...(opts.fps !== undefined ? { fps: opts.fps } : {}),
        ...(opts.verify === false ? { skipVerify: true } : {}),
        ...(opts.verifyEvery !== undefined ? { verifyEvery: opts.verifyEvery } : {}),
        // Progress always goes to stderr (even under --json — stdout must
        // stay pure JSON) unless --quiet.
        ...(opts.quiet ? {} : { onProgress: stderrProgressSink }),
      });
      if (opts.json) {
        console.log(JSON.stringify(r.result, null, 2));
      } else {
        if (r.result.diagnostics.length > 0) console.log(formatHuman(r.result.diagnostics));
        if (r.summary !== undefined) console.log(r.summary);
      }
      process.exitCode = r.exitCode;
    });
  return cmd;
}
