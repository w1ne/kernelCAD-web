// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/opencvBackend.test.ts
//
// Tests for the pure-JS silhouette backend. There is no longer any WASM/opencv
// dependency, so the extractor runs in-process directly against the fixtures.

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  arcLength,
  douglasPeucker,
  extractSilhouettePolyline,
  otsuThreshold,
} from './opencvBackend';

const FIXTURE_DIR = join(__dirname, '../../..', 'tests/fixtures/vision');

async function fixture(name: string): Promise<Buffer> {
  return readFile(join(FIXTURE_DIR, name));
}

describe('extractSilhouettePolyline', () => {
  it('extracts a ~4-corner polyline hugging the centered black square', async () => {
    const t0 = Date.now();
    const polyline = await extractSilhouettePolyline(await fixture('uniform-bg-square.png'), 12);
    const elapsed = Date.now() - t0;

    // Must be fast — this replaces the path that used to hang forever.
    expect(elapsed).toBeLessThan(1000);

    // A square simplifies to its 4 corners (allow a couple extra for stairstep
    // edges, but never the whole boundary).
    expect(polyline.length).toBeGreaterThanOrEqual(4);
    expect(polyline.length).toBeLessThanOrEqual(8);

    // Bounding box hugs the centered 100×100 square in a 256×256 image:
    // rows/cols ~[78..177] → normalized ~[0.305, 0.691].
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
  }, 5000);

  it('does not return the whole frame for the square fixture', async () => {
    const polyline = await extractSilhouettePolyline(await fixture('uniform-bg-square.png'), 12);
    const xs = polyline.map(([x]) => x);
    const ys = polyline.map(([, y]) => y);
    // None of the corners should touch the image border.
    expect(Math.min(...xs)).toBeGreaterThan(0.05);
    expect(Math.max(...xs)).toBeLessThan(0.95);
    expect(Math.min(...ys)).toBeGreaterThan(0.05);
    expect(Math.max(...ys)).toBeLessThan(0.95);
  });

  it('terminates quickly on a cluttered photo (no hang)', async () => {
    const t0 = Date.now();
    const polyline = await extractSilhouettePolyline(await fixture('cluttered-photo.png'), 12);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(polyline.length).toBeGreaterThanOrEqual(3);
    expect(polyline.length).toBeLessThanOrEqual(12);
  }, 5000);

  it('rejects maxWaypoints < 3', async () => {
    await expect(
      extractSilhouettePolyline(await fixture('uniform-bg-square.png'), 2),
    ).rejects.toThrow(/maxWaypoints must be >= 3/);
  });

  it('throws no-foreground for a solid single-color image', async () => {
    // 16×16 solid white PNG (1×1 won't decode to a usable mask).
    const sharp = (await import('sharp')).default;
    const white = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .png()
      .toBuffer();
    await expect(extractSilhouettePolyline(white, 12)).rejects.toThrow(/no foreground contour/);
  });

  it('fails closed when a compact dark interior is nested in a light foreground that reaches the frame', async () => {
    const sharp = (await import('sharp')).default;
    const paleBody = await sharp({
      create: { width: 220, height: 220, channels: 3, background: { r: 232, g: 232, b: 232 } },
    }).png().toBuffer();
    const darkScreen = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 24, g: 24, b: 24 } },
    }).png().toBuffer();
    const ambiguous = await sharp({
      create: { width: 256, height: 256, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .composite([
        { input: paleBody, left: 0, top: 18 },
        { input: darkScreen, left: 68, top: 70 },
      ])
      .png()
      .toBuffer();

    await expect(extractSilhouettePolyline(ambiguous, 12)).rejects.toThrow(/ambiguous outer silhouette/);
  });
});

describe('otsuThreshold', () => {
  it('returns a between-class-maximizing threshold for a bimodal histogram', () => {
    const hist = new Array(256).fill(0);
    hist[10] = 1000;
    hist[200] = 1000;
    const t = otsuThreshold(hist);
    // Threshold should sit between the two modes.
    expect(t).toBeGreaterThanOrEqual(10);
    expect(t).toBeLessThan(200);
  });

  it('handles an empty histogram gracefully', () => {
    expect(otsuThreshold(new Array(256).fill(0))).toBe(127);
  });
});

describe('arcLength', () => {
  it('sums closed-loop segment lengths of a unit square', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(arcLength(square, true)).toBeCloseTo(40, 6);
  });

  it('drops the closing segment when open', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(arcLength(square, false)).toBeCloseTo(30, 6);
  });
});

describe('douglasPeucker', () => {
  it('collapses a straight run to its endpoints', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ];
    const out = douglasPeucker(line, 0.1);
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it('keeps a vertex that deviates beyond epsilon', () => {
    const bend = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ];
    const out = douglasPeucker(bend, 1);
    expect(out).toHaveLength(3);
  });
});
