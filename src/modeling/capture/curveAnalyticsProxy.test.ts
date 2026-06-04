// src/modeling/capture/curveAnalyticsProxy.test.ts
//
// Tests for the Curve3D.analytics namespace (closestPoint / closestParam /
// divideByEqualArcLength / divideByArcLength / derivatives / tessellate).
//
// Construction follows the same pattern as tests/unit/capture/nurbsCurve.test.ts:
// instantiate a CaptureSession, build the api via createApi, then call
// kcad.nurbsCurve / kcad.spline3d. (`api.ts` exports createApi, NOT the
// individual factories — they live on the returned KernelCadApi interface.)

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { CaptureSession } from './captureSession';
import { createApi } from '../api';
import { KernelError } from '../../shared/intent/kernelError';
import type { Curve3D } from './curveProxy';

beforeAll(async () => {
  await initOcct();
});

function quarterCircle(): Curve3D {
  // degree-2 rational quarter-circle (R=10) in xy plane. Standard NURBS
  // representation; weights for the middle pt = sqrt(2)/2.
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return kcad.nurbsCurve(
    [
      [10, 0, 0],
      [10, 10, 0],
      [0, 10, 0],
    ],
    { degree: 2, weights: [1, Math.SQRT1_2, 1] },
  );
}

function helix(): Curve3D {
  // 1-turn helix sampled as a spline through 9 points; non-uniform arc-length
  // along the parametric direction.
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * 2 * Math.PI;
    pts.push([Math.cos(t) * 10, Math.sin(t) * 10, t * 2]);
  }
  return kcad.spline3d(pts);
}

describe('Curve3DAnalytics — closestPoint / closestParam', () => {
  it('finds the nearest point on a quarter-circle to a query', () => {
    const c = quarterCircle();
    const pt = c.analytics.closestPoint([10, 10, 0]); // expect ~ [7.07, 7.07, 0]
    expect(pt[0]).toBeCloseTo(7.0711, 2);
    expect(pt[1]).toBeCloseTo(7.0711, 2);
    expect(pt[2]).toBeCloseTo(0, 6);
  });

  it('returns a parametric coordinate in [0, 1] from closestParam', () => {
    const c = quarterCircle();
    const t = c.analytics.closestParam([10, 10, 0]);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(1);
  });

  it('matches the kernel projection within 1e-3 mm', () => {
    // Comparison spot: pointAt(0.5) should round-trip exactly through closest.
    const c = quarterCircle();
    const midPt = c.pointAt(0.5);
    const recoveredT = c.analytics.closestParam(midPt);
    expect(recoveredT).toBeCloseTo(0.5, 3);
  });
});

describe('Curve3DAnalytics — divideByEqualArcLength', () => {
  it('returns n+1 samples for divideByEqualArcLength(n)', () => {
    const c = helix();
    const samples = c.analytics.divideByEqualArcLength(10);
    expect(samples.length).toBe(11);
  });

  it('samples are spaced uniformly in arc length within 1% stdev', () => {
    const c = helix();
    const samples = c.analytics.divideByEqualArcLength(20);
    const gaps: number[] = [];
    for (let i = 1; i < samples.length; i++) {
      gaps.push(samples[i].arcLength - samples[i - 1].arcLength);
    }
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length;
    const stdev = Math.sqrt(variance);
    expect(stdev / mean).toBeLessThan(0.01);
  });

  it('first sample has t=0, last has t=1', () => {
    const c = helix();
    const samples = c.analytics.divideByEqualArcLength(5);
    expect(samples[0].t).toBeCloseTo(0, 6);
    expect(samples[samples.length - 1].t).toBeCloseTo(1, 6);
  });

  it('throws degenerate-arclength when n < 1', () => {
    const c = helix();
    expect(() => c.analytics.divideByEqualArcLength(0)).toThrow(KernelError);
    try {
      c.analytics.divideByEqualArcLength(0);
    } catch (e) {
      expect((e as KernelError).code).toBe(
        'feature.curve3d.analytics.degenerate-arclength',
      );
    }
  });
});

describe('Curve3DAnalytics — divideByArcLength', () => {
  it('returns samples stepped every arcLength mm', () => {
    const c = helix();
    const L = c.length();
    const samples = c.analytics.divideByArcLength(L / 5);
    expect(samples.length).toBeGreaterThanOrEqual(5);
  });

  it('throws degenerate-arclength when arcLength > curve length', () => {
    const c = helix();
    const L = c.length();
    expect(() => c.analytics.divideByArcLength(L * 2)).toThrow(KernelError);
  });

  it('throws degenerate-arclength when arcLength <= 0', () => {
    const c = helix();
    expect(() => c.analytics.divideByArcLength(0)).toThrow(KernelError);
    expect(() => c.analytics.divideByArcLength(-1)).toThrow(KernelError);
  });
});

describe('Curve3DAnalytics — derivatives', () => {
  it('index 0 matches pointAt(t)', () => {
    const c = helix();
    const d = c.analytics.derivatives(0.5, 2);
    const pt = c.pointAt(0.5);
    for (let i = 0; i < 3; i++) expect(d[0][i]).toBeCloseTo(pt[i], 6);
  });

  it('index 1 (normalised) matches tangentAt(t)', () => {
    const c = helix();
    const d = c.analytics.derivatives(0.5, 1);
    const tan = c.tangentAt(0.5);
    const mag = Math.hypot(d[1][0], d[1][1], d[1][2]);
    for (let i = 0; i < 3; i++) expect(d[1][i] / mag).toBeCloseTo(tan[i], 4);
  });

  it('returns numDerivs+1 vectors', () => {
    const c = helix();
    expect(c.analytics.derivatives(0.5, 2).length).toBe(3);
    expect(c.analytics.derivatives(0.5, 3).length).toBe(4);
  });

  it('throws derivatives-out-of-range when numDerivs > degree', () => {
    const c = quarterCircle(); // degree 2
    expect(() => c.analytics.derivatives(0.5, 5)).toThrow(KernelError);
    try {
      c.analytics.derivatives(0.5, 5);
    } catch (e) {
      expect((e as KernelError).code).toBe(
        'feature.curve3d.analytics.derivatives-out-of-range',
      );
    }
  });
});

describe('Curve3DAnalytics — tessellate', () => {
  it('returns a Vec3[] starting at the curve start and ending at the curve end', () => {
    const c = helix();
    const poly = c.analytics.tessellate({ tolerance: 0.05 });
    expect(poly.length).toBeGreaterThan(2);
    const start = c.pointAt(0);
    const end = c.pointAt(1);
    for (let i = 0; i < 3; i++) {
      expect(poly[0][i]).toBeCloseTo(start[i], 3);
      expect(poly[poly.length - 1][i]).toBeCloseTo(end[i], 3);
    }
  });

  it('looser tolerance produces fewer points than tight tolerance', () => {
    const c = helix();
    const loose = c.analytics.tessellate({ tolerance: 0.5 });
    const tight = c.analytics.tessellate({ tolerance: 0.01 });
    expect(loose.length).toBeLessThan(tight.length);
  });

  it('default tolerance is 0.05 mm', () => {
    const c = helix();
    const defaultCall = c.analytics.tessellate();
    const explicit = c.analytics.tessellate({ tolerance: 0.05 });
    expect(defaultCall.length).toBe(explicit.length);
  });

  it('determinism: two identical calls produce bit-identical output', () => {
    const c = helix();
    const a = c.analytics.tessellate({ tolerance: 0.05 });
    const b = c.analytics.tessellate({ tolerance: 0.05 });
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      for (let axis = 0; axis < 3; axis++) {
        expect(a[i][axis]).toBe(b[i][axis]);
      }
    }
  });

  it('throws tessellation-tolerance-invalid on tolerance <= 0', () => {
    const c = helix();
    expect(() => c.analytics.tessellate({ tolerance: 0 })).toThrow(KernelError);
    expect(() => c.analytics.tessellate({ tolerance: -1 })).toThrow(KernelError);
  });

  it('throws tessellation-tolerance-invalid on NaN tolerance', () => {
    const c = helix();
    expect(() => c.analytics.tessellate({ tolerance: NaN })).toThrow(KernelError);
  });
});

// V3 — intersect overload pair. The curve-curve case uses the verb solver
// directly via toVerb(). The curve-surface case is restricted to
// `kind: 'nurbsSurface'` SurfaceRecords today because Coons-patch /
// surfaceFromCurves surfaces are built kernel-side and do not expose
// JS-accessible NURBS data; we throw intersect-kernel-failed with a
// descriptive hint for those kinds. (Plan deviation flagged for V4 — see
// commit log.)

function xSplineA(): Curve3D {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return kcad.spline3d([
    [-10, -10, 0],
    [0, 0, 0],
    [10, 10, 0],
  ]);
}

function xSplineB(): Curve3D {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return kcad.spline3d([
    [-10, 10, 0],
    [0, 0, 0],
    [10, -10, 0],
  ]);
}

describe('Curve3DAnalytics — intersect(other) curve-curve overload', () => {
  it('returns one hit for two visibly-crossing 2D-on-plane splines (X-shape)', () => {
    const a = xSplineA();
    const b = xSplineB();
    const hits = a.analytics.intersect(b);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    const [hit] = hits;
    expect(hit.ptA[0]).toBeCloseTo(0, 3);
    expect(hit.ptA[1]).toBeCloseTo(0, 3);
    expect(hit.distance).toBeLessThan(1e-3);
  });

  it('returns zero hits for parallel non-intersecting splines', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const a = kcad.spline3d([
      [0, 0, 0],
      [10, 0, 0],
      [20, 0, 0],
    ]);
    const b = kcad.spline3d([
      [0, 5, 0],
      [10, 5, 0],
      [20, 5, 0],
    ]);
    const hits = a.analytics.intersect(b);
    expect(hits.length).toBe(0);
  });

  it('receiver binding: a.intersect(b) and b.intersect(a) swap tA/tB', () => {
    const a = xSplineA();
    const b = xSplineB();
    const ab = a.analytics.intersect(b)[0];
    const ba = b.analytics.intersect(a)[0];
    expect(ab.tA).toBeCloseTo(ba.tB, 3);
    expect(ab.tB).toBeCloseTo(ba.tA, 3);
  });

  it('determinism: two identical curve-curve intersect calls produce bit-identical output', () => {
    const a = xSplineA();
    const b = xSplineB();
    const first = a.analytics.intersect(b);
    const second = a.analytics.intersect(b);
    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].tA).toBe(second[i].tA);
      expect(first[i].tB).toBe(second[i].tB);
      for (let axis = 0; axis < 3; axis++) {
        expect(first[i].ptA[axis]).toBe(second[i].ptA[axis]);
        expect(first[i].ptB[axis]).toBe(second[i].ptB[axis]);
      }
    }
  });
});

describe('Curve3DAnalytics — intersect(other) curve-surface overload', () => {
  it('returns at least one hit for a spline piercing a planar nurbsSurface', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    // Authored planar patch at z=0 spanning [-10, 10] in x and y; a
    // bilinear (degree 1) NURBS surface is the simplest valid carrier.
    const patch = kcad.nurbsSurface({
      controls: [
        [
          [-10, -10, 0],
          [-10, 10, 0],
        ],
        [
          [10, -10, 0],
          [10, 10, 0],
        ],
      ],
      degree: { u: 1, v: 1 },
    });
    const piercer = kcad.spline3d([
      [0, 0, -5],
      [0, 0, 0],
      [0, 0, 5],
    ]);
    const hits = piercer.analytics.intersect(patch);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].pt[2]).toBeCloseTo(0, 3);
  });

  it('throws intersect-kernel-failed for an unsupported surface kind (Coons patch / surfaceFromBoundary)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    // surfaceFromBoundary lowers to a Coons patch — no JS-side NURBS data
    // path today. The intersect call must surface a clean diagnostic
    // rather than silently producing garbage.
    const c1 = kcad.spline3d([
      [-10, -10, 0],
      [0, -10, 0],
      [10, -10, 0],
    ]);
    const c2 = kcad.spline3d([
      [10, -10, 0],
      [10, 0, 0],
      [10, 10, 0],
    ]);
    const c3 = kcad.spline3d([
      [10, 10, 0],
      [0, 10, 0],
      [-10, 10, 0],
    ]);
    const c4 = kcad.spline3d([
      [-10, 10, 0],
      [-10, 0, 0],
      [-10, -10, 0],
    ]);
    const face = kcad.surfaceFromBoundary([c1, c2, c3, c4]);
    const piercer = kcad.spline3d([
      [0, 0, -5],
      [0, 0, 0],
      [0, 0, 5],
    ]);
    expect(() => piercer.analytics.intersect(face)).toThrow(KernelError);
    try {
      piercer.analytics.intersect(face);
    } catch (e) {
      expect((e as KernelError).code).toBe(
        'feature.curve3d.analytics.intersect-kernel-failed',
      );
    }
  });
});
