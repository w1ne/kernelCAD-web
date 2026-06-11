// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression fixture — pre-8e2f0da7 Luxo shoulder joint dimensions.
//
// Reproduces the joint hardware (clevis fork on the parent, tongue on the
// child, pivot pin spanning both) at the constants that lived in
// `examples/kinematic/luxo-lamp.kcad.ts` BEFORE commit 8e2f0da7 — the
// "joints read as solid cubes" failure that motivated Gate 4. Used as the
// regression seed in `jointVisualExposure.test.ts`.
//
//   FORK_PLATE_T = 4    // plate thickness along Y
//   FORK_GAP_Y   = 12   // air gap between plates → only 1 mm daylight per side
//   TONGUE_Y     = 10   // tongue thickness
//   PIN_R        = 3.5
//   PIN_LEN      = FORK_GAP_Y + 2 * FORK_PLATE_T + 8 → 28 mm
//
// Expected Gate 4 outcome at these constants: gap ratio ≈ 1/30 = 0.033
// (well below MIN_GAP_RATIO = 0.15), pin stickout = (28 − 12 − 2×4)/2 =
// 4 mm per side; with MIN_PIN_STICKOUT = 1.0 × PIN_R = 3.5 mm the pin
// stickout numerically clears the threshold but the gap ratio fails →
// `failureCause = 'gap'`. (The plan calls out `'both'` as a possible
// outcome; the precise classification depends on PIN_R inference from
// the geometric proxy, which is documented to be approximate.)

import { CaptureSession } from '../../capture/captureSession';
import { createApi } from '../../api';
import type { Assembly } from '../../capture/assembly';

const FORK_PLATE_X = 22;
const FORK_PLATE_Z = 30;
const FORK_PLATE_T = 4;
const FORK_GAP_Y = 12;
const TONGUE_Y = 10;
const PIN_R = 3.5;
const PIN_LEN = FORK_GAP_Y + 2 * FORK_PLATE_T + 8; // 28

export function buildPreFixLuxoShoulder(): { arm: Assembly; session: CaptureSession } {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('luxo-pre');

  // Parent: clevis fork (two plates straddling Y=0) + pin (cylinder along Y).
  // The fork's pin-hole is implied by the fact that the tongue sits between
  // the plates; we don't drill the hole here because Gate 4 measures the
  // PLATE SILHOUETTE (which is unaffected by the small pin-hole cutter), not
  // the pin's clearance through the plate.
  const plateOffsetY = FORK_GAP_Y / 2 + FORK_PLATE_T / 2;
  const platePos = kcad.box(FORK_PLATE_X, FORK_PLATE_T, FORK_PLATE_Z, true)
    .translate(0,  plateOffsetY, 0);
  const plateNeg = kcad.box(FORK_PLATE_X, FORK_PLATE_T, FORK_PLATE_Z, true)
    .translate(0, -plateOffsetY, 0);
  const pin = kcad.cylinder(PIN_LEN, PIN_R, 32)
    // `kcad.cylinder(h, r)` returns a +Z cylinder spanning Z=[0, h];
    // rotating -90° about X maps +Z → +Y so the cylinder ends up at
    // Y=[0, h]. Translate -PIN_LEN/2 along Y to centre on the origin.
    .rotate([1, 0, 0], -90)
    .translate(0, -PIN_LEN / 2, 0);
  const parentShape = platePos.union(plateNeg).union(pin);

  // Child: a tongue (single plate of thickness TONGUE_Y).
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
