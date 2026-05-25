// tests/unit/kinematic/fixtures/closedLoop4Bar.ts
//
// Closed-loop 4-bar linkage fixture. The body-tree storage allows multiple
// joints to share a child part (the FK walk rejects multi-parent at solve
// time); the kinematic cycle detector classifies the joint-graph as
// closed-loop and the dispatcher emits K9 `kinematic.solver.unsupported-config`
// per the v1-defer policy.
//
// Topology: ground → crankA, ground → crankB, crankA → coupler, crankB → coupler.
// Two joints share `coupler` as their child, closing the loop.

import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import type { Assembly } from '../../../../src/modeling/capture/assembly';

export interface ClosedLoop4Bar {
  readonly arm: Assembly;
  readonly tipLink: string;
}

export function buildClosedLoop4Bar(): ClosedLoop4Bar {
  const session = new CaptureSession();
  const kc = createApi({ session });
  const arm = kc.assembly('closed-loop-4bar');

  const ground = arm.part('ground', kc.box(200, 40, 40, true));
  const crankA = arm.part('crankA', kc.box(80, 20, 20, true).translate(40, 0, 0));
  const crankB = arm.part('crankB', kc.box(80, 20, 20, true).translate(40, 0, 0));
  const coupler = arm.part('coupler', kc.box(120, 20, 20, true).translate(60, 0, 0));

  arm.revolute('groundA', ground, crankA, {
    axis: [0, 0, 1],
    origin: [-100, 0, 0],
    limitsDeg: [-180, 180],
  });
  arm.revolute('groundB', ground, crankB, {
    axis: [0, 0, 1],
    origin: [100, 0, 0],
    limitsDeg: [-180, 180],
  });
  // Two joints attach the SAME coupler — closes the kinematic loop.
  arm.revolute('crankAToCoupler', crankA, coupler, {
    axis: [0, 0, 1],
    origin: [80, 0, 0],
    limitsDeg: [-180, 180],
  });
  arm.revolute('crankBToCoupler', crankB, coupler, {
    axis: [0, 0, 1],
    origin: [80, 0, 0],
    limitsDeg: [-180, 180],
  });

  return { arm, tipLink: 'coupler' };
}
