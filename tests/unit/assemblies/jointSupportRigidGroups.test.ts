// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A servo joint: link A carries a fastened servo, link B carries a fastened
// horn, and the revolute between the links sits on the servo output. The two
// printed links never touch; the load path is link A -> servo -> horn -> link
// B. Rest-pose contact (mechanism.mate-gap) and joint continuity
// (mechanism.joint-mesh-gap) must judge the joint across each side's rigid
// group, so the author does not have to add a post that bridges the links.
// A fastened part that does not touch its host is not part of the group.
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';

const V = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x, y, z] as [number, number, number] });

function servoJoint(servoDropMm: number) {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('servo-joint');
  const linkA = arm.part('link_a', kcad.box(40, 30, 4, true).translate(0, 0, -27 - servoDropMm));
  linkA.connector('j', { type: 'axis', origin: V(0, 0, 0), axis: [0, 0, 1] });
  linkA.connector('servo', { type: 'frame', origin: V(0, 0, -25) });
  const servo = arm.part('servo', kcad.box(20, 20, 25, true).translate(0, 0, -12.5)
    .union(kcad.cylinder(2, 2)));
  servo.connector('mount', { type: 'frame', origin: V(0, 0, -25) });
  arm.mate('fix_servo', 'link_a.servo', 'servo.mount', 'fastened');

  const horn = arm.part('horn', kcad.cylinder(2, 8).subtract(kcad.cylinder(4, 2.3).translate(0, 0, -1)).translate(0, 0, 0.3));
  horn.connector('mount', { type: 'frame', origin: V(0, 0, 2.3) });
  const linkB = arm.part('link_b', kcad.box(40, 16, 4, true).translate(12, 0, 4.3));
  linkB.connector('j', { type: 'axis', origin: V(0, 0, 0), axis: [0, 0, 1] });
  linkB.connector('horn', { type: 'frame', origin: V(0, 0, 2.3) });
  arm.mate('fix_horn', 'link_b.horn', 'horn.mount', 'fastened');
  arm.mate('joint', 'link_a.j', 'link_b.j', 'revolute', { limitsDeg: [-30, 30] });
  return arm;
}

describe('joint support across fastened rigid groups', () => {
  it('a servo/horn joint between two links that never touch is supported', async () => {
    const result = await checkMechanismTruth(servoJoint(0));
    const support = result.failures.filter((f) =>
      f.code === 'mechanism.joint-mesh-gap' || f.code === 'mechanism.mate-gap');
    expect(support.map((f) => f.message)).toEqual([]);
  }, 120_000);

  it('a servo fastened to link A but 3 mm off it does not carry the joint', async () => {
    const result = await checkMechanismTruth(servoJoint(3));
    const codes = result.failures.map((f) => f.code);
    expect(codes).toContain('mechanism.joint-mesh-gap');
    const jointGap = result.failures.find((f) => f.code === 'mechanism.mate-gap' && f.message.includes("Mate 'joint'"));
    expect(jointGap, JSON.stringify(result.failures.map((f) => f.message))).toBeDefined();
    expect(result.mechanism).toBe('broken');
  }, 120_000);
});
