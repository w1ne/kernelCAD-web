// tests/unit/runtime/translateRotateEditable.test.ts
//
// Regression suite for Shape.translate / Shape.rotate Editable<number>
// extension.
//
// Three case categories:
//   1. Per-method capture: each transform variant accepts a ParamRef and
//      stores a Param whose paramRef field is set on the corresponding
//      coordinate / scalar / pivot component.
//   2. Pivot acceptance: rotate's optional pivot accepts ParamRef coords.
//   3. Parametric reactivity: building a translated box, editing the param
//      via session.params.update, observing the shape's bbox center moved.
//
// Spec: kernelCAD-private/docs/specs/2026-05-08-translate-rotate-editable-design.md

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';
import type { ShapeTransform } from '../../../src/intent/featureRecord';

beforeAll(async () => { await initOcct(); });

// ---------------------------------------------------------------------------
// 1. Per-method capture: a leaf ParamRef survives onto the stored Param via
//    Param.paramRef.

function transformsOf(session: CaptureSession): ShapeTransform[] {
  const records = session.getRecords();
  if (records.length === 0) throw new Error('no records found');
  return records[records.length - 1].transforms;
}

describe('Shape.translate accepts Editable<number> — per-coord capture', () => {
  it('translate stores ParamRef on x', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const x = api.param('x', 5);
    api.box(10, 10, 10).translate(x, 0, 0);
    const ts = transformsOf(session);
    expect(ts).toHaveLength(1);
    const t = ts[0] as Extract<ShapeTransform, { op: 'translate' }>;
    expect(t.op).toBe('translate');
    expect(t.vec.x.paramRef).toBe('x');
    expect(t.vec.y.paramRef).toBeUndefined();
    expect(t.vec.z.paramRef).toBeUndefined();
    expect(t.vec.x.unit).toBe('mm');
  });

  it('translate stores ParamRef on y and z too', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const y = api.param('y', 7);
    const z = api.param('z', 9);
    api.box(10, 10, 10).translate(0, y, z);
    const ts = transformsOf(session);
    const t = ts[0] as Extract<ShapeTransform, { op: 'translate' }>;
    expect(t.vec.y.paramRef).toBe('y');
    expect(t.vec.z.paramRef).toBe('z');
  });
});

describe('Shape.rotate accepts Editable<number> — per-component capture', () => {
  it('rotate stores ParamRef on degrees', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const deg = api.param('deg', 45);
    api.box(10, 10, 10).rotate([0, 0, 1], deg);
    const ts = transformsOf(session);
    expect(ts).toHaveLength(1);
    const t = ts[0] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    expect(t.op).toBe('rotateAxis');
    expect(t.degrees.paramRef).toBe('deg');
    expect(t.degrees.unit).toBe('deg');
  });

  it('rotate axis components accept ParamRef (unitless)', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const az = api.param('az', 1);
    api.box(10, 10, 10).rotate([0, 0, az], 45);
    const ts = transformsOf(session);
    const t = ts[0] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    expect(t.axis.z.paramRef).toBe('az');
    expect(t.axis.z.unit).toBe('unitless');
  });

  it('rotate pivot accepts ParamRef on each component (mm)', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const px = api.param('px', 5);
    api.box(10, 10, 10).rotate([0, 0, 1], 45, [px, 0, 0]);
    const ts = transformsOf(session);
    const t = ts[0] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    expect(t.pivot).toBeDefined();
    expect(t.pivot!.x.paramRef).toBe('px');
    expect(t.pivot!.x.unit).toBe('mm');
    expect(t.pivot!.y.paramRef).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. End-to-end: translated box lowers and the param edit is observable.

describe('Shape.translate Editable — params.update reactivity', () => {
  it('updating x translates the box; bbox center shifts by the delta', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const x = api.param('x', 5);
    const shape = api.box(10, 10, 10).translate(x, 0, 0);

    const initial = await shape.lower();
    const initialBox = initial.boundingBox();
    const initialCenterX = (initialBox.min[0] + initialBox.max[0]) / 2;

    // Edit x: 5 → 25. bbox center should move +20 mm in x.
    const updated = await session.params.update([{ name: 'x', value: 25 }]);
    const updatedBox = updated.shape.boundingBox();
    const updatedCenterX = (updatedBox.min[0] + updatedBox.max[0]) / 2;

    expect(updatedCenterX - initialCenterX).toBeCloseTo(20, 5);
  });
});
