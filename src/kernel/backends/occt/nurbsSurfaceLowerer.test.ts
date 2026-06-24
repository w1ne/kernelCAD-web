// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from './occtBackend';
import {
  buildNurbsFace,
  thickenFace,
  faceToShape,
  clampedUniformKnots,
  decomposeKnots,
} from './nurbsSurfaceLowerer';

describe('nurbsSurfaceLowerer pure helpers', () => {
  it('clampedUniformKnots: nU=2 degree=1 → endpoints [0, 1] mults [2, 2]', () => {
    const { knots, mults } = clampedUniformKnots(2, 1);
    expect(knots).toEqual([0, 1]);
    expect(mults).toEqual([2, 2]);
  });

  it('clampedUniformKnots: nU=4 degree=2 → 3 distinct knots, mults [3, 1, 3]', () => {
    const { knots, mults } = clampedUniformKnots(4, 2);
    expect(knots.length).toBe(3);
    expect(mults).toEqual([3, 1, 3]);
  });

  it('decomposeKnots: [0,0,0,1,1,1] → knots=[0,1], mults=[3,3]', () => {
    expect(decomposeKnots([0, 0, 0, 1, 1, 1]))
      .toEqual({ knots: [0, 1], mults: [3, 3] });
  });

  it('decomposeKnots: [0,0,0.5,1,1] → knots=[0,0.5,1], mults=[2,1,2]', () => {
    expect(decomposeKnots([0, 0, 0.5, 1, 1]))
      .toEqual({ knots: [0, 0.5, 1], mults: [2, 1, 2] });
  });
});

describe('nurbsSurfaceLowerer OCCT-direct', () => {
  beforeAll(async () => { await initOcct(); });

  it('buildNurbsFace: planar 2x2 control net → non-null Face', () => {
    const face = buildNurbsFace({
      controls: [
        [[0, 0, 0], [0, 10, 0]],
        [[10, 0, 0], [10, 10, 0]],
      ],
      degree: { u: 1, v: 1 },
    });
    expect(face).toBeTruthy();
  });

  it('thickenFace: planar 2x2 face with t=2 → closed solid with z span ≈ 2', () => {
    const face = buildNurbsFace({
      controls: [
        [[0, 0, 0], [0, 10, 0]],
        [[10, 0, 0], [10, 10, 0]],
      ],
      degree: { u: 1, v: 1 },
    });
    const solid = thickenFace(face, 2);
    expect(solid.volume()).toBeGreaterThan(0);
    const bb = solid.boundingBox();
    expect(Math.abs((bb.max[2] - bb.min[2]) - 2)).toBeLessThan(0.1);
  });

  it('faceToShape: produces a zero-volume shell', () => {
    const face = buildNurbsFace({
      controls: [
        [[0, 0, 0], [0, 10, 0]],
        [[10, 0, 0], [10, 10, 0]],
      ],
      degree: { u: 1, v: 1 },
    });
    const shape = faceToShape(face);
    expect(Math.abs(shape.volume())).toBeLessThan(1e-3);
  });

  it('buildNurbsFace: 3x3 control net (degree 2,2) produces a smooth Face', () => {
    const face = buildNurbsFace({
      controls: [
        [[0, 0, 0], [0, 5, 1], [0, 10, 0]],
        [[5, 0, 1], [5, 5, 2], [5, 10, 1]],
        [[10, 0, 0], [10, 5, 1], [10, 10, 0]],
      ],
      degree: { u: 2, v: 2 },
    });
    expect(face).toBeTruthy();
  });

  it('buildNurbsFace: weights argument is accepted and builds a rational Face', () => {
    // Weights are now honored (Geom_BSplineSurface_2). A constant-weight grid
    // is mathematically identical to the non-rational surface, but exercises
    // the rational construction path end-to-end.
    const face = buildNurbsFace({
      controls: [
        [[0, 0, 0], [0, 10, 0]],
        [[10, 0, 0], [10, 10, 0]],
      ],
      weights: [
        [1, 1],
        [1, 1],
      ],
      degree: { u: 1, v: 1 },
    });
    expect(face).toBeTruthy();
  });

  it('builds an EXACT (rational) cylinder when weights are supplied', () => {
    // A degree-(2,1) rational patch using the standard 9-control-point unit
    // circle in U (corner weights 1, mid-edge weights √2/2) extruded in Z.
    // Only the RATIONAL surface reproduces the circle exactly; a non-rational
    // polynomial of the same control net bulges off the circle by ~1e-2.
    const w = Math.SQRT1_2;
    // 9 control points tracing the unit circle (square-corner control polygon).
    const ring: Array<[number, number]> = [
      [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0],
      [-1, -1], [0, -1], [1, -1], [1, 0],
    ];
    // Extrude each U-pole in Z (v=0 → z=0, v=1 → z=2) → a cylinder of height 2.
    const controls = ring.map(([x, y]) => [[x, y, 0], [x, y, 2]] as [number, number, number][]);
    // Odd-indexed poles are the square corners → weight √2/2; even are on-circle.
    const weights = ring.map((_, i) => (i % 2 === 1 ? [w, w] : [1, 1]));
    // Standard rational-circle knot vector: 4 quarter-arcs, each clamped deg-2.
    const uKnots = [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1];
    const vKnots = [0, 0, 1, 1];

    const face = buildNurbsFace({
      controls,
      weights,
      degree: { u: 2, v: 1 },
      knots: { u: uKnots, v: vKnots },
    });
    expect(face).toBeTruthy();

    // Sample the surface directly via OCCT's evaluator (no tessellation error)
    // at mid-height and across the full U span; assert |xy| == 1.0 ± 1e-6.
    const { uMin, uMax } = face.UVBounds;
    let maxRadiusErr = 0;
    const N = 64;
    for (let k = 0; k <= N; k++) {
      const u = uMin + ((uMax - uMin) * k) / N;
      const p = face.pointOnSurface(u, 0.5); // v=0.5 → mid-height
      const r = Math.hypot(p.x, p.y);
      maxRadiusErr = Math.max(maxRadiusErr, Math.abs(r - 1));
    }
    expect(maxRadiusErr).toBeLessThan(1e-6);
  });
});
