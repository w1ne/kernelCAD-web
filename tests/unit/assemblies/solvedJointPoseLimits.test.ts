// tests/unit/assemblies/solvedJointPoseLimits.test.ts
//
// Issue #537 — `Assembly.solve()` / `Assembly.solvedModel()` used to silently
// accept revolute/prismatic joint poses BEYOND the declared limitsDeg/limitsMm
// (a false-pass risk: a knee with limitsDeg:[-150,0] posed to +140 was
// accepted with no warning). The fix emits an advisory
// `kinematic.pose.out-of-limits` WARNING; the pose is still applied.
//
// These tests assert the diagnostic fires (naming joint/value/limit), stays
// silent for in-range poses, and skips joints with no declared limits.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

describe('Issue #537 — joint pose out-of-limits diagnostic', () => {
  const setup = () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('leg');
    const thigh = arm.part('thigh', kcad.box(10, 10, 10));
    const shin = arm.part('shin', kcad.box(10, 10, 10), { at: [0, 0, 10] });
    return { session, kcad, arm, thigh, shin };
  };

  it('solve(): warns when a revolute pose exceeds limitsDeg, naming joint/value/limit', () => {
    const { arm, thigh, shin } = setup();
    arm.revolute('knee', thigh, shin, { axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-150, 0] });

    const solved = arm.solve({ knee: 140 });
    // Pose is still applied (advisory, not a hard failure).
    expect(solved.value('knee')).toBe(140);

    const diag = solved.warnings.find((w) => w.code === 'kinematic.pose.out-of-limits');
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('warning');
    expect(diag!.message).toContain("knee");
    expect(diag!.message).toContain('140');
    expect(diag!.message).toContain('limitsDeg');
    expect(diag!.message).toContain('[-150, 0]');
    // The snapshot Scene carries the same warning.
    expect(
      solved.toScene().warnings.some((w) => w.code === 'kinematic.pose.out-of-limits'),
    ).toBe(true);
  });

  it('solve(): no diagnostic when the pose is WITHIN limits', () => {
    const { arm, thigh, shin } = setup();
    arm.revolute('knee', thigh, shin, { axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-150, 0] });

    const solved = arm.solve({ knee: -30 });
    expect(solved.warnings.some((w) => w.code === 'kinematic.pose.out-of-limits')).toBe(false);
  });

  it('solve(): no diagnostic for a joint with NO declared limits', () => {
    const { arm, thigh, shin } = setup();
    arm.revolute('knee', thigh, shin, { axis: [0, 1, 0], origin: [0, 0, 0] });

    const solved = arm.solve({ knee: 9999 });
    expect(solved.warnings.some((w) => w.code === 'kinematic.pose.out-of-limits')).toBe(false);
  });

  it('solve(): warns when a prismatic pose exceeds limitsMm', () => {
    const { arm, thigh, shin } = setup();
    arm.prismatic('slide', thigh, shin, { axis: [0, 0, 1], origin: [0, 0, 0], limitsMm: [0, 50] });

    const solved = arm.solve({ slide: 75 });
    expect(solved.value('slide')).toBe(75);
    const diag = solved.warnings.find((w) => w.code === 'kinematic.pose.out-of-limits');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('slide');
    expect(diag!.message).toContain('75');
    expect(diag!.message).toContain('limitsMm');
    expect(diag!.message).toContain('[0, 50]');
  });

  it('solvedModel(): out-of-limits pose surfaces on scene.warnings (default warn mode)', async () => {
    const { arm, thigh, shin } = setup();
    arm.revolute('knee', thigh, shin, { axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-150, 0] });

    const scene = await arm.solvedModel({ knee: 140 });
    const diag = scene.warnings.find((w) => w.code === 'kinematic.pose.out-of-limits');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('knee');
    expect(diag!.message).toContain('140');
    expect(diag!.message).toContain('[-150, 0]');
  });

  it('solvedModel(): no out-of-limits diagnostic for an in-range pose', async () => {
    const { arm, thigh, shin } = setup();
    arm.revolute('knee', thigh, shin, { axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-150, 0] });

    const scene = await arm.solvedModel({ knee: -30 });
    expect(scene.warnings.some((w) => w.code === 'kinematic.pose.out-of-limits')).toBe(false);
  });

  it('solvedModel(): validate:"off" suppresses the out-of-limits warning', async () => {
    const { arm, thigh, shin } = setup();
    arm.revolute('knee', thigh, shin, { axis: [0, 1, 0], origin: [0, 0, 0], limitsDeg: [-150, 0] });

    const scene = await arm.solvedModel({ knee: 140 }, { validate: 'off' });
    expect(scene.warnings.some((w) => w.code === 'kinematic.pose.out-of-limits')).toBe(false);
  });
});
