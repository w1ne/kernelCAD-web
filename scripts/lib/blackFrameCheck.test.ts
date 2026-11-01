// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { isVideoMostlyBlack } from './blackFrameCheck';

const NORMAL = path.resolve(__dirname, '../../tests/fixtures/gallery/short-clip.mp4');
const BLACK = path.resolve(__dirname, '../../tests/fixtures/gallery/black-clip.mp4');

/**
 * These tests shell out to ffprobe/ffmpeg. When the binary is missing they used
 * to hang until the 60 s test timeout, which reported a useless failure and hid
 * the real cause. Skip explicitly instead, with a reason, so a runner without
 * ffmpeg is a visible SKIP and never a false pass.
 */
function hasFfprobe(): boolean {
  try {
    execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const FFMPEG = hasFfprobe();

describe.skipIf(!FFMPEG)('isVideoMostlyBlack', () => {
  it('returns false for a normal (testsrc) clip', async () => {
    const result = await isVideoMostlyBlack(NORMAL, { sampleCount: 5, blackThreshold: 0.95 });
    expect(result).toBe(false);
  });

  it('returns true for an all-black clip', async () => {
    const result = await isVideoMostlyBlack(BLACK, { sampleCount: 5, blackThreshold: 0.95 });
    expect(result).toBe(true);
  });
});
