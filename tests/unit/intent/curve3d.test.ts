// tests/unit/intent/curve3d.test.ts
//
// NURBS Slice B Task 1 + Task 2: type-level guards for Curve3D control-net
// metadata and VariableSweep section-list metadata. Both are JS-side guards
// that fence the public capture API against malformed inputs before they
// reach the OCCT lowerer.

import { describe, it, expect } from 'vitest';
import { isCurve3DMetadata, type Curve3DMetadata } from '../../../src/shared/intent/curve3dRecord';
import { isVariableSweepMetadata, type VariableSweepMetadata } from '../../../src/shared/intent/variableSweepRecord';
import type { FeatureId } from '../../../src/shared/intent/types';

const fid = (s: string) => s as FeatureId;
const fref = (id: string) => ({ kind: 'feature' as const, id: fid(id) });

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

describe('VariableSweepMetadata', () => {
  it('accepts a minimal 2-section sweep at t=0 and t=1', () => {
    const m: VariableSweepMetadata = {
      spineRef: fref('curve3d_1'),
      sections: [
        { t: 0, profileRef: fref('sketch_1') },
        { t: 1, profileRef: fref('sketch_2') },
      ],
      closed: false,
    };
    expect(isVariableSweepMetadata(m)).toBe(true);
  });

  it('accepts intermediate sections and full optional knobs', () => {
    const m: VariableSweepMetadata = {
      spineRef: fref('curve3d_1'),
      sections: [
        { t: 0, profileRef: fref('sketch_1') },
        { t: 0.3, profileRef: fref('sketch_2') },
        { t: 0.7, profileRef: fref('sketch_3') },
        { t: 1, profileRef: fref('sketch_4') },
      ],
      continuity: 'C2',
      orientation: { up: [0, 0, 1] },
    };
    expect(isVariableSweepMetadata(m)).toBe(true);
  });

  it('accepts every cardinal orientation', () => {
    const base = {
      spineRef: fref('curve3d_1'),
      sections: [
        { t: 0, profileRef: fref('a') },
        { t: 1, profileRef: fref('b') },
      ],
    };
    expect(isVariableSweepMetadata({ ...base, orientation: 'frenet' })).toBe(true);
    expect(isVariableSweepMetadata({ ...base, orientation: 'corrected-frenet' })).toBe(true);
    expect(isVariableSweepMetadata({ ...base, orientation: 'discrete' })).toBe(true);
    expect(isVariableSweepMetadata({ ...base, orientation: { up: [0, 0, 1] } })).toBe(true);
  });

  it('rejects sections out of order', () => {
    expect(isVariableSweepMetadata({
      spineRef: fref('curve3d_1'),
      sections: [
        { t: 0, profileRef: fref('a') },
        { t: 0.5, profileRef: fref('b') },
        { t: 0.3, profileRef: fref('c') },
        { t: 1, profileRef: fref('d') },
      ],
    })).toBe(false);
  });

  it('rejects duplicate t values', () => {
    expect(isVariableSweepMetadata({
      spineRef: fref('curve3d_1'),
      sections: [
        { t: 0, profileRef: fref('a') },
        { t: 0.5, profileRef: fref('b') },
        { t: 0.5, profileRef: fref('c') },
        { t: 1, profileRef: fref('d') },
      ],
    })).toBe(false);
  });

  it('rejects sections that do not span [0, 1]', () => {
    // Starts past 0:
    expect(isVariableSweepMetadata({
      spineRef: fref('curve3d_1'),
      sections: [
        { t: 0.1, profileRef: fref('a') },
        { t: 0.9, profileRef: fref('b') },
      ],
    })).toBe(false);
    // Ends before 1:
    expect(isVariableSweepMetadata({
      spineRef: fref('curve3d_1'),
      sections: [
        { t: 0, profileRef: fref('a') },
        { t: 0.9, profileRef: fref('b') },
      ],
    })).toBe(false);
  });

  it('rejects fewer than 2 sections', () => {
    expect(isVariableSweepMetadata({
      spineRef: fref('curve3d_1'),
      sections: [{ t: 0, profileRef: fref('a') }],
    })).toBe(false);
    expect(isVariableSweepMetadata({
      spineRef: fref('curve3d_1'),
      sections: [],
    })).toBe(false);
  });

  it('rejects malformed spineRef / profileRef / orientation', () => {
    const base = {
      sections: [
        { t: 0, profileRef: fref('a') },
        { t: 1, profileRef: fref('b') },
      ],
    };
    expect(isVariableSweepMetadata({ ...base, spineRef: 'curve_1' })).toBe(false);
    expect(isVariableSweepMetadata({ ...base, spineRef: null })).toBe(false);
    expect(isVariableSweepMetadata({
      spineRef: fref('curve3d_1'),
      sections: [
        { t: 0, profileRef: 'sketch_1' },
        { t: 1, profileRef: fref('b') },
      ],
    })).toBe(false);
    expect(isVariableSweepMetadata({
      spineRef: fref('curve3d_1'),
      sections: base.sections,
      orientation: { up: [0, 0] },
    })).toBe(false);
    expect(isVariableSweepMetadata({
      spineRef: fref('curve3d_1'),
      sections: base.sections,
      orientation: 'tornado',
    })).toBe(false);
  });

  it('rejects invalid continuity / closed types', () => {
    const base = {
      spineRef: fref('curve3d_1'),
      sections: [
        { t: 0, profileRef: fref('a') },
        { t: 1, profileRef: fref('b') },
      ],
    };
    expect(isVariableSweepMetadata({ ...base, continuity: 'C5' })).toBe(false);
    expect(isVariableSweepMetadata({ ...base, closed: 'maybe' })).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(isVariableSweepMetadata(null)).toBe(false);
    expect(isVariableSweepMetadata('sweep')).toBe(false);
  });
});
