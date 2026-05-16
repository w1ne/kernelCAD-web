// tests/unit/capture/assembly.editable.test.ts
//
// Capture-side coverage for the EditableVec3 widening on assembly Vec3 surfaces
// (Task 5). For each surface we verify the captured intent stores `Vec3Param`
// with per-coord `paramRef` set on the ParamRef coords, evaluated set on the
// numeric coords, and that connector worldOrigin propagates ParamRef-ness via a
// symbolic add when either side has params (decaying to a literal Param when
// neither does).

import { describe, expect, it } from 'vitest';
import type { Param, Vec3Param } from '../../../src/shared/intent/types';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import type { ParamRefExpr } from '../../../src/shared/runtime/paramRef';

function asVec3Param(v: unknown): Vec3Param {
  return v as Vec3Param;
}

function asParam(v: unknown): Param {
  return v as Param;
}

describe('assembly capture — EditableVec3 surfaces', () => {
  it('captures connector origin with mixed numeric + ParamRef coords', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const baseX = kcad.param('baseX', 70);

    const arm = kcad.assembly('mixed');
    const part = arm.part('plate', kcad.box(20, 20, 4), {
      at: [0, 0, 0],
      connectors: {
        pivot: { origin: [baseX.divide(2), 23, 4], axis: [0, 0, 1] },
      },
    });

    const records = session.getRecords();
    const partRecord = records.find(r => r.id === part.id);
    expect(partRecord).toBeDefined();
    const meta = partRecord!.metadata as {
      connectors: { pivot: { origin: unknown; axis: unknown } };
    };
    const origin = asVec3Param(meta.connectors.pivot.origin);

    // x is a binop (param 'baseX' / lit 2)
    expect(origin.x.paramRef).toBeDefined();
    const xExpr = origin.x.paramRef as ParamRefExpr;
    expect(xExpr.kind).toBe('binop');
    if (xExpr.kind !== 'binop') throw new Error('expected binop');
    expect(xExpr.op).toBe('/');
    expect(xExpr.left).toEqual({ kind: 'param', name: 'baseX' });
    expect(xExpr.right).toEqual({ kind: 'lit', value: 2 });
    // Capture-time snapshot: ParamRef coords store evaluated=0; the live value
    // is resolved at lower time. Reactivity is exercised in
    // tests/unit/runtime/assembly.reactive.test.ts.
    expect(origin.x.evaluated).toBe(0);
    expect(origin.x.unit).toBe('mm');

    // y is a literal Param (no paramRef)
    expect(origin.y.paramRef).toBeUndefined();
    expect(origin.y.evaluated).toBe(23);

    // z is a literal Param (no paramRef)
    expect(origin.z.paramRef).toBeUndefined();
    expect(origin.z.evaluated).toBe(4);

    // Axis is fully literal Vec3Param.
    const axis = asVec3Param(meta.connectors.pivot.axis);
    expect(axis.x.paramRef).toBeUndefined();
    expect(axis.y.paramRef).toBeUndefined();
    expect(axis.z.paramRef).toBeUndefined();
    expect(axis.x.evaluated).toBe(0);
    expect(axis.y.evaluated).toBe(0);
    expect(axis.z.evaluated).toBe(1);
  });

  it('reactive worldOrigin is symbolic when at and origin are parametric', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const baseX = kcad.param('baseX', 70);

    const arm = kcad.assembly('symbolic-world');
    const part = arm.part('plate', kcad.box(80, 20, 4), {
      at: [baseX.divide(2), 0, 0],
      connectors: {
        pivot: { origin: [baseX.divide(2), 0, 0] },
      },
    });

    const worldOrigin = part.connector('pivot').worldOrigin;
    // worldOrigin.x = at.x + origin.x = (baseX/2) + (baseX/2)
    expect(worldOrigin.x.paramRef).toBeDefined();
    const xExpr = worldOrigin.x.paramRef as ParamRefExpr;
    expect(xExpr.kind).toBe('binop');
    if (xExpr.kind !== 'binop') throw new Error('expected binop');
    expect(xExpr.op).toBe('+');
    // Both sides should be the same baseX / 2 binop expression.
    expect(xExpr.left).toMatchObject({
      kind: 'binop',
      op: '/',
      left: { kind: 'param', name: 'baseX' },
      right: { kind: 'lit', value: 2 },
    });
    expect(xExpr.right).toMatchObject({
      kind: 'binop',
      op: '/',
      left: { kind: 'param', name: 'baseX' },
      right: { kind: 'lit', value: 2 },
    });
    // At capture time ParamRef coords store evaluated=0 (the live value is
    // resolved against the ParamTable at lower time via resolveParams).
    // The capture-time sum of two paramRef snapshots is 0+0=0.
    expect(worldOrigin.x.evaluated).toBe(0);

    // y and z are pure literal sums — no paramRef carried.
    expect(worldOrigin.y.paramRef).toBeUndefined();
    expect(worldOrigin.y.evaluated).toBe(0);
    expect(worldOrigin.z.paramRef).toBeUndefined();
    expect(worldOrigin.z.evaluated).toBe(0);
  });

  it('worldOrigin decays to literal arithmetic when no params are involved', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('literal-world');
    const part = arm.part('plate', kcad.box(20, 20, 4), {
      at: [10, 0, 0],
      connectors: {
        pivot: { origin: [5, 0, 0] },
      },
    });

    const worldOrigin = part.connector('pivot').worldOrigin;
    // No ParamRef anywhere — addParams should fall through the literal fast-path
    // and return a plain Param without paramRef.
    expect(worldOrigin.x.paramRef).toBeUndefined();
    expect(worldOrigin.x.evaluated).toBe(15);
    expect(worldOrigin.y.paramRef).toBeUndefined();
    expect(worldOrigin.y.evaluated).toBe(0);
    expect(worldOrigin.z.paramRef).toBeUndefined();
    expect(worldOrigin.z.evaluated).toBe(0);
  });

  it('connect: subtraction is symbolic when world origin or local origin has params', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const baseX = kcad.param('baseX', 80);

    const arm = kcad.assembly('connect-symbolic');
    const a = arm.part('a', kcad.box(20, 20, 8), {
      at: [0, 0, 0],
      connectors: { mount: { origin: [baseX.divide(2), 0, 8] } },
    });
    const b = arm.part('b', kcad.box(60, 8, 6), {
      connectors: { root: { origin: [-30, 0, 0] } },
      connect: { connector: 'root', to: a.connector('mount') },
    });

    const records = session.getRecords();
    const bRecord = records.find(r => r.id === b.id);
    expect(bRecord).toBeDefined();
    const bMeta = bRecord!.metadata as { at: unknown };
    const at = asVec3Param(bMeta.at);

    // at.x = a.worldOrigin.x - b.local.origin.x
    //      = (at.x[0] + origin.x[paramRef baseX/2]) - (-30)
    // Subtraction is symbolic because the LHS carries a ParamRef.
    // At capture time the ParamRef snapshot is 0, so evaluated = (0+0) - (-30) = 30.
    expect(at.x.paramRef).toBeDefined();
    const xExpr = at.x.paramRef as ParamRefExpr;
    expect(xExpr.kind).toBe('binop');
    if (xExpr.kind !== 'binop') throw new Error('expected binop');
    expect(xExpr.op).toBe('-');
    expect(at.x.evaluated).toBe(30);

    // y/z stayed literal because neither connector touches them with a ParamRef.
    expect(at.y.paramRef).toBeUndefined();
    expect(at.z.paramRef).toBeUndefined();
  });

  it('axis stored as plain numeric Vec3 (v1 body-tree convention)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('literal-axis');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.revolute('joint', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });

    const records = session.getRecords();
    const jointRecord = records.at(-1)!;
    const meta = jointRecord.metadata as { axis: [number, number, number]; origin: [number, number, number] };
    // v1 body-tree FK: joint axis/origin are numeric Vec3, not Vec3Param.
    // (Pose reactivity via setParamValue deferred; see body-tree-kinematics design.)
    expect(meta.axis).toEqual([0, 0, 1]);
    expect(meta.origin).toEqual([0, 0, 0]);
  });
});
