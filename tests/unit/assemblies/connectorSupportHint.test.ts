// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// connector-not-in-solid / revolute-unsupported: a connector is supported
// when it lies inside the bounding box (grown by the stated tolerance) of its
// part or of any part fastened to it, transitively. When it is not, the
// diagnostic states the tolerance and the nearest supported origin on the
// mate axis, so the author can move it in one step.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import {
  connectorsInSolidDiagnostics,
  reviewMechanicalPlausibility,
} from '../../../src/modeling/mates/mechanicalPlausibility';

const V = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x, y, z] as [number, number, number] });

function build(opts: { servoChain: boolean; rollOrigin: [number, number, number] }) {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('roll');
  const link = arm.part('link', kcad.box(10, 10, 10, true));
  link.connector('roll', { type: 'axis', origin: V(...opts.rollOrigin), axis: [1, 0, 0] });
  if (opts.servoChain) {
    // link -> plate -> servo, each fastened and touching: the servo, two
    // hops away, carries the roll axis at x = 30.
    link.connector('plate', { type: 'frame', origin: V(5, 0, 0) });
    const plate = arm.part('plate', kcad.box(10, 10, 10, true).translate(10, 0, 0));
    plate.connector('link', { type: 'frame', origin: V(5, 0, 0) });
    plate.connector('servo', { type: 'frame', origin: V(15, 0, 0) });
    const servo = arm.part('servo', kcad.box(25, 10, 10, true).translate(27.5, 0, 0));
    servo.connector('plate', { type: 'frame', origin: V(15, 0, 0) });
    arm.mate('fix_plate', 'link.plate', 'plate.link', 'fastened');
    arm.mate('fix_servo', 'plate.servo', 'servo.plate', 'fastened');
  }
  const hand = arm.part('hand', kcad.box(6, 6, 6, true));
  hand.connector('roll', { type: 'axis', origin: V(0, 0, 0), axis: [1, 0, 0] });
  arm.mate('wrist_roll', 'link.roll', 'hand.roll', 'revolute', { limitsDeg: [-90, 90] });
  return arm;
}

// Two printed links that never touch; a servo fastened to link A and a horn
// fastened to link B meet on the joint axis (claim: support across groups).
function servoJoint(servoDropMm: number) {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('servo-joint');
  const linkA = arm.part('link_a', kcad.box(40, 30, 4, true).translate(0, 0, -27 - servoDropMm));
  linkA.connector('j', { type: 'axis', origin: V(0, 0, 0), axis: [0, 0, 1] });
  linkA.connector('servo', { type: 'frame', origin: V(0, 0, -25) });
  const servo = arm.part('servo', kcad.box(20, 20, 25, true).translate(0, 0, -12.5).union(kcad.cylinder(2, 2)));
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

const codes = ['assembly.mechanical.connector-not-in-solid', 'assembly.mechanical.revolute-unsupported'];

describe('connector support across fastened parts, with an actionable hint', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('a roll axis on a servo fastened two hops away is supported', async () => {
    const arm = build({ servoChain: true, rollOrigin: [30, 0, 0] });
    expect(await connectorsInSolidDiagnostics(arm)).toEqual([]);
    const review = await reviewMechanicalPlausibility(arm);
    expect(review.diagnostics.filter((d) => codes.includes(d.code)).map((d) => d.message)).toEqual([]);
  }, 60_000);

  it('an unsupported connector reports the tolerance and the nearest supported origin on its axis', async () => {
    const arm = build({ servoChain: false, rollOrigin: [30, 0, 0] });
    const [inSolid] = await connectorsInSolidDiagnostics(arm);
    expect(inSolid?.message).toContain('6 mm');
    expect(inSolid?.message).toContain('[11, 0, 0]');
    expect(inSolid?.hint).toContain('[11, 0, 0]');

    const review = await reviewMechanicalPlausibility(arm);
    const unsupported = review.diagnostics.find((d) => d.code === 'assembly.mechanical.revolute-unsupported');
    expect(unsupported?.message).toContain('1 mm');
    expect(unsupported?.message).toContain('[6, 0, 0]');
  }, 60_000);

  it('says so when no point on the mate axis is supported', async () => {
    const arm = build({ servoChain: false, rollOrigin: [0, 30, 0] });
    const [inSolid] = await connectorsInSolidDiagnostics(arm);
    expect(inSolid?.message).toMatch(/no point on the mate axis/i);
  }, 60_000);

  it('review_cad finds the servo/horn bearing across the fastened parts', async () => {
    const review = await reviewMechanicalPlausibility(servoJoint(0));
    const gaps = review.diagnostics.filter((d) => d.code === 'assembly.mechanical.revolute-contact-missing');
    expect(gaps.map((d) => d.message)).toEqual([]);
  }, 60_000);
});
