// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The swept-collision walk lowers the feature tree once and re-poses that
// scene. It must still sample every enumerated pose and report a mid-range
// collision with the same volume a single-pose probe measures.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { detectInterferencesForPoses } from '../../../src/modeling/mates/poseEnvelope';
import { checkSweptCollision } from '../../../src/kinematic/checkSweptCollision';

function collidingHinge() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('swept-reuse-hinge');

  // Ground includes a post on the 45-degree ray so the swinging bar hits
  // it at mid-travel and clears it at 0 deg and 90 deg. The post stays in
  // the same rigid body as the hinge so solveMates can re-pose every part.
  arm.part('base', kcad.box(20, 20, 8).union(kcad.box(8, 8, 20).translate(28, 28, 0)))
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [10, 10, 8] },
      axis: [0, 0, 1],
    });
  arm.part('bar', kcad.box(40, 6, 6).translate(10, 7, 8))
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [10, 10, 8] },
      axis: [0, 0, 1],
    });
  arm.mate('swing', 'base.hinge', 'bar.hinge', 'revolute', {
    pose: 0,
    limitsDeg: [0, 90],
  });
  return arm;
}

describe('checkSweptCollision pose reuse', () => {
  it('lowers the feature tree once and still reports the mid-range hit', async () => {
    const arm = collidingHinge();
    const original = RecomputeEngine.prototype.run;
    let engineRuns = 0;
    RecomputeEngine.prototype.run = function (this: RecomputeEngine, ...args: Parameters<typeof original>) {
      engineRuns += 1;
      return original.apply(this, args);
    };
    try {
      const swept = await checkSweptCollision(arm, {
        joint: 'swing',
        range: [0, 90, 15],
      });
      expect(swept.posesSampled).toBe(7);
      expect(engineRuns).toBeLessThan(swept.posesSampled);
      expect(engineRuns).toBeLessThanOrEqual(4);
      expect(swept.ok).toBe(false);
      const hit = swept.collidingPoses.find((row) => row.pose.swing === 45);
      expect(hit, `colliding poses: ${JSON.stringify(swept.collidingPoses)}`).toBeDefined();
      const contact = hit!.contacts.find((row) =>
        (row.partA === 'bar' && row.partB === 'base') || (row.partA === 'base' && row.partB === 'bar'));
      expect(contact, `contacts: ${JSON.stringify(hit!.contacts)}`).toBeDefined();
      expect(contact!.volumeMm3).toBeGreaterThan(0.01);

      const single = await detectInterferencesForPoses(arm, { swing: 45 }, 0.01);
      const singleHit = single.find((pair) =>
        (pair.a === 'bar' && pair.b === 'base') || (pair.a === 'base' && pair.b === 'bar'));
      expect(singleHit).toBeDefined();
      expect(contact!.volumeMm3).toBeCloseTo(singleHit!.volumeMm3, 5);
    } finally {
      RecomputeEngine.prototype.run = original;
    }
  }, 30_000);

  it('still reports every colliding sample, including the last pose', async () => {
    const arm = collidingHinge();
    const swept = await checkSweptCollision(arm, {
      joint: 'swing',
      range: [0, 90, 15],
    });
    const angles = swept.collidingPoses.map((row) => row.pose.swing).sort((a, b) => Number(a) - Number(b));
    expect(angles).toContain(45);
    // 0 deg and 90 deg stay clear of the post at (28,28). 45 deg hits.
    expect(angles).not.toContain(0);
    expect(angles).not.toContain(90);
    expect(swept.posesSampled).toBe(7);
  }, 30_000);
});
