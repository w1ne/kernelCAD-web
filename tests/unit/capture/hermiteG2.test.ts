import { describe, it, expect, beforeAll } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { solveHermiteG2 } from '../../../src/modeling/capture/hermiteG2';
import { KernelError } from '../../../src/shared/intent/kernelError';

const EPS_TIGHT = 1e-6;
const EPS_LOOSE = 1e-3;

function approxEq(a: number, b: number, eps = EPS_TIGHT): boolean {
  return Math.abs(a - b) <= eps;
}

describe('solveHermiteG2 (pure-JS solver)', () => {
  it('returns 6 control points; B0 == a.point, B5 == b.point', () => {
    const cps = solveHermiteG2(
      { point: [0, 0, 0], tangent: [10, 0, 0] },
      { point: [10, 0, 0], tangent: [10, 0, 0] },
    );
    expect(cps).toHaveLength(6);
    expect(cps[0]).toEqual([0, 0, 0]);
    expect(cps[5]).toEqual([10, 0, 0]);
  });

  it('applies the quintic Hermite-to-Bezier formula with zero curvature', () => {
    // B1 = P0 + T0/5; B4 = P1 - T1/5; B2/B3 fold in curvature/20 (zero here).
    const cps = solveHermiteG2(
      { point: [0, 0, 0], tangent: [5, 0, 0] },
      { point: [10, 0, 0], tangent: [5, 0, 0] },
    );
    expect(cps[1]).toEqual([1, 0, 0]);     // 0 + 5/5
    expect(cps[2]).toEqual([2, 0, 0]);     // 0 + 2·5/5 + 0/20
    expect(cps[3]).toEqual([8, 0, 0]);     // 10 - 2·5/5 + 0/20
    expect(cps[4]).toEqual([9, 0, 0]);     // 10 - 5/5
  });

  it('throws non-finite-input when a coord is NaN', () => {
    let caught: unknown = null;
    try {
      solveHermiteG2(
        { point: [Number.NaN, 0, 0], tangent: [1, 0, 0] },
        { point: [10, 0, 0], tangent: [1, 0, 0] },
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.hermite-g2.non-finite-input');
  });

  it('throws non-finite-input when a curvature coord is Infinity', () => {
    let caught: unknown = null;
    try {
      solveHermiteG2(
        { point: [0, 0, 0], tangent: [1, 0, 0], curvature: [0, Number.POSITIVE_INFINITY, 0] },
        { point: [10, 0, 0], tangent: [1, 0, 0] },
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.hermite-g2.non-finite-input');
  });

  it('throws degenerate-tangent when |a.tangent| == 0', () => {
    let caught: unknown = null;
    try {
      solveHermiteG2(
        { point: [0, 0, 0], tangent: [0, 0, 0] },
        { point: [10, 0, 0], tangent: [1, 0, 0] },
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.hermite-g2.degenerate-tangent');
  });

  it('throws degenerate-tangent when |b.tangent| == 0', () => {
    let caught: unknown = null;
    try {
      solveHermiteG2(
        { point: [0, 0, 0], tangent: [1, 0, 0] },
        { point: [10, 0, 0], tangent: [0, 0, 0] },
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.hermite-g2.degenerate-tangent');
  });
});

describe('hermiteG2() — capture-time API', () => {
  it('registers a curve3d record with degree 5 and 6 control points', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const curve = kcad.hermiteG2(
      { point: [0, 0, 0], tangent: [10, 0, 0] },
      { point: [10, 0, 0], tangent: [10, 0, 0] },
    );
    const rec = session.getRecords().find((r) => r.kind === 'curve3d');
    expect(rec).toBeDefined();
    expect(curve.id).toBe(rec!.id);
    const m = rec!.metadata?.curve3d;
    expect(m?.degree).toBe(5);
    expect(m?.controlPoints).toHaveLength(6);
    expect(m?.closed).toBe(false);
  });
});

describe('hermiteG2() — OCCT evaluation', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60000);

  it('linear case: equal collinear tangents produce a curve lying on the X axis', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const curve = kcad.hermiteG2(
      { point: [0, 0, 0], tangent: [10, 0, 0] },
      { point: [10, 0, 0], tangent: [10, 0, 0] },
    );
    const samples = curve.sample(10);
    expect(samples.length).toBeGreaterThan(0);
    for (const [, y, z] of samples) {
      expect(approxEq(y, 0)).toBe(true);
      expect(approxEq(z, 0)).toBe(true);
    }
  });

  it('curved case: heading +Y at start and -Y at end bulges the curve toward +Y', () => {
    // a.tangent +Y, b.tangent -Y means the curve leaves a heading up and
    // arrives at b heading down — i.e. a single +Y hump. Symmetric +Y at
    // both ends would cancel by symmetry, so this asymmetric pair is the
    // canonical "hump" probe.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const curve = kcad.hermiteG2(
      { point: [0, 0, 0], tangent: [0, 10, 0] },
      { point: [10, 0, 0], tangent: [0, -10, 0] },
    );
    const mid = curve.pointAt(0.5);
    expect(mid[1]).toBeGreaterThan(0);
  });

  it('G2 case: non-zero curvatures change the visible bulge vs the G1-only case', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const g1 = kcad.hermiteG2(
      { point: [0, 0, 0], tangent: [0, 10, 0] },
      { point: [10, 0, 0], tangent: [0, -10, 0] },
    );
    const session2 = new CaptureSession();
    const kcad2 = createApi({ session: session2 });
    const g2 = kcad2.hermiteG2(
      { point: [0, 0, 0], tangent: [0, 10, 0], curvature: [0, 100, 0] },
      { point: [10, 0, 0], tangent: [0, -10, 0], curvature: [0, 100, 0] },
    );
    const midG1 = g1.pointAt(0.5);
    const midG2 = g2.pointAt(0.5);
    // Different curvatures => different midpoint Y (more than the OCCT
    // tessellation noise floor).
    expect(Math.abs(midG1[1] - midG2[1])).toBeGreaterThan(1e-3);
  });

  it('endpoint interpolation: pointAt(0) ≈ a.point and pointAt(1) ≈ b.point', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const a = { point: [0, 0, 0] as [number, number, number], tangent: [5, 5, 0] as [number, number, number] };
    const b = { point: [10, 3, 2] as [number, number, number], tangent: [5, -2, 0] as [number, number, number] };
    const curve = kcad.hermiteG2(a, b);
    const p0 = curve.pointAt(0);
    const p1 = curve.pointAt(1);
    expect(approxEq(p0[0], a.point[0], EPS_LOOSE)).toBe(true);
    expect(approxEq(p0[1], a.point[1], EPS_LOOSE)).toBe(true);
    expect(approxEq(p0[2], a.point[2], EPS_LOOSE)).toBe(true);
    expect(approxEq(p1[0], b.point[0], EPS_LOOSE)).toBe(true);
    expect(approxEq(p1[1], b.point[1], EPS_LOOSE)).toBe(true);
    expect(approxEq(p1[2], b.point[2], EPS_LOOSE)).toBe(true);
  });

  it('tangent matching: tangentAt(0) is parallel to a.tangent (normalized)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const aTan: [number, number, number] = [3, 4, 0]; // magnitude 5
    const bTan: [number, number, number] = [0, 0, 7]; // magnitude 7
    const curve = kcad.hermiteG2(
      { point: [0, 0, 0], tangent: aTan },
      { point: [10, 0, 0], tangent: bTan },
    );
    // Expected unit a.tangent = (0.6, 0.8, 0).
    const t0 = curve.tangentAt(0);
    expect(approxEq(t0[0], 0.6, EPS_LOOSE)).toBe(true);
    expect(approxEq(t0[1], 0.8, EPS_LOOSE)).toBe(true);
    expect(approxEq(t0[2], 0, EPS_LOOSE)).toBe(true);
    // Expected unit b.tangent = (0, 0, 1).
    const t1 = curve.tangentAt(1);
    expect(approxEq(t1[0], 0, EPS_LOOSE)).toBe(true);
    expect(approxEq(t1[1], 0, EPS_LOOSE)).toBe(true);
    expect(approxEq(t1[2], 1, EPS_LOOSE)).toBe(true);
  });
});
