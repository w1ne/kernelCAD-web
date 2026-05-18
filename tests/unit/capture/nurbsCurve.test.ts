import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

function findCurveRecord(session: CaptureSession) {
  return session.getRecords().find((r) => r.kind === 'curve3d');
}

function diagsOf(session: CaptureSession): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  for (const r of session.getRecords()) {
    const meta = r.metadata as { diagnostics?: CompilerDiagnostic[] } | undefined;
    if (meta?.diagnostics) out.push(...meta.diagnostics);
  }
  return out;
}

describe('nurbsCurve()', () => {
  it('creates a curve3d record with default cubic non-rational params', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const curve = kcad.nurbsCurve([
      [0, 0, 0],
      [10, 5, 0],
      [20, -5, 10],
      [30, 0, 5],
    ]);
    const rec = findCurveRecord(session);
    expect(rec).toBeDefined();
    expect(curve.id).toBe(rec!.id);
    expect(rec!.metadata?.curve3d).toMatchObject({
      degree: 3,
      controlPoints: [
        [0, 0, 0],
        [10, 5, 0],
        [20, -5, 10],
        [30, 0, 5],
      ],
      closed: false,
    });
    expect(rec!.metadata?.virtual).toBe(true);
    // No validation diagnostics for a well-formed input.
    expect(diagsOf(session)).toHaveLength(0);
  });

  it('respects custom degree and weights for a rational curve', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.nurbsCurve(
      [
        [10, 0, 0],
        [10, 10, 0],
        [0, 10, 0],
      ],
      { degree: 2, weights: [1, Math.SQRT1_2, 1] },
    );
    const rec = findCurveRecord(session);
    expect(rec).toBeDefined();
    expect(rec!.metadata?.curve3d?.degree).toBe(2);
    expect(rec!.metadata?.curve3d?.weights).toEqual([1, Math.SQRT1_2, 1]);
    expect(diagsOf(session)).toHaveLength(0);
  });

  it('emits feature.curve3d.degenerate-controls when too few points for degree', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.nurbsCurve(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      { degree: 3 },
    );
    const diagnostics = diagsOf(session);
    expect(diagnostics.some((d) => d.code === 'feature.curve3d.degenerate-controls')).toBe(true);
  });

  it('emits feature.curve3d.weights-length-mismatch when weights count differs', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.nurbsCurve(
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
      ],
      { weights: [1, 2, 3] },
    );
    const diagnostics = diagsOf(session);
    expect(diagnostics.some((d) => d.code === 'feature.curve3d.weights-length-mismatch')).toBe(true);
  });

  it('emits feature.curve3d.weights-non-positive when a weight is zero', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.nurbsCurve(
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
      ],
      { weights: [1, 0, 1, 1] },
    );
    const diagnostics = diagsOf(session);
    expect(diagnostics.some((d) => d.code === 'feature.curve3d.weights-non-positive')).toBe(true);
  });

  it('emits feature.curve3d.knots-length-mismatch for a malformed knot vector', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.nurbsCurve(
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
      ],
      { degree: 3, knots: [0, 0, 0, 1, 1, 1] }, // expected length = 4 + 3 + 1 = 8
    );
    const diagnostics = diagsOf(session);
    expect(diagnostics.some((d) => d.code === 'feature.curve3d.knots-length-mismatch')).toBe(true);
  });

  it('emits feature.curve3d.closed-endpoints-mismatch as warn when closed=true with unequal endpoints', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.nurbsCurve(
      [
        [0, 0, 0],
        [5, 5, 0],
        [10, 0, 0],
        [5, -5, 0],
      ],
      { closed: true },
    );
    const diagnostics = diagsOf(session);
    const match = diagnostics.find((d) => d.code === 'feature.curve3d.closed-endpoints-mismatch');
    expect(match).toBeDefined();
    expect(match?.severity).toBe('warn');
  });
});

describe('spline3d()', () => {
  it('builds a Curve3D from Catmull-Rom interpolation through the given points', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    kcad.spline3d([
      [0, 0, 0],
      [10, 5, 0],
      [20, 0, 5],
      [30, 0, 0],
    ]);
    const rec = findCurveRecord(session);
    expect(rec).toBeDefined();
    expect(rec!.metadata?.curve3d?.degree).toBe(3);
    // For N=4 input points, the Catmull-Rom control net has (N-1)*3 + 1 = 10 points.
    expect(rec!.metadata?.curve3d?.controlPoints).toHaveLength(10);
    // Catmull-Rom interpolation: the first and last control points must
    // match the first and last input points (they sit on the curve).
    expect(rec!.metadata?.curve3d?.controlPoints[0]).toEqual([0, 0, 0]);
    expect(
      rec!.metadata?.curve3d?.controlPoints[rec!.metadata!.curve3d!.controlPoints.length - 1],
    ).toEqual([30, 0, 0]);
  });
});
