// tests/unit/assemblies/assemblySolve.test.ts
//
// Unit coverage for `Assembly.solve(poses)`. solve() composes joint-pose
// rotations (inner-to-outer through the ancestor chain) onto each part's
// originalShape and returns the unioned posed model.
//
// Critical caveat: Shape.translate / Shape.rotate mutate the underlying
// FeatureRecord.transforms array. Calling solve() twice on the same Assembly
// instance compounds transforms. Each test therefore builds a FRESH
// CaptureSession + Assembly and calls solve() at most once.
//
// Assertions are mostly structural: inspect FeatureRecord.transforms on each
// part's originalShape after solve(). We mirror the harness pattern from
// `assemblyCapture.test.ts` (CaptureSession + createApi + session.getRecords).
//
// Spec context: feat/assembly-solve plan, Task 3.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';
import type { FeatureRecord, ShapeTransform } from '../../../src/intent/featureRecord';
import { resolveParams } from '../../../src/runtime/resolveParams';
import type { Param } from '../../../src/intent/types';

function transformsForId(session: CaptureSession, id: string): ShapeTransform[] {
  const record = session.getRecords().find((r): r is FeatureRecord => r.id === id);
  if (!record) throw new Error(`record not found for id ${id}`);
  return record.transforms;
}

describe('Assembly.solve', () => {
  it('solve({}) applies zero-pose translates and rotations with degrees=0 (kinematic-zero)', () => {
    // Each part receives at-translate; each joint in the part's ancestor chain
    // produces a rotateAxis transform with degrees=0 when the pose isn't named.
    //
    // Note: solve() calls Shape.translate / Shape.rotate on each part's
    // ORIGINAL shape (e.g., the box), so transforms get appended to the
    // underlying box record — NOT to the assemblyPart record. We inspect
    // shapes' .id directly.
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('zero-pose');
    const baseShape = kcad.box(20, 20, 5);
    const linkShape = kcad.box(40, 8, 4);
    const base = arm.part('base', baseShape, { at: [0, 0, 0] });
    const link = arm.part('link', linkShape, { at: [10, 0, 5] });
    arm.revolute('tilt', base, link, {
      axis: [0, 0, 1],
      origin: [0, 0, 5],
    });

    arm.solve({});

    // base has no joint above it; only the at-translate applies (to the box record).
    const baseTransforms = transformsForId(session, baseShape.id);
    expect(baseTransforms).toHaveLength(1);
    expect(baseTransforms[0].op).toBe('translate');

    // link has the at-translate and one rotateAxis from the tilt joint at zero.
    const linkTransforms = transformsForId(session, linkShape.id);
    expect(linkTransforms).toHaveLength(2);
    expect(linkTransforms[0].op).toBe('translate');
    expect(linkTransforms[1].op).toBe('rotateAxis');
    const rot = linkTransforms[1] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    expect(rot.degrees.evaluated).toBe(0);
    expect(rot.degrees.paramRef).toBeUndefined();
  });

  it('single-joint pose stores the supplied angle on the rotateAxis transform', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('single-pose');
    const baseShape = kcad.box(20, 20, 5);
    const linkShape = kcad.box(40, 8, 4);
    const base = arm.part('base', baseShape, { at: [0, 0, 0] });
    const link = arm.part('link', linkShape, { at: [10, 0, 5] });
    arm.revolute('tilt', base, link, {
      axis: [0, 0, 1],
      origin: [0, 0, 5],
    });

    arm.solve({ tilt: 90 });

    const linkTransforms = transformsForId(session, linkShape.id);
    expect(linkTransforms).toHaveLength(2);
    expect(linkTransforms[0].op).toBe('translate');
    expect(linkTransforms[1].op).toBe('rotateAxis');
    const rot = linkTransforms[1] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    expect(rot.degrees.evaluated).toBe(90);
    // Axis was [0, 0, 1] → captured as Vec3Param via toVec3Param.
    expect(rot.axis.x.evaluated).toBe(0);
    expect(rot.axis.y.evaluated).toBe(0);
    expect(rot.axis.z.evaluated).toBe(1);
    // Pivot is the joint origin.
    expect(rot.pivot).toBeDefined();
    expect(rot.pivot!.x.evaluated).toBe(0);
    expect(rot.pivot!.y.evaluated).toBe(0);
    expect(rot.pivot!.z.evaluated).toBe(5);
  });

  it('multi-joint chain composes inner-to-outer (child joint applied first, ancestor second)', () => {
    // base — base-yaw → shoulder — shoulder-pitch → elbow.
    // partJointChain(elbow) walks elbow's parent joint first (shoulder-pitch),
    // then up through shoulder's parent joint (base-yaw). solve() applies
    // them in that order, so transforms[1] is shoulder-pitch and
    // transforms[2] is base-yaw — inner-first, outer-last.
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('three-link');
    const baseShape = kcad.box(20, 20, 5);
    const shoulderShape = kcad.box(40, 8, 4);
    const elbowShape = kcad.box(40, 8, 4);
    const base = arm.part('base', baseShape, { at: [0, 0, 0] });
    const shoulder = arm.part('shoulder', shoulderShape, { at: [10, 0, 5] });
    const elbow = arm.part('elbow', elbowShape, { at: [50, 0, 5] });
    arm.revolute('base-yaw', base, shoulder, {
      axis: [0, 0, 1],
      origin: [0, 0, 5],
    });
    arm.revolute('shoulder-pitch', shoulder, elbow, {
      axis: [0, 1, 0],
      origin: [10, 0, 5],
    });

    arm.solve({ 'base-yaw': 90, 'shoulder-pitch': 45 });

    // shoulder: at-translate, then base-yaw rotation.
    const shoulderTransforms = transformsForId(session, shoulderShape.id);
    expect(shoulderTransforms).toHaveLength(2);
    expect(shoulderTransforms[0].op).toBe('translate');
    const shoulderRot = shoulderTransforms[1] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    expect(shoulderRot.op).toBe('rotateAxis');
    expect(shoulderRot.degrees.evaluated).toBe(90);
    // base-yaw axis is [0, 0, 1].
    expect(shoulderRot.axis.z.evaluated).toBe(1);

    // elbow: at-translate, then TWO rotations (inner-first: shoulder-pitch,
    // outer-last: base-yaw).
    const elbowTransforms = transformsForId(session, elbowShape.id);
    expect(elbowTransforms).toHaveLength(3);
    expect(elbowTransforms[0].op).toBe('translate');
    const innerRot = elbowTransforms[1] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    const outerRot = elbowTransforms[2] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    expect(innerRot.op).toBe('rotateAxis');
    expect(outerRot.op).toBe('rotateAxis');
    // Inner = shoulder-pitch (axis [0,1,0], 45°).
    expect(innerRot.degrees.evaluated).toBe(45);
    expect(innerRot.axis.y.evaluated).toBe(1);
    expect(innerRot.axis.z.evaluated).toBe(0);
    // Outer = base-yaw (axis [0,0,1], 90°).
    expect(outerRot.degrees.evaluated).toBe(90);
    expect(outerRot.axis.z.evaluated).toBe(1);
  });

  it('reactive: a ParamRef pose stores paramRef on the rotateAxis degrees Param', () => {
    // The captured rotation Param carries a paramRef (the symbolic name).
    // Re-resolving the transform against a mutated ParamTable produces the
    // updated evaluated value — this is the same reactivity contract as
    // translate/rotate Editable<number> in translateRotateEditable.test.ts.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const angleDeg = kcad.param('angleDeg', 0);

    const arm = kcad.assembly('reactive');
    const baseShape = kcad.box(20, 20, 5);
    const linkShape = kcad.box(40, 8, 4);
    const base = arm.part('base', baseShape, { at: [0, 0, 0] });
    const link = arm.part('link', linkShape, { at: [10, 0, 5] });
    arm.revolute('tilt', base, link, {
      axis: [0, 0, 1],
      origin: [0, 0, 5],
    });

    arm.solve({ tilt: angleDeg });

    const linkTransforms = transformsForId(session, linkShape.id);
    const rot = linkTransforms[1] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    expect(rot.op).toBe('rotateAxis');
    // degrees Param carries a paramRef pointing at our declared param.
    expect(rot.degrees.paramRef).toBe('angleDeg');
    // Initial evaluated: 0 (the declared default).
    expect(rot.degrees.evaluated).toBe(0);

    // Re-resolve through the param table after a setParamValue: the resolved
    // Param's evaluated number should reflect the updated value.
    session.paramTable.set('angleDeg', 45);
    const resolved = resolveParams(rot.degrees, session.paramTable) as Param;
    expect(resolved.evaluated).toBe(45);
  });

  it('throws feature.invalid-args for an unknown joint name (lists known joints)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('unknown-joint');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(10, 10, 10));
    arm.revolute('tilt', base, link, {
      axis: [0, 0, 1],
      origin: [0, 0, 0],
    });

    expect(() => arm.solve({ wrist: 30 })).toThrow(/wrist/);
    // Build a fresh assembly to avoid the prior partial solve compounding
    // transforms (the throw fires before transforms are mutated, but a
    // belt-and-suspenders fresh build keeps the test isolated). Reuse the
    // same session — the validation throws BEFORE any mutation, so the
    // second build is still safe in the same session.
    expect(() => arm.solve({ wrist: 30 })).toThrow(/tilt/);
  });

  it('throws feature.invalid-args for non-finite pose values (NaN, Infinity)', () => {
    {
      const session = new CaptureSession();
      const kcad = createApi({ session });
      const arm = kcad.assembly('non-finite-nan');
      const a = arm.part('a', kcad.box(10, 10, 10));
      const b = arm.part('b', kcad.box(10, 10, 10));
      arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
      expect(() => arm.solve({ tilt: Number.NaN })).toThrow(/finite/i);
    }
    {
      const session = new CaptureSession();
      const kcad = createApi({ session });
      const arm = kcad.assembly('non-finite-inf');
      const a = arm.part('a', kcad.box(10, 10, 10));
      const b = arm.part('b', kcad.box(10, 10, 10));
      arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
      expect(() => arm.solve({ tilt: Number.POSITIVE_INFINITY })).toThrow(/finite/i);
    }
  });

  it('throws feature.invalid-args for non-numeric, non-ParamRef pose values', () => {
    {
      const session = new CaptureSession();
      const kcad = createApi({ session });
      const arm = kcad.assembly('non-numeric-string');
      const a = arm.part('a', kcad.box(10, 10, 10));
      const b = arm.part('b', kcad.box(10, 10, 10));
      arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
      expect(() => arm.solve({ tilt: 'hello' as unknown as number })).toThrow(/number or ParamRef/);
    }
    {
      const session = new CaptureSession();
      const kcad = createApi({ session });
      const arm = kcad.assembly('non-numeric-null');
      const a = arm.part('a', kcad.box(10, 10, 10));
      const b = arm.part('b', kcad.box(10, 10, 10));
      arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
      expect(() => arm.solve({ tilt: null as unknown as number })).toThrow(/number or ParamRef/);
    }
  });

  it('omitted joints default to 0 — joint not named in poses captures degrees=0', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('partial-pose');
    const baseShape = kcad.box(20, 20, 5);
    const shoulderShape = kcad.box(40, 8, 4);
    const elbowShape = kcad.box(40, 8, 4);
    const base = arm.part('base', baseShape);
    const shoulder = arm.part('shoulder', shoulderShape, { at: [10, 0, 5] });
    const elbow = arm.part('elbow', elbowShape, { at: [50, 0, 5] });
    arm.revolute('base-yaw', base, shoulder, {
      axis: [0, 0, 1],
      origin: [0, 0, 5],
    });
    arm.revolute('shoulder-pitch', shoulder, elbow, {
      axis: [0, 1, 0],
      origin: [10, 0, 5],
    });

    // base-yaw is intentionally omitted.
    arm.solve({ 'shoulder-pitch': 30 });

    const elbowTransforms = transformsForId(session, elbowShape.id);
    expect(elbowTransforms).toHaveLength(3);
    const innerRot = elbowTransforms[1] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    const outerRot = elbowTransforms[2] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    // shoulder-pitch supplied → 30°.
    expect(innerRot.degrees.evaluated).toBe(30);
    // base-yaw omitted → defaults to literal 0.
    expect(outerRot.degrees.evaluated).toBe(0);
    expect(outerRot.degrees.paramRef).toBeUndefined();
  });

  it('throws feature.invalid-args on solve() of an empty assembly', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('empty');
    expect(() => arm.solve({})).toThrow(/at least one part/);
  });

  it('connect-only chain inherits ancestor joints from connect-parent', () => {
    // Layout: base — shoulder-tilt joint → shoulder; tool fixed-attached to
    // shoulder via connect (no joint of its own). tool's joint chain is
    // inherited from shoulder via connectParentId, so solve() applies the
    // shoulder-tilt rotation to tool too.
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('connect-inherit');
    const baseShape = kcad.box(20, 20, 5);
    const shoulderShape = kcad.box(40, 8, 4);
    const toolShape = kcad.box(8, 8, 8);
    const base = arm.part('base', baseShape, {
      connectors: { hub: { origin: [0, 0, 5], axis: [0, 0, 1] } },
    });
    const shoulder = arm.part('shoulder', shoulderShape, {
      at: [10, 0, 5],
      connectors: { tip: { origin: [20, 0, 0], axis: [0, 0, 1] } },
    });
    arm.revolute('shoulder-tilt', base, shoulder, {
      axis: [0, 0, 1],
      origin: [0, 0, 5],
    });
    arm.part('tool', toolShape, {
      connectors: { root: { origin: [0, 0, 0], axis: [0, 0, 1] } },
      connect: {
        connector: 'root',
        to: shoulder.connector('tip'),
      },
    });

    arm.solve({ 'shoulder-tilt': 60 });

    // tool has no direct joint, but its transforms include the inherited
    // shoulder-tilt rotation (degrees=60).
    const toolTransforms = transformsForId(session, toolShape.id);
    expect(toolTransforms).toHaveLength(2);
    expect(toolTransforms[0].op).toBe('translate');
    const inheritedRot = toolTransforms[1] as Extract<ShapeTransform, { op: 'rotateAxis' }>;
    expect(inheritedRot.op).toBe('rotateAxis');
    expect(inheritedRot.degrees.evaluated).toBe(60);
    expect(inheritedRot.axis.z.evaluated).toBe(1);
  });
});
