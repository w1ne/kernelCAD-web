// scripts/captureAnimationView.mjs
//
// Thin argv wrapper around the typed animation-capture engine
// (src/agent/render/captureAnimation.ts). Reads the `animationView({...})`
// record from a .kcad.ts script, samples its keyframe tracks via the shared
// animationSampler, renders each frame in the demo-player page, and stitches
// an MP4 via ffmpeg — or, with `--frames <dir>`, writes the PNG sequence
// directly (no ffmpeg needed).
//
// Usage:
//   npx tsx scripts/captureAnimationView.mjs <script.kcad.ts> [outFile.mp4] [--frames <dir>]
//
// Defaults: writes <scriptDir>/<basename>-animation.mp4 next to the script.
// Honors PW_CDP_URL (attach to an existing Chrome) and VITE_PORT.

import { resolve } from 'node:path';
import { captureAnimation } from '../src/agent/render/captureAnimation.ts';

const USAGE = `Usage: npx tsx scripts/captureAnimationView.mjs <script.kcad.ts> [outFile.mp4] [--frames <dir>]

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

const scriptPath = resolve(positionals[0]);
const framesDir = framesArg !== undefined ? resolve(framesArg) : undefined;
// MP4 positional is ignored in frames mode.
const outPath = framesDir === undefined && positionals[1] !== undefined
  ? resolve(positionals[1])
  : undefined;

console.log(`script:    ${scriptPath}`);
const t0 = Date.now();
const result = await captureAnimation({
  scriptPath,
  outPath,
  framesDir,
  onProgress: (msg) => {
    process.stderr.write(`[${new Date().toISOString()}] ${msg}\n`);
  },
});

for (const d of result.diagnostics) {
  const line = `[${d.severity.toUpperCase()}] ${d.code}: ${d.message}`;
  if (d.severity === 'error') console.error(line);
  else console.log(line);
  if (d.hint) console.log(`  hint: ${d.hint}`);
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
if (result.ok) {
  console.log(`Wrote ${result.outPath}`);
  console.log(`frames=${result.frameCount}  durationMs=${result.durationMs}  fps=${result.fps}  (${elapsed}s)`);
  process.exit(0);
} else {
  console.error(`Capture failed after ${elapsed}s (frames captured: ${result.frameCount}).`);
  process.exit(1);
}
