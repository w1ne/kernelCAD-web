// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { spawn } from 'node:child_process';

export interface BlackFrameCheckOptions {
  sampleCount: number;
  blackThreshold: number;
  pixelDarknessCutoff?: number;
}

function probeDurationSeconds(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      path,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe failed: ${err}`));
      const d = Number.parseFloat(out.trim());
      if (Number.isNaN(d)) return reject(new Error(`ffprobe returned non-numeric duration: ${out}`));
      resolve(d);
    });
  });
}

function sampleFrameNearBlackFraction(
  videoPath: string,
  timestampSeconds: number,
  pixelDarknessCutoff: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-ss', String(timestampSeconds),
      '-i', videoPath,
      '-vframes', '1',
      '-vf', 'format=gray',
      '-f', 'rawvideo',
      'pipe:1',
    ];
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    let stderr = '';
    proc.stdout.on('data', (c: Buffer) => chunks.push(c));
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
      const buf = Buffer.concat(chunks);
      if (buf.length === 0) return reject(new Error('no pixel data captured'));
      let dark = 0;
      for (let i = 0; i < buf.length; i++) if (buf[i] <= pixelDarknessCutoff) dark++;
      resolve(dark / buf.length);
    });
  });
}

export async function isVideoMostlyBlack(
  videoPath: string,
  opts: BlackFrameCheckOptions,
): Promise<boolean> {
  const duration = await probeDurationSeconds(videoPath);
  const cutoff = opts.pixelDarknessCutoff ?? 16;
  const offsets = Array.from({ length: opts.sampleCount }, (_, i) =>
    (duration * (i + 1)) / (opts.sampleCount + 1),
  );
  for (const t of offsets) {
    const frac = await sampleFrameNearBlackFraction(videoPath, t, cutoff);
    if (frac >= opts.blackThreshold) return true;
  }
  return false;
}
