// src/lib/imageSimilarity/cornerColorStdDev.test.ts
//
// Tests for the `cornerColorStdDev` helper added in W4 §3. The helper samples
// the four 1-px corners of an image and returns the population stddev of their
// grayscale values — used by the `trace_from_image` router to decide whether
// the background is uniform enough for the opencv backend.

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cornerColorStdDev } from './score';

const FIXTURE_DIR = join(__dirname, '../../..', 'tests/fixtures/vision');

describe('cornerColorStdDev', () => {
  it('returns < 2 for a uniform white-bg image (centered black square)', async () => {
    const png = await readFile(join(FIXTURE_DIR, 'uniform-bg-square.png'));
    const stddev = await cornerColorStdDev(png);
    expect(stddev).toBeLessThan(2);
  });

  it('returns > 20 for a cluttered random-noise image', async () => {
    const png = await readFile(join(FIXTURE_DIR, 'cluttered-photo.png'));
    const stddev = await cornerColorStdDev(png);
    expect(stddev).toBeGreaterThan(20);
  });
});
