// tests/unit/kinematic/fixtures/shoulderElbow2DOF.ts
//
// Synthetic 2-DOF arm fixture for the swept-collision tests.
//
// Layout (top-down, world XY plane — shoulder rotates about world Z):
//
//   BASE WALL (wide, -X side)                  Pivot (shoulder)
//   ┌────────────────────────┐                       │
//   │                        │                       │
//   │     200×400×60         │                       │
//   │     centered then      │                       O──> +X
//   │     translated         │                       │
//   │     [-200, 0, 0]       │                       │
//   │                        │                       │
//   └────────────────────────┘                       │
//   x = -300..-100,  y = ±200,  z = ±30        x = 0  (in base-local frame)
//
// Upper arm: 200mm long, 20×20 cross section, extends along upper-local +X
// from the shoulder pivot. Forearm: 100mm long, 20×20 cross section, extends
// along upper's distal end from the elbow pivot.
//
// Joints:
//   - shoulder : revolute about +Z at base-local [0, 0, 0], limits [-180, 180]
//   - elbow    : revolute about +Y at upper-local [200, 0, 0], limits [-90, 90]
//
// Collision behaviour:
//   - shoulder ∈ [-90°, 90°]   : the upper-arm tip lives at x = 200·cos(s),
//     which is >= 0 across this range. Both upper and fore stay on the +X
//     side of the pivot, well clear of the wall (which sits at x <= -100).
//   - shoulder ∈ [120°, 180°]  : 200·cos(s) <= 200·cos(120°) = -100, so the
//     upper-arm tip pokes into x <= -100, i.e. INTO the base wall (x range
//     -300..-100). The wall is ±200 wide in Y so the arm hits it across
//     the full range regardless of where exactly along Y it lands.
//
// Verified empirically at 5° step across [120°, 180°]:
//   - shoulder=120°: minimum overlap pose (arm tip exactly at base front face)
//   - shoulder=180°: deepest overlap (arm + fore fully inside the wall)

import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import type { Assembly } from '../../../../src/modeling/capture/assembly';

export interface ShoulderElbow2DOF {
  readonly arm: Assembly;
}

export function buildShoulderElbow2DOF(): ShoulderElbow2DOF {
  const session = new CaptureSession();
  const kc = createApi({ session });
  const arm = kc.assembly('shoulder-elbow-2dof');

  // Base wall on the -X side of the pivot. Wide enough in Y to intercept
  // any shoulder angle that points the arm into the -X half-plane.
  const baseShape = kc
    .box(200, 400, 60, /* centered */ true)
    .translate(-200, 0, 0);
  const base = arm.part('base', baseShape);

  // Upper-arm beam. Box length 200 along its local +X, then translated +100
  // so the back end (local x=0) sits at the shoulder pivot.
  const upperShape = kc
    .box(200, 20, 20, /* centered */ true)
    .translate(100, 0, 0);
  const upper = arm.part('upper', upperShape);

  // Forearm beam. 100mm along its local +X, back end at fore-local x=0.
  const foreShape = kc
    .box(100, 20, 20, /* centered */ true)
    .translate(50, 0, 0);
  const fore = arm.part('fore', foreShape);

  // Shoulder pivot at base-local [0, 0, 0] — directly between the base wall
  // (centered at base-local x=-200) and the +X workspace. Axis +Z so the
  // arm yaws in the XY plane.
  arm.revolute('shoulder', base, upper, {
    axis: [0, 0, 1],
    origin: [0, 0, 0],
    limitsDeg: [-180, 180],
  });

  // Elbow at upper-arm tip, axis +Y so the forearm pitches in the local XZ
  // plane (orthogonal to the shoulder sweep, kept at elbow=0 in all tests).
  arm.revolute('elbow', upper, fore, {
    axis: [0, 1, 0],
    origin: [200, 0, 0],
    limitsDeg: [-90, 90],
  });

  return { arm };
}
