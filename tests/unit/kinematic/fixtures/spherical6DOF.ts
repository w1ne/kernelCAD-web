// tests/unit/kinematic/fixtures/spherical6DOF.ts
//
// Synthetic 6-DOF arm fixture for the analytical-IK tests. Topology mirrors
// the classic Puma-560 — six revolute joints with the last three axes
// intersecting at a common wrist center (the "spherical wrist" condition that
// makes the closed-form solver applicable).
//
// Joint layout (parent → child), axes given in their parent's local frame:
//
//   base ─[shoulderYaw, axis +Z, origin (0,0,baseH)]─ link1
//   link1 ─[shoulderPitch, axis +Y, origin (0,0,0)]─ link2
//   link2 ─[elbowPitch, axis +Y, origin (L1,0,0)]─ link3
//   link3 ─[wristYaw, axis +X, origin (L2,0,0)]─ link4
//   link4 ─[wristPitch, axis +Y, origin (0,0,0)]─ link5
//   link5 ─[wristRoll, axis +X, origin (0,0,0)]─ tip
//
// The last three joint origins (wristYaw, wristPitch, wristRoll) are all at
// the same local-frame point on the wrist hub, so the three axes pass through
// a common wrist center — the Pieper-condition the analytical solver detects.
//
// Link lengths and base height kept stubby (50–150 mm) so reachable targets
// stay well inside the workspace and unreachable targets are easy to construct.

import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import type { Assembly } from '../../../../src/modeling/capture/assembly';

export interface Spherical6DOF {
  readonly arm: Assembly;
  readonly tipLink: string;
  readonly linkLengths: {
    readonly baseH: number;
    readonly L1: number;
    readonly L2: number;
  };
}

export function buildSpherical6DOF(): Spherical6DOF {
  const baseH = 100;
  const L1 = 200;
  const L2 = 150;

  const session = new CaptureSession();
  const kc = createApi({ session });
  const arm = kc.assembly('spherical-6dof');

  // Use slender stubby boxes so default-pose interferences stay zero across
  // the entire chain (the FK at all-zero pose places links end-to-end along
  // +X with a small +Z lift on the base; the bodies don't overlap).
  const base = arm.part('base', kc.box(60, 60, baseH, false));
  const link1 = arm.part('link1', kc.box(40, 40, 40, true).translate(0, 0, 20));
  const link2 = arm.part('link2', kc.box(L1, 30, 30, true).translate(L1 / 2, 0, 0));
  const link3 = arm.part('link3', kc.box(L2, 30, 30, true).translate(L2 / 2, 0, 0));
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
  // Spherical-wrist triplet: all three origins identical in their parent
  // frames so the three axes intersect at one point in world coordinates.
  arm.revolute('wristYaw', link3, link4, {
    axis: [1, 0, 0],
    origin: [L2, 0, 0],
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

  return {
    arm,
    tipLink: 'tip',
    linkLengths: { baseH, L1, L2 },
  };
}
