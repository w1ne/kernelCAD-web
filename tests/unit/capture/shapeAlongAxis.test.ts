import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

// Helper: get the rotateAxis transform that .alongAxis() appended (or null
// if no rotation was appended — identity case).
function lastRotation(session: CaptureSession, id: string): { axis: [number, number, number]; deg: number } | null {
  const r = session.getRecords().find(rec => rec.id === id);
  const ts = ((r as { transforms?: { op: string; axis?: { x: { evaluated: number }; y: { evaluated: number }; z: { evaluated: number } }; degrees?: { evaluated: number } }[] })?.transforms) ?? [];
  const last = ts[ts.length - 1];
  if (last?.op !== 'rotateAxis' || !last.axis || !last.degrees) return null;
  return {
    axis: [last.axis.x.evaluated, last.axis.y.evaluated, last.axis.z.evaluated],
    deg: last.degrees.evaluated,
  };
}

function transformsCount(session: CaptureSession, id: string): number {
  const r = session.getRecords().find(rec => rec.id === id);
  return ((r as { transforms?: unknown[] })?.transforms ?? []).length;
}

describe('Shape.alongAxis', () => {
  it('alongAxis([0, 0, 1]) is a no-op (no rotation appended)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c = kcad.cylinder(20, 4).alongAxis([0, 0, 1]);
    expect(transformsCount(session, c.id)).toBe(0);
  });

  it('alongAxis([0, 1, 0]) rotates 90° around -X (Z → +Y)', () => {
    // Z = [0,0,1], axis = [0,1,0]. Z × axis = [-1, 0, 0]. acos(0) = 90°.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c = kcad.cylinder(20, 4).alongAxis([0, 1, 0]);
    const r = lastRotation(session, c.id)!;
    expect(r.deg).toBeCloseTo(90);
    expect(r.axis[0]).toBeCloseTo(-1);
    expect(r.axis[1]).toBeCloseTo(0);
    expect(r.axis[2]).toBeCloseTo(0);
  });

  it('alongAxis([1, 0, 0]) rotates 90° around +Y (Z → +X)', () => {
    // Z = [0,0,1], axis = [1,0,0]. Z × axis = [0, 1, 0]. acos(0) = 90°.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c = kcad.cylinder(20, 4).alongAxis([1, 0, 0]);
    const r = lastRotation(session, c.id)!;
    expect(r.deg).toBeCloseTo(90);
    expect(r.axis[0]).toBeCloseTo(0);
    expect(r.axis[1]).toBeCloseTo(1);
    expect(r.axis[2]).toBeCloseTo(0);
  });

  it('alongAxis([0, 0, -1]) rotates 180° around +X (antipodal, deterministic)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c = kcad.cylinder(20, 4).alongAxis([0, 0, -1]);
    const r = lastRotation(session, c.id)!;
    expect(r.deg).toBeCloseTo(180);
    expect(r.axis[0]).toBeCloseTo(1);
    expect(r.axis[1]).toBeCloseTo(0);
    expect(r.axis[2]).toBeCloseTo(0);
  });

  it('alongAxis([1, 1, 0]) rotates 90° around the bisector', () => {
    // Z × [1/√2, 1/√2, 0] = [-1/√2, 1/√2, 0]. acos(0) = 90°.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c = kcad.cylinder(20, 4).alongAxis([1, 1, 0]);
    const r = lastRotation(session, c.id)!;
    expect(r.deg).toBeCloseTo(90);
    expect(r.axis[0]).toBeCloseTo(-Math.SQRT1_2);
    expect(r.axis[1]).toBeCloseTo(Math.SQRT1_2);
    expect(r.axis[2]).toBeCloseTo(0);
  });

  it('rejects zero-vector axis with feature.invalid-args', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    expect(() => kcad.cylinder(20, 4).alongAxis([0, 0, 0])).toThrow(/non-zero/i);
  });

  it('normalizes non-unit input', () => {
    // [0, 5, 0] should produce same rotation as [0, 1, 0].
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c = kcad.cylinder(20, 4).alongAxis([0, 5, 0]);
    const r = lastRotation(session, c.id)!;
    expect(r.deg).toBeCloseTo(90);
    expect(r.axis[0]).toBeCloseTo(-1);
  });

  it('chains: returns the same Shape for further chaining', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c = kcad.cylinder(20, 4).alongAxis([0, 1, 0]).translate(5, 0, 0);
    expect(c).toBeDefined();
    // Should have 2 transforms: rotateAxis (from alongAxis), translate.
    expect(transformsCount(session, c.id)).toBe(2);
  });
});
