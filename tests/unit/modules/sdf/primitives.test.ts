// tests/unit/modules/sdf/primitives.test.ts
//
// Distance-math correctness for the SDF primitives. Each primitive is
// tested at 5 probe points: centre (deep inside), on-surface, far outside,
// near-surface, opposite-side.

import { describe, it, expect } from 'vitest';
import { sphere } from '../../../../src/modules/sdf/primitives';

describe('sdf.sphere', () => {
  const s = sphere(10);

  it('reports the right AABB', () => {
    expect(s.aabb.min).toEqual([-10, -10, -10]);
    expect(s.aabb.max).toEqual([10, 10, 10]);
    expect(s.kind).toBe('sphere');
  });

  it('distance at the centre = -r', () => {
    expect(s([0, 0, 0])).toBeCloseTo(-10, 6);
  });

  it('distance on the surface = 0', () => {
    expect(s([10, 0, 0])).toBeCloseTo(0, 6);
    expect(s([0, 10, 0])).toBeCloseTo(0, 6);
    expect(s([0, 0, 10])).toBeCloseTo(0, 6);
  });

  it('distance far outside = euclidean distance to surface', () => {
    // Distance from (50, 0, 0) to sphere surface (radius 10 at origin)
    // is 50 - 10 = 40.
    expect(s([50, 0, 0])).toBeCloseTo(40, 6);
  });

  it('distance near surface (outside)', () => {
    // 0.5 mm outside the surface along +X.
    expect(s([10.5, 0, 0])).toBeCloseTo(0.5, 6);
  });

  it('distance on the opposite side of origin', () => {
    expect(s([-10, 0, 0])).toBeCloseTo(0, 6);
    expect(s([-50, 0, 0])).toBeCloseTo(40, 6);
  });

  it('rejects non-positive radius', () => {
    expect(() => sphere(0)).toThrow();
    expect(() => sphere(-1)).toThrow();
    expect(() => sphere(NaN)).toThrow();
  });
});
