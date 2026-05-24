// tests/unit/kinematic/inverseKinematicsNumeric.test.ts
//
// Damped-Least-Squares Jacobian IK fallback. Used by checkReachable when the
// chain doesn't match the closed-form solvability condition (analytical path
// rejects) or when opts.preferSolver === 'numeric'.

import { describe, it, expect } from 'vitest';
import { solveNumeric } from '../../../src/kinematic/inverseKinematicsNumeric';
import { forwardKinematics } from '../../../src/modeling/capture/forwardKinematics';
import { buildRedundant7DOF } from './fixtures/redundant7DOF';
import { buildSpherical6DOF } from './fixtures/spherical6DOF';

describe('solveNumeric — DLS Jacobian IK', () => {
  it('converges on a 7-DOF redundant arm to an in-workspace target', () => {
    const { arm, tipLink } = buildRedundant7DOF();

    // Compute a known-reachable target by forward-kinematics from a posed
    // configuration; the solver should then recover joint values that
    // reproduce the same tip position from a zero seed.
    const groundTruth = {
      shoulderYaw: 20,
      shoulderPitch: 35,
      elbowPitch: -45,
      elbowRoll: 10,
      wristYaw: 15,
      wristPitch: 20,
      wristRoll: 0,
    };
    const tipT = forwardKinematics(arm.__parts(), arm.__joints(), groundTruth).get(
      partId(arm, tipLink),
    )!;
    const targetPos = tipT.point([0, 0, 0]);

    const result = solveNumeric(
      arm,
      tipLink,
      { position: targetPos, positionToleranceMm: 0.5 },
      { /* zero seed */ },
      200,
    );

    expect(result.converged).toBe(true);
    expect(result.positionErrorMm).toBeLessThan(0.5);
    expect(result.iterations).toBeLessThanOrEqual(200);
  });

  it('converges on a 6-DOF spherical-wrist arm (numeric path covers this too)', () => {
    const { arm, tipLink } = buildSpherical6DOF();
    const groundTruth = {
      shoulderYaw: 10,
      shoulderPitch: 25,
      elbowPitch: -30,
      wristYaw: 0,
      wristPitch: 0,
      wristRoll: 0,
    };
    const tipT = forwardKinematics(arm.__parts(), arm.__joints(), groundTruth).get(
      partId(arm, tipLink),
    )!;
    const targetPos = tipT.point([0, 0, 0]);

    const result = solveNumeric(
      arm,
      tipLink,
      { position: targetPos, positionToleranceMm: 0.5 },
      {},
      200,
    );

    expect(result.converged).toBe(true);
    expect(result.positionErrorMm).toBeLessThan(0.5);
  });

  it('returns best-effort closestApproach when target is out of workspace', () => {
    const { arm, tipLink } = buildSpherical6DOF();
    // Target obviously beyond the chain's reach (extended length ~ 350 + 100):
    // place it at (5000, 0, 0).
    const result = solveNumeric(
      arm,
      tipLink,
      { position: [5000, 0, 0], positionToleranceMm: 0.5 },
      {},
      200,
    );
    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(200);
    expect(result.positionErrorMm).toBeGreaterThan(0.5);
  });
});

function partId(arm: ReturnType<typeof buildSpherical6DOF>['arm'], partName: string): string {
  const part = arm.__parts().find((p) => p.name === partName);
  if (!part) throw new Error(`no part named ${partName}`);
  return part.id;
}
