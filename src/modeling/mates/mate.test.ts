// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';

// v0.6 Task 5: arm.mate(name, aRef, bRef, type) capture API.
//
// Records a typed mate between two named connectors on parts in the same
// assembly. Type-pair compatibility is validated at capture time (build123d
// early-error style) — non-conforming pairs throw `KernelError` immediately,
// not at solve time. The mate record surfaces on `scene.mates` returned by
// `arm.model()` / `arm.solvedModel()`.

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('test'), kcad };
}

describe('arm.mate(name, aRef, bRef, type)', () => {
  it('records a mate between two named connectors', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(10, 10, 10);
    const b = kcad.box(5, 5, 5);
    arm.part('a', a).connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 10] } });
    arm.part('b', b).connector('bottom', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('a-on-b', 'a.top', 'b.bottom', 'fastened');

    const scene = arm.model();
    expect(scene.mates).toHaveLength(1);
    expect(scene.mates![0].name).toBe('a-on-b');
    expect(scene.mates![0].type).toBe('fastened');
    expect(scene.mates![0].a).toBe('a.top');
    expect(scene.mates![0].b).toBe('b.bottom');
  });

  it('records maxLoad on the mate record for load-capacity validation', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(10, 10, 10);
    const b = kcad.box(5, 5, 5);
    arm.part('a', a).connector('shaft', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.part('b', b).connector('shaft', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

    arm.mate('hinge', 'a.shaft', 'b.shaft', 'revolute', {
      limitsDeg: [-45, 45],
      maxLoad: { torque: 0.05 },
    });

    expect(arm.model().mates![0].maxLoad).toEqual({ torque: 0.05 });
  });

  it('throws at capture time on type-mismatched pair', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(10, 10, 10);
    const b = kcad.box(5, 5, 5);
    arm.part('a', a).connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 10] } });
    arm.part('b', b).connector('shaft', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    expect(() => arm.mate('bad', 'a.top', 'b.shaft', 'revolute'))
      .toThrow(/assembly\.mate\.type-mismatch/);
  });

  it('throws on unknown connector reference', () => {
    const { arm, kcad } = makeArm();
    const a = kcad.box(10, 10, 10);
    arm.part('a', a).connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    expect(() => arm.mate('bad', 'a.top', 'a.nonexistent', 'fastened'))
      .toThrow(/assembly\.mate\.connector-not-found/);
  });
});
