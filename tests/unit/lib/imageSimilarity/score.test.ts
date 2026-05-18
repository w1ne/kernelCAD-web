// tests/unit/lib/imageSimilarity/score.test.ts
//
// Smoke test for the image-similarity scorer. The harness consumer
// (eval/oracle/scoreReference.ts) requires the module to load, expose
// `scoreRenderVsReference`, and produce a sane composite for a tiny
// synthetic pair of identical / disjoint silhouettes. End-to-end scoring
// of real renders is exercised by the eval tasks themselves.

import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { scoreRenderVsReference } from '../../../../src/lib/imageSimilarity/score';

async function makePng(size: number, fill: { r: number; g: number; b: number }): Promise<Buffer> {
  return await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: fill,
    },
  })
    .png()
    .toBuffer();
}

async function makeWhiteSquareOnWhite(size: number): Promise<Buffer> {
  // 32x32 all-white image: silhouette mask collapses to "no subject"
  // — both images have no subject, so silhouette IoU is undefined-ish.
  // The scorer should handle this gracefully (degenerate case) rather
  // than throwing.
  return makePng(size, { r: 255, g: 255, b: 255 });
}

async function makeBlackSquareOnWhite(size: number): Promise<Buffer> {
  // Black 8x8 square centered in a 32x32 white field — gives an actual
  // silhouette to extract.
  const buf = Buffer.alloc(size * size * 3, 255);
  const subjectSize = 8;
  const start = (size - subjectSize) / 2;
  for (let y = start; y < start + subjectSize; y++) {
    for (let x = start; x < start + subjectSize; x++) {
      const i = (y * size + x) * 3;
      buf[i] = 0;
      buf[i + 1] = 0;
      buf[i + 2] = 0;
    }
  }
  return await sharp(buf, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toBuffer();
}

describe('scoreRenderVsReference', () => {
  it('returns a high composite for identical inputs', async () => {
    const img = await makeBlackSquareOnWhite(32);
    const result = await scoreRenderVsReference(img, img);
    expect(result).toHaveProperty('composite');
    expect(result.composite).toBeGreaterThan(0.9);
    expect(result.perGate.silhouetteIoU).toBeGreaterThan(0.99);
    expect(result.perGate.ssim).toBeGreaterThan(0.99);
  });

  it('returns a lower composite for visibly different inputs', async () => {
    const a = await makeBlackSquareOnWhite(32);
    const b = await makeWhiteSquareOnWhite(32);
    const result = await scoreRenderVsReference(a, b);
    // Composite must drop noticeably below the identical case.
    expect(result.composite).toBeLessThan(0.9);
  });

  it('exposes the documented field shape', async () => {
    const img = await makeBlackSquareOnWhite(32);
    const result = await scoreRenderVsReference(img, img);
    expect(result.perGate).toHaveProperty('silhouetteIoU');
    expect(result.perGate).toHaveProperty('ssim');
    expect(result.perGate).toHaveProperty('perceptualHash');
    expect(Array.isArray(result.diagnostics)).toBe(true);
  });
});
