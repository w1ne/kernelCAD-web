// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { type Writable, type Readable } from 'node:stream';
import { execSync } from 'node:child_process';

export interface FfmpegPipelineOptions {
  outputPath: string;
  fps: number;
  width: number;
  height: number;
}

export class FfmpegPipeline {
  private proc: ChildProcessByStdio<Writable, Readable, Readable> | null = null;
  private stderrBuf = '';

  ensureInstalled(): void {
    try {
      execSync('which ffmpeg', { stdio: 'ignore' });
    } catch {
      throw new Error(
        'ffmpeg not found. Install: apt install ffmpeg | brew install ffmpeg | winget install Gyan.FFmpeg',
      );
    }
  }

  start(opts: FfmpegPipelineOptions): void {
    this.ensureInstalled();
    this.proc = spawn(
      'ffmpeg',
      [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', 'png',
        '-r', String(opts.fps),
        '-s', `${opts.width}x${opts.height}`,
        '-i', '-',
        '-vcodec', 'libx264',
        '-crf', '23',
        '-preset', 'slow',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-vsync', 'cfr',
        opts.outputPath,
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    ) as ChildProcessByStdio<Writable, Readable, Readable>;
    this.proc.stderr.on('data', (chunk: Buffer) => {
      this.stderrBuf += chunk.toString('utf8');
    });
  }

  pushFrame(pngBuffer: Buffer): Promise<void> {
    if (!this.proc) throw new Error('ffmpeg not started');
    return new Promise((resolve, reject) => {
      this.proc!.stdin.write(pngBuffer, (err) => (err ? reject(err) : resolve()));
    });
  }

  async finalize(): Promise<void> {
    if (!this.proc) throw new Error('ffmpeg not started');
    return new Promise<void>((resolve, reject) => {
      this.proc!.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}\n${this.stderrBuf}`));
      });
      this.proc!.stdin.end();
    });
  }
}
