// tests/unit/intent/curve3d.test.ts
//
// NURBS Slice B Task 1: type-level guard for Curve3D control-net metadata.
// Curve3D is a new peer-type alongside Shape/Surface and is captured as a
// FeatureRecord with metadata.curve3d. Lowering to a Geom_BSplineCurve
// happens in a later task; this file only covers the JS-level shape.

import { describe, it, expect } from 'vitest';
import { isCurve3DMetadata, type Curve3DMetadata } from '../../../src/shared/intent/curve3dRecord';

describe('Curve3DMetadata', () => {
  it('accepts a cubic non-rational curve', () => {
    const c: Curve3DMetadata = {
      controlPoints: [
        [0, 0, 0],
        [10, 5, 0],
        [20, -5, 10],
        [30, 0, 5],
      ],
      degree: 3,
      closed: false,
    };
    expect(isCurve3DMetadata(c)).toBe(true);
  });

  it('accepts a rational curve with weights + knots', () => {
    const c: Curve3DMetadata = {
      controlPoints: [
        [10, 0, 0],
        [10, 10, 0],
        [0, 10, 0],
      ],
      degree: 2,
      weights: [1, Math.SQRT1_2, 1],
      knots: [0, 0, 0, 1, 1, 1],
      closed: false,
    };
    expect(isCurve3DMetadata(c)).toBe(true);
  });

  it('rejects a control-net with fewer than degree+1 points', () => {
    expect(isCurve3DMetadata({ controlPoints: [[0, 0, 0]], degree: 3 })).toBe(false);
  });

  it('rejects non-finite or non-3D control points', () => {
    expect(isCurve3DMetadata({ controlPoints: [[0, 0]], degree: 1 })).toBe(false);
    expect(isCurve3DMetadata({ controlPoints: [[0, 0, NaN], [1, 1, 1]], degree: 1 })).toBe(false);
  });

  it('rejects degree < 1 or non-integer degree', () => {
    expect(isCurve3DMetadata({ controlPoints: [[0, 0, 0], [1, 1, 1]], degree: 0 })).toBe(false);
    expect(isCurve3DMetadata({ controlPoints: [[0, 0, 0], [1, 1, 1]], degree: 1.5 })).toBe(false);
  });

  it('rejects weights with wrong length or non-positive entries', () => {
    const base = { controlPoints: [[0, 0, 0], [1, 1, 1], [2, 0, 0]], degree: 2 };
    expect(isCurve3DMetadata({ ...base, weights: [1, 1] })).toBe(false);
    expect(isCurve3DMetadata({ ...base, weights: [1, 0, 1] })).toBe(false);
    expect(isCurve3DMetadata({ ...base, weights: [1, -1, 1] })).toBe(false);
  });

  it('rejects knots with wrong length', () => {
    const base = { controlPoints: [[0, 0, 0], [1, 1, 1], [2, 0, 0]], degree: 2 };
    // Required length = controlPoints.length + degree + 1 = 3 + 2 + 1 = 6
    expect(isCurve3DMetadata({ ...base, knots: [0, 0, 0, 1, 1] })).toBe(false);
    expect(isCurve3DMetadata({ ...base, knots: [0, 0, 0, 1, 1, 1] })).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(isCurve3DMetadata(null)).toBe(false);
    expect(isCurve3DMetadata('curve')).toBe(false);
    expect(isCurve3DMetadata(42)).toBe(false);
  });
});
