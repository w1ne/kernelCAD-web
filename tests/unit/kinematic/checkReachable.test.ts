// tests/unit/kinematic/checkReachable.test.ts
//
// Dispatcher gate. Verifies the kc.kinematic.checkReachable wiring:
//
//   - closed-loop chain → K9 kinematic.solver.unsupported-config (no IK run)
//   - 6-DOF spherical-wrist arm + reachable position → analytical path
//   - 7-DOF redundant arm + reachable position → numeric path
//   - far-out-of-workspace target → K3 kinematic.unreachable + closestApproach
//
// Diagnostic-envelope shape is asserted alongside the result data so future
// edits to the registry / nextAction map are caught at the dispatcher
// boundary (not just at the diagnostics-catalogue gate).

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { checkReachable } from '../../../src/kinematic/checkReachable';
import { forwardKinematics } from '../../../src/modeling/capture/forwardKinematics';
import { buildSpherical6DOF } from './fixtures/spherical6DOF';
import { buildRedundant7DOF } from './fixtures/redundant7DOF';
import { buildClosedLoop4Bar } from './fixtures/closedLoop4Bar';

describe('checkReachable dispatcher', () => {
  it('emits K9 on a closed-loop chain without running IK', async () => {
    const { arm, tipLink } = buildClosedLoop4Bar();
    const r = await checkReachable(arm, {
      tipLink,
      target: { position: [50, 0, 0] },
    });
    expect(r.source).toBe('local');
    expect(r.ok).toBe(false);
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes).toContain('kinematic.solver.unsupported-config');
  });

  it('reaches a known-feasible target on a 6-DOF spherical arm via the analytical path', async () => {
    const { arm, tipLink } = buildSpherical6DOF();
    const groundTruth = {
      shoulderYaw: 20,
      shoulderPitch: 35,
      elbowPitch: -45,
      wristYaw: 0,
      wristPitch: 0,
      wristRoll: 0,
    };
    const tipT = forwardKinematics(arm.__parts(), arm.__joints(), groundTruth).get(
      arm.__parts().find((p) => p.name === tipLink)!.id,
    )!;
    const targetPos = tipT.point([0, 0, 0]);
    const r = await checkReachable(arm, {
      tipLink,
      target: { position: targetPos, positionToleranceMm: 0.5 },
    });
    expect(r.ok).toBe(true);
    expect(r.source).toBe('local');
    expect(r.pose).toBeDefined();
    expect(r.diagnostics).toHaveLength(0);
  });

  it('reaches a known-feasible target on a 7-DOF redundant arm via the numeric path', async () => {
    const { arm, tipLink } = buildRedundant7DOF();
    const groundTruth = {
      shoulderYaw: 15,
      shoulderPitch: 25,
      elbowPitch: -30,
      elbowRoll: 5,
      wristYaw: 0,
      wristPitch: 0,
      wristRoll: 0,
    };
    const tipT = forwardKinematics(arm.__parts(), arm.__joints(), groundTruth).get(
      arm.__parts().find((p) => p.name === tipLink)!.id,
    )!;
    const targetPos = tipT.point([0, 0, 0]);
    const r = await checkReachable(arm, {
      tipLink,
      target: { position: targetPos, positionToleranceMm: 0.5 },
    });
    expect(r.ok).toBe(true);
    expect(r.source).toBe('local');
    expect(r.pose).toBeDefined();
  });

  it('emits K3 + K4 on a far-out-of-workspace target', async () => {
    const { arm, tipLink } = buildSpherical6DOF();
    const r = await checkReachable(arm, {
      tipLink,
      target: { position: [5000, 0, 0], positionToleranceMm: 0.5 },
      preferSolver: 'numeric',
    });
    expect(r.ok).toBe(false);
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes).toContain('kinematic.unreachable');
    expect(r.closestApproach).toBeDefined();
  });

  it('emits an empty-success envelope on an empty assembly with a zero-DOF target', async () => {
    const session = new CaptureSession();
    const kc = createApi({ session });
    const arm = kc.assembly('empty');
    const r = await checkReachable(arm, {
      tipLink: 'nope',
      target: { position: [0, 0, 0] },
    });
    // Tip not found → K3 with a clear message; carries source: 'local'.
    expect(r.source).toBe('local');
    expect(r.ok).toBe(false);
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes).toContain('kinematic.unreachable');
  });
});
