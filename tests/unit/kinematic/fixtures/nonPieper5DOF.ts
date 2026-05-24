// tests/unit/kinematic/fixtures/nonPieper5DOF.ts
//
// 5-DOF chain (one too few joints) — the analytical-IK detector must reject
// this chain with `wrong-dof-count`. Used to verify the detector classifies
// non-Pieper chains correctly.

import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import type { Assembly } from '../../../../src/modeling/capture/assembly';

export interface NonPieper5DOF {
  readonly arm: Assembly;
  readonly tipLink: string;
}

export function buildNonPieper5DOF(): NonPieper5DOF {
  const session = new CaptureSession();
  const kc = createApi({ session });
  const arm = kc.assembly('non-pieper-5dof');

  const base = arm.part('base', kc.box(60, 60, 80, false));
  const link1 = arm.part('link1', kc.box(30, 30, 30, true));
  const link2 = arm.part('link2', kc.box(150, 25, 25, true).translate(75, 0, 0));
  const link3 = arm.part('link3', kc.box(100, 25, 25, true).translate(50, 0, 0));
  const link4 = arm.part('link4', kc.box(30, 25, 25, true));
  const tip = arm.part('tip', kc.box(20, 20, 20, true));

  arm.revolute('j1', base, link1, { axis: [0, 0, 1], origin: [0, 0, 80] });
  arm.revolute('j2', link1, link2, { axis: [0, 1, 0], origin: [0, 0, 0] });
  arm.revolute('j3', link2, link3, { axis: [0, 1, 0], origin: [150, 0, 0] });
  arm.revolute('j4', link3, link4, { axis: [0, 1, 0], origin: [100, 0, 0] });
  arm.revolute('j5', link4, tip, { axis: [1, 0, 0], origin: [0, 0, 0] });

  return { arm, tipLink: 'tip' };
}
