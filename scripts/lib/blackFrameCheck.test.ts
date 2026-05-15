import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { isVideoMostlyBlack } from './blackFrameCheck';

const NORMAL = path.resolve(__dirname, '../../tests/fixtures/gallery/short-clip.mp4');
const BLACK = path.resolve(__dirname, '../../tests/fixtures/gallery/black-clip.mp4');

describe('isVideoMostlyBlack', () => {
  it('returns false for a normal (testsrc) clip', async () => {
    const result = await isVideoMostlyBlack(NORMAL, { sampleCount: 5, blackThreshold: 0.95 });
    expect(result).toBe(false);
  });

  it('returns true for an all-black clip', async () => {
    const result = await isVideoMostlyBlack(BLACK, { sampleCount: 5, blackThreshold: 0.95 });
    expect(result).toBe(true);
  });
});
