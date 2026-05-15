import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractPoster } from './extractPoster';

const FIXTURE = path.resolve(__dirname, '../../tests/fixtures/gallery/short-clip.mp4');

describe('extractPoster', () => {
  let tmp: string;
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  it('writes a poster.jpg at the requested timestamp', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'poster-'));
    const out = path.join(tmp, 'poster.jpg');
    await extractPoster({ videoPath: FIXTURE, outPath: out, timestampSeconds: 1 });
    expect(existsSync(out)).toBe(true);
    expect(statSync(out).size).toBeGreaterThan(0);
  });

  it('rejects when the input video does not exist', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'poster-'));
    const out = path.join(tmp, 'poster.jpg');
    await expect(
      extractPoster({ videoPath: '/does/not/exist.mp4', outPath: out, timestampSeconds: 1 }),
    ).rejects.toThrow();
  });
});
