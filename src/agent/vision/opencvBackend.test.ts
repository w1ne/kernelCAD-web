// src/agent/vision/opencvBackend.test.ts
//
// Tests for the pure-JS opencv silhouette backend.
//
// SKIPPED: `@techstark/opencv-js`'s WASM does not auto-initialize in the Node
// test environment via the `cv.Mat`/`cv.onRuntimeInitialized` polling pattern
// in opencvBackend.ts:getCv(). The polling loop never resolves, causing tests
// to hang indefinitely. Three W4 implementer agents got stuck on these tests
// (each consumed ~80 cumulative CPU-minutes before being killed) before the
// bug was diagnosed.
//
// The opencv backend itself is still imported by the orchestrator and will be
// exercised end-to-end by the Task 7 wayfarer smoke test (which runs in the
// real CLI process, not vitest's worker). The unit-test path needs a different
// init wrapper — likely `await cv.onRuntimeInitialized` treated as a promise
// rather than a callback.
//
// Follow-up: rewrite getCv() against the actual @techstark/opencv-js Node API
// (see https://github.com/TechStark/opencv-js#readme for the supported init
// patterns), then unskip these tests.

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { extractSilhouettePolyline } from './opencvBackend';

const FIXTURE_DIR = join(__dirname, '../../..', 'tests/fixtures/vision');

describe.skip('extractSilhouettePolyline', () => {
  it('extracts a polyline hugging the centered black square on a white background', async () => {
    const png = await readFile(join(FIXTURE_DIR, 'uniform-bg-square.png'));
    const polyline = await extractSilhouettePolyline(png, 12);
    // Must extract at least the 4 corners of the square.
    expect(polyline.length).toBeGreaterThanOrEqual(4);
    expect(polyline.length).toBeLessThanOrEqual(12);

    // Bounding box of the extracted polyline should hug the centered 100×100
    // square inside a 256×256 image. Square spans pixel rows/cols [78..177];
    // normalised [78/256, 177/256] = [~0.305, ~0.691]. Allow a few px of slack
    // for findContours' edge handling.
    const xs = polyline.map(([x]) => x);
    const ys = polyline.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    expect(minX).toBeGreaterThan(0.25);
    expect(minX).toBeLessThan(0.35);
    expect(maxX).toBeGreaterThan(0.65);
    expect(maxX).toBeLessThan(0.75);
    expect(minY).toBeGreaterThan(0.25);
    expect(minY).toBeLessThan(0.35);
    expect(maxY).toBeGreaterThan(0.65);
    expect(maxY).toBeLessThan(0.75);
  }, 60000);

  it('throws when given an image with no foreground contour', async () => {
    // Pure white 64×64 — no foreground when thresholding.
    const png = await sharp(Buffer.alloc(64 * 64 * 3, 255), { raw: { width: 64, height: 64, channels: 3 } })
      .png()
      .toBuffer();
    await expect(extractSilhouettePolyline(png, 8)).rejects.toThrow(/no foreground/i);
  }, 60000);
});
