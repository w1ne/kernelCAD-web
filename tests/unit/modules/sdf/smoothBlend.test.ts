// tests/unit/modules/sdf/smoothBlend.test.ts
//
// Verifies the polynomial smooth-min combinator and AABB padding.

import { describe, it, expect } from 'vitest';
import { sphere } from '../../../../src/modeling/sdf/primitives';
import { smoothBlend } from '../../../../src/modeling/sdf/smoothBlend';

describe('sdf.smoothBlend', () => {
  it('AABB is the union of inputs padded by k on each face', () => {
    const a = sphere(10);  // aabb: ±10
    const b = sphere(10);
    const k = 3;
    const blended = smoothBlend(a, b, k);
    expect(blended.aabb.min).toEqual([-13, -13, -13]);
    expect(blended.aabb.max).toEqual([13, 13, 13]);
    expect(blended.kind).toBe('smoothBlend');
  });

  it('reduces to min(a, b) as k -> 0', () => {
    const a = sphere(10);
    const b = sphere(5);
    const blended = smoothBlend(a, b, 0.001);  // very small k
    // At a point far outside, smoothBlend approximates min(a, b).
    const p: [number, number, number] = [20, 0, 0];
    const da = a(p);  // 20 - 10 = 10
    const db = b(p);  // 20 - 5 = 15
    expect(blended(p)).toBeCloseTo(Math.min(da, db), 2);
  });

  it('at the equidistance point (da = db), value = a(p) - k/4', () => {
    // Polynomial smin: when da == db == d, smin(d, d, k) = d - k/4.
    // Construct a point where a(p) == b(p): both spheres at origin (radius 10),
    // any point on the surface has both distances = 0. But we need da == db
    // for two DIFFERENT fields — place two spheres symmetric about the y-axis.
    // Simpler: two identical sphere(10) → da == db everywhere. At origin:
    // da = db = -10. smin = -10 - k/4.
    const a = sphere(10);
    const b = sphere(10);
    const k = 4;
    const blended = smoothBlend(a, b, k);
    expect(blended([0, 0, 0])).toBeCloseTo(-10 - k / 4, 6);
  });

  it('smoothing reduces the value at the equidistance point (vs hard min)', () => {
    const a = sphere(10);
    const b = sphere(10);
    const k = 5;
    const blended = smoothBlend(a, b, k);
    const hard = Math.min(a([0, 0, 0]), b([0, 0, 0]));  // -10
    const smooth = blended([0, 0, 0]);                  // -10 - 1.25
    expect(smooth).toBeLessThan(hard);
  });

  it('rejects k <= 0 with feature.sdf.field-undefined NOT YET — this is a captime check; combinator throws', () => {
    expect(() => smoothBlend(sphere(10), sphere(10), 0)).toThrow();
    expect(() => smoothBlend(sphere(10), sphere(10), -1)).toThrow();
  });
});
