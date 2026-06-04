// src/lib/imageSimilarity/fidelityGates.test.ts
//
// W2 fidelity gates. These are boolean AND-gates computed from already-parsed
// render-inspect data (a square mask Uint8Array + a small numeric summary).
// They run BEFORE any visual (SSIM/silhouette/VLM) score so that a wrong
// object can never be rescued by a high pixel-similarity number.
//
// Regression target: the "R5 slab" case — a wide rectangular mask with NO
// interior openings (no lens holes) must FAIL expectedFeatureVisibleAtPose,
// regardless of how silhouette-similar the slab looks.

import { describe, expect, it } from 'vitest';
import { computeFidelityGates } from './fidelityGates';
import type { FidelityBundle } from './fidelityGates';

/** Build a size×size mask that is a solid filled rectangle (no holes). */
function solidRectMask(size: number, x0: number, y0: number, x1: number, y1: number): Uint8Array {
  const m = new Uint8Array(size * size);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      m[y * size + x] = 1;
    }
  }
  return m;
}

/** Punch a rectangular background hole into an existing mask (sets pixels to 0). */
function punchHole(mask: Uint8Array, size: number, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      mask[y * size + x] = 0;
    }
  }
}

describe('computeFidelityGates', () => {
  const SIZE = 64;

  it('fails expectedFeatureVisibleAtPose for a solid slab with no interior openings (R5 case)', () => {
    // Wide solid slab, foreground from x=4..60, y=24..40 — no holes.
    const mask = solidRectMask(SIZE, 4, 24, 60, 40);
    const bundle: FidelityBundle = {
      size: SIZE,
      mask,
      partsCount: 1,
      solidVolume: 12000,
    };
    const gates = computeFidelityGates(bundle, {
      requireInteriorOpenings: true,
      expectedPartsCount: 1,
    });
    const feat = gates.find((g) => g.name === 'expectedFeatureVisibleAtPose');
    expect(feat).toBeDefined();
    expect(feat!.pass).toBe(false);
    expect(feat!.reason).toMatch(/no interior opening/i);
  });

  it('passes expectedFeatureVisibleAtPose for an eyewear-like mask with two lens openings', () => {
    // Frame band y=24..40, x=4..60. Punch two background lens openings.
    const mask = solidRectMask(SIZE, 4, 24, 60, 40);
    punchHole(mask, SIZE, 12, 28, 26, 38); // left lens
    punchHole(mask, SIZE, 38, 28, 52, 38); // right lens
    const bundle: FidelityBundle = {
      size: SIZE,
      mask,
      partsCount: 1,
      solidVolume: 9000,
    };
    const gates = computeFidelityGates(bundle, {
      requireInteriorOpenings: true,
      expectedPartsCount: 1,
    });
    const feat = gates.find((g) => g.name === 'expectedFeatureVisibleAtPose');
    expect(feat!.pass).toBe(true);
  });

  it('fails partsCountMatches when the count differs from expected', () => {
    const mask = solidRectMask(SIZE, 4, 24, 60, 40);
    punchHole(mask, SIZE, 12, 28, 26, 38);
    punchHole(mask, SIZE, 38, 28, 52, 38);
    const bundle: FidelityBundle = { size: SIZE, mask, partsCount: 3, solidVolume: 9000 };
    const gates = computeFidelityGates(bundle, {
      requireInteriorOpenings: true,
      expectedPartsCount: 1,
    });
    const parts = gates.find((g) => g.name === 'partsCountMatches');
    expect(parts!.pass).toBe(false);
    expect(parts!.reason).toMatch(/expected 1.*got 3/i);
  });

  it('fails nonDegenerateSolid for zero/near-zero volume', () => {
    const mask = solidRectMask(SIZE, 4, 24, 60, 40);
    const bundle: FidelityBundle = { size: SIZE, mask, partsCount: 1, solidVolume: 0 };
    const gates = computeFidelityGates(bundle, { requireInteriorOpenings: false });
    const nd = gates.find((g) => g.name === 'nonDegenerateSolid');
    expect(nd!.pass).toBe(false);
  });

  it('skips the interior-openings gate when requireInteriorOpenings is false', () => {
    const mask = solidRectMask(SIZE, 4, 24, 60, 40);
    const bundle: FidelityBundle = { size: SIZE, mask, partsCount: 1, solidVolume: 100 };
    const gates = computeFidelityGates(bundle, { requireInteriorOpenings: false });
    expect(gates.find((g) => g.name === 'expectedFeatureVisibleAtPose')).toBeUndefined();
  });

  it('skips partsCountMatches when expectedPartsCount is undefined', () => {
    const mask = solidRectMask(SIZE, 4, 24, 60, 40);
    const bundle: FidelityBundle = { size: SIZE, mask, partsCount: 5, solidVolume: 100 };
    const gates = computeFidelityGates(bundle, { requireInteriorOpenings: false });
    expect(gates.find((g) => g.name === 'partsCountMatches')).toBeUndefined();
  });
});
