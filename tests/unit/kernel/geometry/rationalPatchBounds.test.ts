// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The pole box of a curved B-spline patch is loose. splineSurfaceBounds must
// stay an outer bound and come within `tol` of the true extent.

import { describe, it, expect } from 'vitest';
import {
  emptyBox,
  splineSurfaceBounds,
  type HPoint,
  type SplineSurface,
} from '../../../../src/kernel/geometry/rationalPatchBounds';

const R = 3;
const H = 2;
const W = Math.SQRT1_2;

/** Exact rational quadratic quarter cylinder of radius R, angle 0..90 deg in
 *  u, height 0..H in v: the pole box is R x R, the surface is not. Rotated
 *  by 45 deg about Z its +X extent is R at the middle of u. */
function quarterCylinder(rotateDeg = 0): SplineSurface {
  const c = Math.cos((rotateDeg * Math.PI) / 180);
  const s = Math.sin((rotateDeg * Math.PI) / 180);
  const ring: [number, number, number][] = [[R, 0, 1], [R, R, W], [0, R, 1]];
  const poles = ring.map(([x, y, w]) =>
    [0, H].map((z): HPoint => [(c * x - s * y) * w, (s * x + c * y) * w, z * w, w]),
  );
  return { uDegree: 2, vDegree: 1, uKnots: [0, 0, 0, 1, 1, 1], vKnots: [0, 0, 1, 1], poles };
}

describe('splineSurfaceBounds', () => {
  it('tightens the pole box of a rotated quarter cylinder to tol', () => {
    const tol = 1e-4;
    const inner = emptyBox();
    const box = splineSurfaceBounds(quarterCylinder(-45), { u1: 0, u2: 1, v1: 0, v2: 1 }, inner, tol, { splits: 10_000 })!;
    // Pole box +X is R*cos45 + R*sin45 = 4.24; the arc reaches R = 3.
    expect(box[3]).toBeGreaterThanOrEqual(R - 1e-12);
    expect(box[3]).toBeLessThan(R + tol);
    expect(box[2]).toBeCloseTo(0, 12);
    expect(box[5]).toBeCloseTo(H, 12);
    // The inner box holds surface points only.
    expect(inner[3]).toBeLessThanOrEqual(R + 1e-12);
  });

  it('bounds only the requested parameter range', () => {
    const box = splineSurfaceBounds(quarterCylinder(), { u1: 0, u2: 1, v1: 0, v2: 0.5 }, emptyBox(), 1e-4, { splits: 10_000 })!;
    expect(box[5]).toBeCloseTo(H / 2, 12);
  });

  it('keeps the pole box when the split budget is spent', () => {
    const box = splineSurfaceBounds(quarterCylinder(-45), { u1: 0, u2: 1, v1: 0, v2: 1 }, emptyBox(), 1e-4, { splits: 0 })!;
    expect(box[3]).toBeCloseTo(2 * R * W, 12);
  });

  it('refuses non-positive weights (no convex-hull guarantee)', () => {
    const surface = quarterCylinder();
    surface.poles[1][0] = [0, 0, 0, 0];
    expect(splineSurfaceBounds(surface, { u1: 0, u2: 1, v1: 0, v2: 1 }, emptyBox(), 1e-4, { splits: 10 })).toBeUndefined();
  });

  it('splits interior knots into Bezier patches and stays an outer bound', () => {
    // Cubic in u with an interior knot: y = bump; every sampled point must lie inside.
    const xs = [0, 1, 2, 3, 4];
    const ys = [0, 2, -1, 2, 0];
    const poles = xs.map((x, i) => [0, 1].map((z): HPoint => [x, ys[i], z, 1]));
    const surface: SplineSurface = { uDegree: 3, vDegree: 1, uKnots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1], vKnots: [0, 0, 1, 1], poles };
    const box = splineSurfaceBounds(surface, { u1: 0, u2: 1, v1: 0, v2: 1 }, emptyBox(), 1e-6, { splits: 10_000 })!;
    let yMax = -Infinity;
    let yMin = Infinity;
    for (let k = 0; k <= 2000; k++) {
      const y = evalCurveY(surface.uKnots, 3, ys, k / 2000);
      yMax = Math.max(yMax, y);
      yMin = Math.min(yMin, y);
    }
    expect(box[4]).toBeGreaterThanOrEqual(yMax - 1e-12);
    expect(box[4]).toBeLessThan(yMax + 1e-5);
    expect(box[1]).toBeLessThanOrEqual(yMin + 1e-12);
    expect(box[1]).toBeGreaterThan(yMin - 1e-5);
    expect(box[4]).toBeLessThan(2); // tighter than the pole box
  });
});

/** De Boor evaluation of a scalar non-rational B-spline. */
function evalCurveY(U: number[], p: number, c: number[], t: number): number {
  let k = p;
  while (k < U.length - p - 2 && t >= U[k + 1]) k++;
  const d = c.slice(k - p, k + 1);
  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const i = k - p + j;
      const a = (t - U[i]) / (U[i + p - r + 1] - U[i]);
      d[j] = (1 - a) * d[j - 1] + a * d[j];
    }
  }
  return d[p];
}
