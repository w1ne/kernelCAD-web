// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../occt/occtBackend';
import { CaptureSession } from '../../../modeling/capture/captureSession';
import type { Curve3DMetadata } from '../../../shared/intent/curve3dRecord';
import type { Curve3D } from '../../../modeling/capture/curveProxy';
import type { Vec3 } from '../../../shared/intent/types';
import { toVerb, fromVerb } from './curveBridge';

beforeAll(async () => {
  await initOcct();
});

function buildCurve(metadata: Curve3DMetadata): Curve3D {
  const session = new CaptureSession();
  return session.addCurve3D({ metadata });
}

function nonRationalCurve(): Curve3D {
  return buildCurve({
    controlPoints: [[0, 0, 0], [10, 10, 0], [20, 0, 0], [30, 10, 0]],
    degree: 3,
    closed: false,
  });
}

function rationalCurve(): Curve3D {
  return buildCurve({
    controlPoints: [[0, 0, 0], [10, 10, 0], [20, 0, 0], [30, 10, 0]],
    degree: 3,
    weights: [1, 2, 1, 2],
    closed: false,
  });
}

function nonUniformCurve(): Curve3D {
  return buildCurve({
    controlPoints: [
      [0, 0, 0], [5, 5, 0], [10, 0, 0], [15, 8, 0],
      [20, 0, 0], [25, 5, 0], [30, 0, 0], [35, 8, 0],
    ],
    degree: 5,
    // n + d + 1 = 8 + 5 + 1 = 14 knots
    knots: [0, 0, 0, 0, 0, 0, 0.4, 0.7, 1, 1, 1, 1, 1, 1],
    closed: false,
  });
}

function samplePointsFromEdge(
  edge: import('replicad').Edge,
  n: number,
): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(edge.pointAt(t).toTuple());
  }
  return out;
}

describe('curveBridge — round-trip', () => {
  it('round-trips a degree-3 non-rational curve within 1e-3 mm', () => {
    const original = nonRationalCurve();
    const verbCurve = toVerb(original);
    const edge = fromVerb(verbCurve);

    const originalSamples = original.sample(20);
    const reconstructedSamples = samplePointsFromEdge(edge, 20);
    for (let i = 0; i < originalSamples.length; i++) {
      for (let axis = 0; axis < 3; axis++) {
        expect(reconstructedSamples[i][axis]).toBeCloseTo(originalSamples[i][axis], 3);
      }
    }
  });

  it('round-trips a rational curve with non-trivial weights', () => {
    const original = rationalCurve();
    const verbCurve = toVerb(original);
    const edge = fromVerb(verbCurve);
    const a = original.sample(20);
    const b = samplePointsFromEdge(edge, 20);
    for (let i = 0; i < a.length; i++) {
      for (let axis = 0; axis < 3; axis++) {
        expect(b[i][axis]).toBeCloseTo(a[i][axis], 3);
      }
    }
  });

  it('round-trips a degree-5 curve with explicit non-uniform knots', () => {
    const original = nonUniformCurve();
    const verbCurve = toVerb(original);
    const edge = fromVerb(verbCurve);
    const a = original.sample(20);
    const b = samplePointsFromEdge(edge, 20);
    for (let i = 0; i < a.length; i++) {
      for (let axis = 0; axis < 3; axis++) {
        expect(b[i][axis]).toBeCloseTo(a[i][axis], 3);
      }
    }
  });
});

describe('curveBridge — toVerb cache', () => {
  it('caches the JS curve on the proxy instance via Symbol', () => {
    const c = nonRationalCurve();
    const v1 = toVerb(c);
    const v2 = toVerb(c);
    expect(v1).toBe(v2);
  });

  it('invalidates the cache when the __paramVersion counter bumps', () => {
    const c = nonRationalCurve();
    const v1 = toVerb(c);
    const PARAM_VERSION = Symbol.for('kernelcad.curve3d.__paramVersion');
    const carrier = c as unknown as Record<symbol, number>;
    carrier[PARAM_VERSION] = (carrier[PARAM_VERSION] ?? 0) + 1;
    const v2 = toVerb(c);
    expect(v1).not.toBe(v2);
  });
});

describe('curveBridge — produces a usable Geom_BSplineCurve', () => {
  it('fromVerb yields a replicad Edge whose curve is parameterised', () => {
    const c = nonRationalCurve();
    const v = toVerb(c);
    const edge = fromVerb(v);
    // Smoke: the edge must support pointAt + tangentAt without throwing.
    const start = edge.pointAt(0).toTuple();
    const end = edge.pointAt(1).toTuple();
    expect(Number.isFinite(start[0])).toBe(true);
    expect(Number.isFinite(end[0])).toBe(true);
    // Endpoints should match the original control polygon endpoints.
    expect(start[0]).toBeCloseTo(0, 3);
    expect(end[0]).toBeCloseTo(30, 3);
  });
});
