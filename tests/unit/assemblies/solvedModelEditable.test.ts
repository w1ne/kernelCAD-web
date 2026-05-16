// tests/unit/assemblies/solvedModelEditable.test.ts
//
// Snapshot semantics for `Assembly.solve(poses)` with `Editable<number>`
// pose values. Mirrors the role of `.boundingBox()` / `.measureArea()` —
// solve() resolves any ParamRef at call time and returns a frozen handle
// whose .value(jointName) is a numeric snapshot. Subsequent param
// updates do NOT mutate the handle; re-solving picks up the new value.
//
// Reactive (post-update auto-re-pose) semantics belong to `solvedModel`
// and are covered in a separate test file (Tasks 3-5).

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import type { Param } from '../../../src/shared/intent/types';

describe('Assembly.solve with Editable poses (snapshot semantics)', () => {
  it('resolves ParamRef at call time and returns numeric value(jointName)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const yawDeg = kcad.param('yawDeg', 30, { min: -180, max: 180 });
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const upper = arm.part('upper', kcad.box(10, 10, 10));
    arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });

    const sk = arm.solve({ yaw: yawDeg });
    expect(sk.value('yaw')).toBe(30);

    // Update param after solve — handle remains frozen at 30.
    session.paramTable.set('yawDeg', 90);
    expect(sk.value('yaw')).toBe(30);

    // Re-solve picks up the new value (use a fresh assembly because solve()
    // mutates per-part originalShape transforms).
    const session2 = new CaptureSession();
    const kcad2 = createApi({ session: session2 });
    const yawDeg2 = kcad2.param('yawDeg', 30, { min: -180, max: 180 });
    session2.paramTable.set('yawDeg', 90);
    const arm2 = kcad2.assembly('test2');
    const base2 = arm2.part('base', kcad2.box(10, 10, 10));
    const upper2 = arm2.part('upper', kcad2.box(10, 10, 10));
    arm2.revolute('yaw', base2, upper2, { axis: [0, 0, 1], origin: [0, 0, 0] });
    const sk2 = arm2.solve({ yaw: yawDeg2 });
    expect(sk2.value('yaw')).toBe(90);
  });

  it('numeric poses still work (regression)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const upper = arm.part('upper', kcad.box(10, 10, 10));
    arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });

    const sk = arm.solve({ yaw: 45 });
    expect(sk.value('yaw')).toBe(45);
  });

  it('mixes literals and ParamRefs in one record', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const a = kcad.param('aDeg', 10);
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const mid = arm.part('mid', kcad.box(10, 10, 10));
    const tip = arm.part('tip', kcad.box(10, 10, 10));
    arm.revolute('j1', base, mid, { axis: [0, 0, 1], origin: [0, 0, 0] });
    arm.revolute('j2', mid, tip, { axis: [0, 1, 0], origin: [0, 0, 0] });

    const sk = arm.solve({ j1: a, j2: 25 });
    expect(sk.value('j1')).toBe(10);
    expect(sk.value('j2')).toBe(25);
  });

  it('resolves a ParamRef expression (compound) at call time', () => {
    // The kernel already supports composed ParamRef arithmetic
    // (param('r').divide(2)) for every other Editable<number> opt;
    // solve() uses the same resolver, so this path must work too.
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const halfYaw = kcad.param('halfYaw', 60);
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const upper = arm.part('upper', kcad.box(10, 10, 10));
    arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });

    const sk = arm.solve({ yaw: halfYaw.divide(2) });
    expect(sk.value('yaw')).toBe(30);
  });

  it('ball joint accepts per-axis Editable triple', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const yawDeg = kcad.param('yawDeg', 30);
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const head = arm.part('head', kcad.box(10, 10, 10));
    arm.ball('hip', base, head, { origin: [0, 0, 0] });

    const sk = arm.solve({ hip: [0, 0, yawDeg] });
    expect(sk.value('hip')).toEqual([0, 0, 30]);
  });

  it('snapshot stays frozen across multiple param mutations', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const yawDeg = kcad.param('yawDeg', 30);
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const upper = arm.part('upper', kcad.box(10, 10, 10));
    arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });

    const sk = arm.solve({ yaw: yawDeg });
    expect(sk.value('yaw')).toBe(30);
    session.paramTable.set('yawDeg', 90);
    session.paramTable.set('yawDeg', -45);
    expect(sk.value('yaw')).toBe(30);
  });
});

describe('solvedAssembly capture', () => {
  it('records FeatureKind=solvedAssembly with poses encoded as Param wrappers', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const yawDeg = kcad.param('yawDeg', 30);
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const upper = arm.part('upper', kcad.box(10, 10, 10));
    arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });

    arm.solvedModel({ yaw: yawDeg });

    const records = session.getRecords();
    const solved = records.find(r => r.kind === 'solvedAssembly');
    expect(solved).toBeDefined();

    const meta = solved!.metadata as {
      assemblyName: string;
      partIds: string[];
      jointIds: string[];
      poses: Record<string, { kind: 'scalar' | 'ball'; value: Param | [Param, Param, Param] }>;
      paramRefs?: string[];
    };
    expect(meta.assemblyName).toBe('test');
    expect(meta.partIds.length).toBe(2);
    expect(meta.jointIds.length).toBe(1);

    const yawPose = meta.poses.yaw;
    expect(yawPose.kind).toBe('scalar');
    expect((yawPose.value as Param).paramRef).toBe('yawDeg');
    // Capture-time snapshot: ParamRef poses store evaluated=0 (resolved at
    // lower time). Mirrors the convention used for `translate.vec.x`,
    // assembly connector origins, etc. — see assembly.editable.test.ts.
    expect((yawPose.value as Param).evaluated).toBe(0);

    expect(meta.paramRefs).toContain('yawDeg');
  });

  it('numeric poses produce Param wrappers without paramRef field', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const upper = arm.part('upper', kcad.box(10, 10, 10));
    arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });

    arm.solvedModel({ yaw: 45 });

    const solved = session.getRecords().find(r => r.kind === 'solvedAssembly');
    const meta = solved!.metadata as {
      poses: Record<string, { kind: 'scalar' | 'ball'; value: Param }>;
      paramRefs?: string[];
    };
    expect(meta.poses.yaw.value.paramRef).toBeUndefined();
    expect(meta.poses.yaw.value.evaluated).toBe(45);
    expect(meta.paramRefs?.length ?? 0).toBe(0);
  });

  it('ball joint poses encode as kind=ball with a 3-tuple of Param wrappers', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const ax = kcad.param('xDeg', 0);
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const tip = arm.part('tip', kcad.box(10, 10, 10));
    arm.ball('wrist', base, tip, { origin: [0, 0, 10] });

    arm.solvedModel({ wrist: [ax, 30, 60] });

    const solved = session.getRecords().find(r => r.kind === 'solvedAssembly');
    const meta = solved!.metadata as {
      poses: Record<string, { kind: 'ball'; value: [Param, Param, Param] }>;
      paramRefs?: string[];
    };
    expect(meta.poses.wrist.kind).toBe('ball');
    expect(meta.poses.wrist.value[0].paramRef).toBe('xDeg');
    // ParamRef coords store evaluated=0 at capture time (see scalar test above).
    expect(meta.poses.wrist.value[0].evaluated).toBe(0);
    expect(meta.poses.wrist.value[1].paramRef).toBeUndefined();
    expect(meta.poses.wrist.value[1].evaluated).toBe(30);
    expect(meta.paramRefs).toContain('xDeg');
  });
});
