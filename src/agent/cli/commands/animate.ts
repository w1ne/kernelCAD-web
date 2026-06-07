// src/agent/cli/commands/animate.ts
//
// `kernelcad animate <file.kcad.ts> [out.mp4]` — capture the script's
// animationView({...}) timeline through the typed capture engine
// (src/agent/render/captureAnimation.ts): MP4 via ffmpeg by default, or a
// PNG frame sequence with `--frames <dir>` (zero external dependencies).
//
// Exit codes (pipe-friendly: `kernelcad animate part.kcad.ts && echo ok`):
//   0 — animation captured,
//   1 — the model is at fault (script/build errors, no animationView
//       record, a pose the kernel cannot solve/mesh/render),
//   2 — environmental/usage failure (bad arguments, ffmpeg missing in MP4
//       mode, browser/page bootstrap failure, frame output write failure).
// The mapping reads the engine's typed `failureKind` discriminant — no
// message string-matching.
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
  /** Progress sink forwarded to the capture engine. The command wires a
   *  timestamped stderr writer here unless --quiet. */
  onProgress?: (msg: string) => void;
}

export interface AnimateCliResult {
  exitCode: 0 | 1 | 2;
  /** The engine result as-is — also the `--json` stdout envelope
   *  ({ok, outPath?, frameCount, durationMs, fps, diagnostics,
   *  failureKind?}). Usage refusals synthesize a result-shaped object with
   *  failureKind 'environment'. */
  result: CaptureAnimationResult;
  /** One-line evidence summary; present on successful capture. */
  summary?: string;
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
      failureKind: 'environment',
    },
  };
}

/** `Wrote <path> — <n> frames, <d> ms @ <fps> fps` */
export function formatAnimateSummary(r: {
  outPath: string;
  frameCount: number;
  durationMs: number;
  fps: number;
}): string {
  return `Wrote ${r.outPath} — ${r.frameCount} frames, ${r.durationMs} ms @ ${r.fps} fps`;
}

export async function runAnimate(input: AnimateCliInput): Promise<AnimateCliResult> {
  // Usage refusals — exit 2 before the engine builds anything.
  if (input.out !== undefined && input.frames !== undefined) {
    return usageRefusal(
      'animate: the out.mp4 positional and --frames <dir> are mutually exclusive — pick MP4 mode or PNG-sequence mode.',
      'Drop the out.mp4 positional to write a PNG sequence into the --frames directory, or drop --frames to encode an MP4.',
      input.fps ?? 0,
    );
  }
  if (input.fps !== undefined && (!Number.isFinite(input.fps) || input.fps <= 0)) {
    return usageRefusal(
      `animate: --fps must be a finite number > 0 (got ${input.fps}).`,
      'Pass a positive number to --fps, or drop the flag to use the animationView record’s fps.',
      input.fps,
    );
  }

  const result = await captureAnimation({
    scriptPath: input.file,
    ...(input.out !== undefined ? { outPath: input.out } : {}),
    ...(input.frames !== undefined ? { framesDir: input.frames } : {}),
    ...(input.fps !== undefined ? { fps: input.fps } : {}),
    ...(input.onProgress !== undefined ? { onProgress: input.onProgress } : {}),
  });

  if (result.ok && result.outPath !== undefined) {
    return {
      exitCode: 0,
      result,
      summary: formatAnimateSummary({
        outPath: result.outPath,
        frameCount: result.frameCount,
        durationMs: result.durationMs,
        fps: result.fps,
      }),
    };
  }
  // Typed failure → exit code via the engine's failureKind discriminant:
  // 'model' (build errors, no animationView record, unsolvable pose) → 1;
  // 'environment' (ffmpeg missing/crashed, browser bootstrap, output
  // write) → 2.
  return { exitCode: result.failureKind === 'model' ? 1 : 2, result };
}

export function animateCommand(): Command {
  const cmd = new Command('animate')
    .description("Capture the script's animationView({...}) timeline to MP4 (ffmpeg) or a PNG frame sequence")
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
    .option('--json', 'structured report to stdout (progress still goes to stderr)')
    .option('--quiet', 'suppress the stderr progress lines')
    .addHelpText(
      'after',
      `
Exit codes:
  0  animation captured
  1  the model is at fault (script/build errors, no animationView record,
     a pose the kernel cannot solve/mesh/render)
  2  environmental/usage failure (bad arguments, ffmpeg missing in MP4 mode,
     browser bootstrap failure, frame output write failure)

Requires a studio dev server (run \`npm run dev\` first); honors VITE_PORT and
PW_CDP_URL (attach to an existing Chrome over CDP).`,
    )
    .action(async (file: string, out: string | undefined, opts: {
      frames?: string;
      fps?: number;
      json?: boolean;
      quiet?: boolean;
    }) => {
      const r = await runAnimate({
        file,
        ...(out !== undefined ? { out } : {}),
        ...(opts.frames !== undefined ? { frames: opts.frames } : {}),
        ...(opts.fps !== undefined ? { fps: opts.fps } : {}),
        // Progress always goes to stderr (even under --json — stdout must
        // stay pure JSON) unless --quiet.
        ...(opts.quiet
          ? {}
          : {
              onProgress: (msg: string) =>
                process.stderr.write(`[${new Date().toISOString()}] ${msg}\n`),
            }),
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
