#!/usr/bin/env node
// scripts/checkVideoNotBlack.ts
//
// Per-frame "is this video black?" gate. Required by
// feedback_never_ship_broken_videos: CI must verify a captured demo's
// 3D-pane region is not 95%+ near-black, otherwise the demo is rejected.
//
// Strategy: sample 5 evenly-spaced frames via ffmpeg, compute the mean
// luma (Y channel) of each frame's right two-thirds (the 3D pane — the
// left strip is the terminal + sometimes title card). Fail if any sampled
// frame's 3D-pane mean luma is below MIN_LUMA. Threshold derived from
// "95% near-black" -- a fully-lit demo should have far higher mean luma
// even with the dark background, because the rendered geometry occupies
// a meaningful portion of the pane.
//
// Run: npx tsx scripts/checkVideoNotBlack.ts <path-to-demo.mp4>

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const MIN_MEAN_LUMA = 12; // empirical: a captured demo with visible geometry sits well above this
const FRAME_SAMPLES = 5;
const PANE_X_FRAC = 1 / 3; // crop left 1/3 (terminal area), measure right 2/3 (3D pane)

interface FrameStats {
  index: number;
  timeS: number;
  meanLuma: number;
}

function ffprobeDuration(mp4: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    mp4,
  ]).toString().trim();
  return parseFloat(out);
}

function ffprobeSize(mp4: string): { width: number; height: number } {
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0',
    mp4,
  ]).toString().trim();
  const [w, h] = out.split(',').map((s) => parseInt(s, 10));
  return { width: w, height: h };
}

// ffmpeg's signalstats filter writes YAVG (mean Y / luma) to its lavfi metadata.
// We crop to the 3D-pane region first, then sample N frames and read YAVG.
function sampleFrameLuma(mp4: string, durationS: number, count: number, paneXFrac: number): FrameStats[] {
  const { width, height } = ffprobeSize(mp4);
  const cropW = Math.floor(width * (1 - paneXFrac));
  const cropX = width - cropW;
  // Use lavfi metadata; print to stderr via `metadata=print` filter.
  // Force `select` to N evenly-spaced frames.
  const tmp = mkdtempSync(join(tmpdir(), 'checkvideoblack-'));
  const out: FrameStats[] = [];
  try {
    for (let i = 0; i < count; i++) {
      // Pick frames at (i+0.5)/N of the duration to avoid pre-roll and rotate-end edge cases.
      const t = ((i + 0.5) / count) * durationS;
      const framePath = join(tmp, `frame-${i}.png`);
      execFileSync('ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-ss', t.toFixed(3),
        '-i', mp4,
        '-vframes', '1',
        '-vf', `crop=${cropW}:${height}:${cropX}:0`,
        '-y', framePath,
      ]);
      // Run signalstats on the extracted frame; parse YAVG from -loglevel info filter graph.
      const ffOut = execSync(
        `ffmpeg -hide_banner -nostats -i "${framePath}" -vf "signalstats,metadata=print" -f null - 2>&1`,
      ).toString();
      const match = ffOut.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/);
      if (!match) {
        throw new Error(`could not parse YAVG from ffmpeg output at t=${t.toFixed(3)}s`);
      }
      out.push({ index: i, timeS: t, meanLuma: parseFloat(match[1]) });
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return out;
}

function main(): void {
  const mp4 = process.argv[2];
  if (!mp4) {
    console.error('Usage: npx tsx scripts/checkVideoNotBlack.ts <path-to-demo.mp4>');
    process.exit(2);
  }
  if (!existsSync(mp4)) {
    console.error(`checkVideoNotBlack: file not found: ${mp4}`);
    process.exit(2);
  }
  const duration = ffprobeDuration(mp4);
  const stats = sampleFrameLuma(mp4, duration, FRAME_SAMPLES, PANE_X_FRAC);
  console.log(`checkVideoNotBlack: ${mp4}`);
  console.log(`  duration: ${duration.toFixed(1)}s`);
  console.log(`  3D-pane region: right ${(100 * (1 - PANE_X_FRAC)).toFixed(0)}% of frame`);
  console.log(`  samples (mean Y, 0-255):`);
  let worst: FrameStats = stats[0];
  for (const s of stats) {
    console.log(`    t=${s.timeS.toFixed(2)}s  YAVG=${s.meanLuma.toFixed(2)}`);
    if (s.meanLuma < worst.meanLuma) worst = s;
  }
  if (worst.meanLuma < MIN_MEAN_LUMA) {
    console.error(
      `checkVideoNotBlack: FAIL — frame at t=${worst.timeS.toFixed(2)}s has mean luma ${worst.meanLuma.toFixed(2)} < ${MIN_MEAN_LUMA} (3D pane is near-black)`,
    );
    process.exit(1);
  }
  console.log(`checkVideoNotBlack: ok (worst frame YAVG=${worst.meanLuma.toFixed(2)} >= ${MIN_MEAN_LUMA})`);
}

main();
