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

  it('buildNurbsFace: weights argument is accepted (silently degraded to non-rational in slice-1)', () => {
    // TColStd_Array2OfReal isn't exposed in the WASM bindings; the
    // implementation logs a warning and falls back to Geom_BSplineSurface_1.
    // Verified non-fatal here so callers that pass weights still get a face.
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
});
