// scripts/captureAnimationView.mjs
//
// DEPRECATED — superseded by the first-class CLI command:
//
//   kernelcad animate <script.kcad.ts> [out.mp4] [--frames <dir>] [--fps <n>] [--json]
//   (from source: npx tsx src/agent/cli/index.ts animate ...)
//
// This wrapper is kept working for the docs/plans that reference it; it now
// delegates to the same `runAnimate` core the command runs, so behavior
// is identical — including exit codes: 0 captured + pose verification
// clean (or skipped), 1 captured but verification found collisions (the
// artifact is still written as evidence), 2 could not capture (script/build
// error, no animationView record, unsolvable pose, ffmpeg missing, browser
// bootstrap, bad args).
//
// Usage:
//   npx tsx scripts/captureAnimationView.mjs <script.kcad.ts> [outFile.mp4] [--frames <dir>]
//
// Defaults: writes <scriptDir>/<basename>-animation.mp4 next to the script.
// Honors PW_CDP_URL (attach to an existing Chrome) and VITE_PORT.

import { resolve } from 'node:path';
import { runAnimate } from '../src/agent/cli/commands/animate.ts';
import { formatHuman } from '../src/shared/diagnostics/formatter.ts';

const USAGE = `Usage: npx tsx scripts/captureAnimationView.mjs <script.kcad.ts> [outFile.mp4] [--frames <dir>]

DEPRECATED: use \`kernelcad animate <script.kcad.ts> [out.mp4] [--frames <dir>]\` instead.

Captures the script's animationView({...}) timeline.

Modes:
  [outFile.mp4]    MP4 via ffmpeg (default); outFile defaults to
                   <scriptDir>/<basename>-animation.mp4 next to the script.
  --frames <dir>   PNG-sequence mode: write frame-0000.png, frame-0001.png, ...
                   into <dir> and skip ffmpeg entirely. The outFile.mp4
                   positional is ignored in this mode.

Options:
  -h, --help       Show this help and exit.

Environment:
  PW_CDP_URL       Attach to an existing Chrome over CDP (default http://127.0.0.1:9222).
  VITE_PORT        Port of the running studio dev server.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}

let framesArg;
const positionals = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--frames') {
    framesArg = args[i + 1];
    if (framesArg === undefined || framesArg.startsWith('--')) {
      console.error('error: --frames requires a directory argument\n');
      console.error(USAGE);
      process.exit(2);
    }
    i += 1;
  } else if (arg.startsWith('--')) {
    console.error(`error: unknown flag '${arg}'\n`);
    console.error(USAGE);
    process.exit(2);
  } else {
    positionals.push(arg);
  }
}

if (positionals.length === 0) {
  console.error(USAGE);
  process.exit(2);
}

console.error('DEPRECATED: scripts/captureAnimationView.mjs is superseded by `kernelcad animate <script.kcad.ts> [out.mp4] [--frames <dir>]` — delegating.');

const scriptPath = resolve(positionals[0]);
const framesDir = framesArg !== undefined ? resolve(framesArg) : undefined;
// MP4 positional is ignored in frames mode (historic wrapper contract; the
// real command rejects the combination instead).
const outPath = framesDir === undefined && positionals[1] !== undefined
  ? resolve(positionals[1])
  : undefined;

console.log(`script:    ${scriptPath}`);
const t0 = Date.now();
const { exitCode, result, summary } = await runAnimate({
  file: scriptPath,
  ...(outPath !== undefined ? { out: outPath } : {}),
  ...(framesDir !== undefined ? { frames: framesDir } : {}),
  onProgress: (msg) => {
    process.stderr.write(`[${new Date().toISOString()}] ${msg}\n`);
  },
});

if (result.diagnostics.length > 0) {
  console.log(formatHuman(result.diagnostics));
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
if (exitCode === 0) {
  if (summary !== undefined) console.log(summary);
  console.log(`(${elapsed}s)`);
} else {
  console.error(`Capture failed after ${elapsed}s (frames captured: ${result.frameCount}).`);
}
process.exit(exitCode);
