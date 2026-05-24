// tests/unit/kinematic/inverseKinematicsAnalytical.test.ts
//
// Closed-form analytical IK for the spherical-wrist 6-DOF chain. Solves
// position-only targets in sub-millisecond time without numeric iteration.
// Orientation targets fall back to the DLS numeric path (see dispatcher).

import { describe, it, expect } from 'vitest';
import { solveAnalytical } from '../../../src/kinematic/inverseKinematicsAnalytical';
import { forwardKinematics } from '../../../src/modeling/capture/forwardKinematics';
import { buildSpherical6DOF } from './fixtures/spherical6DOF';

describe('solveAnalytical — closed-form Pieper IK', () => {
  it('recovers a known-reachable position from forward kinematics', () => {
    const { arm, tipLink } = buildSpherical6DOF();

    // Pick a ground-truth pose with the wrist at zero so tip position equals
    // the wrist-center position (the closed-form position solve targets the
    // wrist center; the wrist DOFs only affect orientation).
    const groundTruth = {
      shoulderYaw: 15,
      shoulderPitch: 30,
      elbowPitch: -40,
      wristYaw: 0,
      wristPitch: 0,
      wristRoll: 0,
    };
    const tipT = forwardKinematics(arm.__parts(), arm.__joints(), groundTruth).get(
      partId(arm, tipLink),
    )!;
    const targetPos = tipT.point([0, 0, 0]);

    const result = solveAnalytical(arm, tipLink, { position: targetPos });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.solverUsed).toBe('analytical');

    // Verify forward-kinematics from the solved poses reproduces the target.
    const tipT2 = forwardKinematics(arm.__parts(), arm.__joints(), {
      ...result.poses,
      // Wrist DOFs are unconstrained for position-only; zero them.
      wristYaw: 0,
      wristPitch: 0,
      wristRoll: 0,
    }).get(partId(arm, tipLink))!;
    const got = tipT2.point([0, 0, 0]);
    expect(Math.hypot(got[0] - targetPos[0], got[1] - targetPos[1], got[2] - targetPos[2])).toBeLessThan(0.5);
  });

  it('returns null for an unreachable position', () => {
    const { arm, tipLink } = buildSpherical6DOF();
    // Outside the (L1 + L2) workspace radius.
    const result = solveAnalytical(arm, tipLink, { position: [5000, 0, 0] });
    expect(result).toBeNull();
  });
});

function partId(arm: ReturnType<typeof buildSpherical6DOF>['arm'], partName: string): string {
  const part = arm.__parts().find((p) => p.name === partName);
  if (!part) throw new Error(`no part named ${partName}`);
  return part.id;
}
