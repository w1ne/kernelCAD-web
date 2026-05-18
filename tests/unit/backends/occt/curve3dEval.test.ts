import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { lazyEvalCurve } from '../../../../src/modeling/backends/occt/curve3dEval';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import type { Curve3DMetadata } from '../../../../src/shared/intent/curve3dRecord';
import type { FeatureId } from '../../../../src/shared/intent/types';

const EPS = 1e-6;
function approxEq(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps;
}

describe('curve3dEval.lazyEvalCurve', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('sample(4) returns 5 points; endpoints match the control polygon of a degree-1 line', () => {
    const session = new CaptureSession();
    const m: Curve3DMetadata = {
      controlPoints: [
        [0, 0, 0],
        [10, 0, 0],
      ],
      degree: 1,
      closed: false,
    };
    const ev = lazyEvalCurve(session, 'curve-line' as FeatureId, m);
    const pts = ev.sample(4);
    expect(pts).toHaveLength(5);
    expect(approxEq(pts[0][0], 0)).toBe(true);
    expect(approxEq(pts[0][1], 0)).toBe(true);
    expect(approxEq(pts[0][2], 0)).toBe(true);
    expect(approxEq(pts[4][0], 10)).toBe(true);
    expect(approxEq(pts[4][1], 0)).toBe(true);
    expect(approxEq(pts[4][2], 0)).toBe(true);
    // Midpoint of a straight line should sit at (5, 0, 0).
    expect(approxEq(pts[2][0], 5)).toBe(true);
    expect(approxEq(pts[2][1], 0)).toBe(true);
  });

  it('tangentAt(0.5) for a straight x-axis line returns the unit +X vector', () => {
    const session = new CaptureSession();
    const m: Curve3DMetadata = {
      controlPoints: [
        [0, 0, 0],
        [10, 0, 0],
      ],
      degree: 1,
      closed: false,
    };
    const ev = lazyEvalCurve(session, 'curve-tan' as FeatureId, m);
    const [tx, ty, tz] = ev.tangentAt(0.5);
    expect(approxEq(tx, 1)).toBe(true);
    expect(approxEq(ty, 0)).toBe(true);
    expect(approxEq(tz, 0)).toBe(true);
    // Magnitude one (the evaluator normalizes).
    const mag = Math.sqrt(tx * tx + ty * ty + tz * tz);
    expect(approxEq(mag, 1)).toBe(true);
  });

  it('length() of a 10mm straight line returns ≈ 10', () => {
    const session = new CaptureSession();
    const m: Curve3DMetadata = {
      controlPoints: [
        [0, 0, 0],
        [10, 0, 0],
      ],
      degree: 1,
      closed: false,
    };
    const ev = lazyEvalCurve(session, 'curve-len' as FeatureId, m);
    expect(approxEq(ev.length(), 10, 1e-4)).toBe(true);
  });

  it('caches the evaluator per (session, id) — repeated calls return the same instance', () => {
    const session = new CaptureSession();
    const m: Curve3DMetadata = {
      controlPoints: [
        [0, 0, 0],
        [1, 0, 0],
      ],
      degree: 1,
      closed: false,
    };
    const a = lazyEvalCurve(session, 'curve-cache' as FeatureId, m);
    const b = lazyEvalCurve(session, 'curve-cache' as FeatureId, m);
    expect(a).toBe(b);
  });

  it('parks the lowered edge on session.importedGeometry for downstream consumers', () => {
    const session = new CaptureSession();
    const m: Curve3DMetadata = {
      controlPoints: [
        [0, 0, 0],
        [5, 0, 0],
      ],
      degree: 1,
      closed: false,
    };
    const id = 'curve-park' as FeatureId;
    expect(session.importedGeometry.has(id)).toBe(false);
    lazyEvalCurve(session, id, m);
    expect(session.importedGeometry.has(id)).toBe(true);
  });

  it('pointAt clamps t outside [0, 1] to the endpoints', () => {
    const session = new CaptureSession();
    const m: Curve3DMetadata = {
      controlPoints: [
        [0, 0, 0],
        [10, 0, 0],
      ],
      degree: 1,
      closed: false,
    };
    const ev = lazyEvalCurve(session, 'curve-clamp' as FeatureId, m);
    const lo = ev.pointAt(-1);
    const hi = ev.pointAt(2);
    expect(approxEq(lo[0], 0)).toBe(true);
    expect(approxEq(hi[0], 10)).toBe(true);
  });
});
