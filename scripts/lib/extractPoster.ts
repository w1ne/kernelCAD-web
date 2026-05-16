import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

export interface ExtractPosterOptions {
  videoPath: string;
  outPath: string;
  timestampSeconds: number;
  quality?: number; // 2 = best, 31 = worst (ffmpeg -q:v range). Default 3.
}

export function extractPoster(opts: ExtractPosterOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!existsSync(opts.videoPath)) {
      reject(new Error(`input video not found: ${opts.videoPath}`));
      return;
    }
    const args = [
      '-y',
      '-ss', String(opts.timestampSeconds),
      '-i', opts.videoPath,
      '-vframes', '1',
      '-q:v', String(opts.quality ?? 3),
      opts.outPath,
    ];
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0 && existsSync(opts.outPath)) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}
