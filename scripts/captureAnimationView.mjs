// scripts/captureAnimationView.mjs
//
// Thin argv wrapper around the typed animation-capture engine
// (src/agent/render/captureAnimation.ts). Reads the `animationView({...})`
// record from a .kcad.ts script, samples its keyframe tracks via the shared
// animationSampler, renders each frame in the demo-player page, and stitches
// an MP4 via ffmpeg.
//
// Usage:
//   npx tsx scripts/captureAnimationView.mjs <script.kcad.ts> [outFile.mp4]
//
// Defaults: writes <scriptDir>/<basename>-animation.mp4 next to the script.
// Honors PW_CDP_URL (attach to an existing Chrome) and VITE_PORT.

import { resolve } from 'node:path';
import { captureAnimation } from '../src/agent/render/captureAnimation.ts';

const scriptPath = resolve(process.argv[2] ?? 'examples/gallery/gearfinity-planetary-stage.kcad.ts');
const outPath = process.argv[3] !== undefined ? resolve(process.argv[3]) : undefined;

console.log(`script:    ${scriptPath}`);
const t0 = Date.now();
const result = await captureAnimation({
  scriptPath,
  outPath,
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
