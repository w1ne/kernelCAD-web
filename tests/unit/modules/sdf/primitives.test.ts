// tests/unit/modules/sdf/primitives.test.ts
//
// Distance-math correctness for the SDF primitives. Each primitive is
// tested at 5 probe points: centre (deep inside), on-surface, far outside,
// near-surface, opposite-side.

import { describe, it, expect } from 'vitest';
import { sphere, box, cylinder, torus } from '../../../../src/modeling/sdf/primitives';

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

describe('sdf.box', () => {
  const b = box([20, 10, 6]);  // axis-aligned, centred at origin

  it('reports the right AABB', () => {
    expect(b.aabb.min).toEqual([-10, -5, -3]);
    expect(b.aabb.max).toEqual([10, 5, 3]);
    expect(b.kind).toBe('box');
  });

  it('distance at the centre = -min(half-extent)', () => {
    // Deepest inside-distance is -min(sx/2, sy/2, sz/2) = -3 here.
    expect(b([0, 0, 0])).toBeCloseTo(-3, 6);
  });

  it('distance on the +X face = 0', () => {
    expect(b([10, 0, 0])).toBeCloseTo(0, 6);
  });

  it('distance 5 mm outside the +X face = 5', () => {
    expect(b([15, 0, 0])).toBeCloseTo(5, 6);
  });

  it('distance at a corner outside = euclidean to corner', () => {
    // Far corner is (10, 5, 3). From (13, 9, 6), distance to corner is
    // sqrt(3^2 + 4^2 + 3^2) = sqrt(34).
    expect(b([13, 9, 6])).toBeCloseTo(Math.sqrt(34), 6);
  });

  it('rejects non-finite or non-positive size components', () => {
    expect(() => box([0, 10, 10])).toThrow();
    expect(() => box([-1, 10, 10])).toThrow();
    expect(() => box([NaN, 10, 10])).toThrow();
  });
});

describe('sdf.cylinder', () => {
  const c = cylinder(5, 20);  // radius 5, height 20, axis +Z, centred at origin

  it('reports the right AABB', () => {
    expect(c.aabb.min).toEqual([-5, -5, -10]);
    expect(c.aabb.max).toEqual([5, 5, 10]);
    expect(c.kind).toBe('cylinder');
  });

  it('distance at the centre = -min(r, h/2)', () => {
    // Deepest inside is -min(5, 10) = -5.
    expect(c([0, 0, 0])).toBeCloseTo(-5, 6);
  });

  it('distance on the side surface = 0', () => {
    expect(c([5, 0, 0])).toBeCloseTo(0, 6);
  });

  it('distance on the top cap = 0', () => {
    expect(c([0, 0, 10])).toBeCloseTo(0, 6);
  });

  it('distance outside the top = 5', () => {
    expect(c([0, 0, 15])).toBeCloseTo(5, 6);
  });

  it('rejects non-positive r or h', () => {
    expect(() => cylinder(0, 10)).toThrow();
    expect(() => cylinder(5, 0)).toThrow();
  });
});

describe('sdf.torus', () => {
  const t = torus(10, 2);  // major R=10, minor r=2

  it('reports the right AABB', () => {
    expect(t.aabb.min).toEqual([-12, -12, -2]);
    expect(t.aabb.max).toEqual([12, 12, 2]);
    expect(t.kind).toBe('torus');
  });

  it('distance at the ring centre = 0 (on tube surface — but origin is in the hole)', () => {
    // At origin, distance to nearest tube-centre is R=10; tube radius is r=2.
    // So distance is 10 - 2 = 8 (outside).
    expect(t([0, 0, 0])).toBeCloseTo(8, 6);
  });

  it('distance on the outer equator = 0', () => {
    expect(t([12, 0, 0])).toBeCloseTo(0, 6);
  });

  it('distance on the inner equator = 0', () => {
    expect(t([8, 0, 0])).toBeCloseTo(0, 6);
  });

  it('distance at the tube core = -r', () => {
    // Tube-core circle is (10,0,0) etc.; deepest-inside is -r = -2.
    expect(t([10, 0, 0])).toBeCloseTo(-2, 6);
  });

  it('rejects non-positive params', () => {
    expect(() => torus(0, 2)).toThrow();
    expect(() => torus(10, 0)).toThrow();
  });
});
