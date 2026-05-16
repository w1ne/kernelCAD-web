// tests/unit/capture/shapeTransform.test.ts
//
// Unit tests for `Shape.transform(t)` — the public surface that applies an
// SE(3) Transform to a shape by decomposing it into one rotate + one translate
// component (T = Translate · Rotate) and appending those via the existing
// translate / rotateAxis ShapeTransform pipes. No new lowerer code path.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { Transform } from '../../../src/shared/runtime/se3';
import type { ShapeTransform } from '../../../src/shared/intent/featureRecord';

/** Inline equivalent of a `transformsForId` helper — find the FeatureRecord
 *  for `id` and return its ShapeTransform[]. Mirrors the captureSession.test.ts
 *  pattern (`session.getRecords()[0].transforms`). */
function transformsForId(session: CaptureSession, id: string): ShapeTransform[] {
  const rec = session.getRecords().find(r => r.id === id);
  if (!rec) throw new Error(`No record for id ${id}`);
  return rec.transforms;
}

describe('Shape.transform', () => {
  it('identity transform appends nothing', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.transform(Transform.identity());
    expect(transformsForId(session, s.id)).toHaveLength(0);
  });

  it('pure translation appends a translate transform', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.transform(Transform.translation(5, 0, -3));
    const ts = transformsForId(session, s.id);
    expect(ts).toHaveLength(1);
    expect(ts[0].op).toBe('translate');
    if (ts[0].op === 'translate') {
      expect(ts[0].vec.x.evaluated).toBe(5);
      expect(ts[0].vec.y.evaluated).toBe(0);
      expect(ts[0].vec.z.evaluated).toBe(-3);
    }
  });

  it('pure rotation appends a rotateAxis transform', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.transform(Transform.rotationAxisAngleDeg([0, 0, 1], 45));
    const ts = transformsForId(session, s.id);
    expect(ts).toHaveLength(1);
    expect(ts[0].op).toBe('rotateAxis');
    if (ts[0].op === 'rotateAxis') {
      expect(ts[0].degrees.evaluated).toBeCloseTo(45);
      // Axis points along Z.
      expect(ts[0].axis.x.evaluated).toBeCloseTo(0);
      expect(ts[0].axis.y.evaluated).toBeCloseTo(0);
      expect(ts[0].axis.z.evaluated).toBeCloseTo(1);
    }
  });

  it('translate * rotate appends both, rotate first then translate', () => {
    // T = Translate(5, 0, 0) · Rotate(Z, 90) — applied right-to-left, so
    // rotate first then translate.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    const t = Transform.translation(5, 0, 0).compose(Transform.rotationAxisAngleDeg([0, 0, 1], 90));
    s.transform(t);
    const ts = transformsForId(session, s.id);
    expect(ts).toHaveLength(2);
    expect(ts[0].op).toBe('rotateAxis');
    expect(ts[1].op).toBe('translate');
  });

  it('chains: shape.transform(A).transform(B) appends A then B', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    s.transform(Transform.translation(1, 0, 0));
    s.transform(Transform.translation(0, 2, 0));
    const ts = transformsForId(session, s.id);
    expect(ts).toHaveLength(2);
    expect(ts[0].op).toBe('translate');
    expect(ts[1].op).toBe('translate');
    if (ts[0].op === 'translate' && ts[1].op === 'translate') {
      expect(ts[0].vec.x.evaluated).toBe(1);
      expect(ts[1].vec.y.evaluated).toBe(2);
    }
  });
});
