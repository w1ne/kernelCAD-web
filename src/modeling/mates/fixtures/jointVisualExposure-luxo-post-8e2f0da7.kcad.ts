// Regression fixture — post-8e2f0da7 Luxo shoulder joint dimensions.
//
// Reproduces the joint hardware at the constants that landed in
// `examples/kinematic/luxo-lamp.kcad.ts` AT commit 8e2f0da7 — the fix that
// closes the "joints read as solid cubes" failure Gate 4 catches.
//
//   FORK_PLATE_T = 3    // thinner plates
//   FORK_GAP_Y   = 18   // wider gap → 6 mm daylight per side
//   TONGUE_Y     = 6    // narrower tongue → matches the wider gap
//   PIN_R        = 3.5
//   PIN_LEN      = FORK_GAP_Y + 2 * FORK_PLATE_T + 14 → 38 mm (7 mm stickout)
//
// Expected Gate 4 outcome: gap ratio ≈ 6/30 = 0.2 (clears MIN_GAP_RATIO =
// 0.15), pin stickout ≈ 7 mm per side (clears MIN_PIN_STICKOUT = 3.5 mm).
// No `assembly.joint.not-visible` diagnostic.

import { CaptureSession } from '../../capture/captureSession';
import { createApi } from '../../api';
import type { Assembly } from '../../capture/assembly';

const FORK_PLATE_X = 22;
const FORK_PLATE_Z = 30;
const FORK_PLATE_T = 3;
const FORK_GAP_Y = 18;
const TONGUE_Y = 6;
const PIN_R = 3.5;
const PIN_LEN = FORK_GAP_Y + 2 * FORK_PLATE_T + 14; // 38

export function buildPostFixLuxoShoulder(): { arm: Assembly; session: CaptureSession } {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('luxo-post');

  const plateOffsetY = FORK_GAP_Y / 2 + FORK_PLATE_T / 2;
  const platePos = kcad.box(FORK_PLATE_X, FORK_PLATE_T, FORK_PLATE_Z, true)
    .translate(0,  plateOffsetY, 0);
  const plateNeg = kcad.box(FORK_PLATE_X, FORK_PLATE_T, FORK_PLATE_Z, true)
    .translate(0, -plateOffsetY, 0);
  const pin = kcad.cylinder(PIN_LEN, PIN_R, 32)
    // Same centring trick as the pre-fix fixture — see its comment.
    .rotate([1, 0, 0], -90)
    .translate(0, -PIN_LEN / 2, 0);
  const parentShape = platePos.union(plateNeg).union(pin);

  const childShape = kcad.box(FORK_PLATE_X, TONGUE_Y, FORK_PLATE_Z, true);

  const parent = arm
    .part('base', parentShape)
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
  const child = arm
    .part('lower-arm', childShape)
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 1, 0],
    });
  arm.mate('shoulder', `${parent.name}.hinge`, `${child.name}.hinge`, 'revolute');

  return { arm, session };
}
