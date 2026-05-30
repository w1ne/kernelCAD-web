// tests/unit/kinematic/fixtures/redundant7DOF.ts
//
// 7-DOF redundant arm fixture. Topology is open serial — six revolute joints
// in a Puma-style layout plus an extra elbow-roll joint between elbowPitch
// and wristYaw to add a redundant DOF. The numeric DLS solver handles this
// (analytical Pieper-class detection fails on 7 joints, so the dispatcher
// falls back to numeric).

import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import type { Assembly } from '../../../../src/modeling/capture/assembly';

export interface Redundant7DOF {
  readonly arm: Assembly;
  readonly tipLink: string;
}

export function buildRedundant7DOF(): Redundant7DOF {
  const baseH = 100;
  const L1 = 200;
  const L2 = 150;

  const session = new CaptureSession();
  const kc = createApi({ session });
  const arm = kc.assembly('redundant-7dof');

  const base = arm.part('base', kc.box(60, 60, baseH, false));
  const link1 = arm.part('link1', kc.box(40, 40, 40, true).translate(0, 0, 20));
  const link2 = arm.part('link2', kc.box(L1, 30, 30, true).translate(L1 / 2, 0, 0));
  const link3 = arm.part('link3', kc.box(L2, 30, 30, true).translate(L2 / 2, 0, 0));
  const linkRoll = arm.part('linkRoll', kc.box(30, 30, 30, true));
  const link4 = arm.part('link4', kc.box(30, 30, 30, true));
  const link5 = arm.part('link5', kc.box(30, 30, 30, true));
  const tip = arm.part('tip', kc.box(20, 20, 20, true));

  arm.revolute('shoulderYaw', base, link1, {
    axis: [0, 0, 1],
    origin: [0, 0, baseH],
    limitsDeg: [-180, 180],
  });
  arm.revolute('shoulderPitch', link1, link2, {
    axis: [0, 1, 0],
    origin: [0, 0, 0],
    limitsDeg: [-120, 120],
  });
  arm.revolute('elbowPitch', link2, link3, {
    axis: [0, 1, 0],
    origin: [L1, 0, 0],
    limitsDeg: [-150, 150],
  });
  // Redundant DOF: extra roll between elbow and wrist.
  arm.revolute('elbowRoll', link3, linkRoll, {
    axis: [1, 0, 0],
    origin: [L2, 0, 0],
    limitsDeg: [-180, 180],
  });
  arm.revolute('wristYaw', linkRoll, link4, {
    axis: [1, 0, 0],
    origin: [0, 0, 0],
    limitsDeg: [-180, 180],
  });
  arm.revolute('wristPitch', link4, link5, {
    axis: [0, 1, 0],
    origin: [0, 0, 0],
    limitsDeg: [-120, 120],
  });
  arm.revolute('wristRoll', link5, tip, {
    axis: [1, 0, 0],
    origin: [0, 0, 0],
    limitsDeg: [-180, 180],
  });

  return { arm, tipLink: 'tip' };
}
