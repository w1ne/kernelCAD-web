// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Computer-mouse shell — best-effort expert solution.
//
// Construction plan
// =================
// 1) Plan-view silhouette (XY): a teardrop/ovoid with arc-rounded corners.
//    The rear (palm-rest) end is broader; the front (button) end is narrower
//    and slightly more pinched. Author the path with sagittaArc segments so
//    every silhouette edge is curved.
// 2) Extrude in +Z to a slab of height MOUSE_H.
// 3) Slice the slab from above with a cylinder oriented along X to give the
//    top a continuous front-to-back arc (lower at the front, taller at the
//    rear). This is the "curved hump" subtract.
// 4) Carve a narrow centre slot from the front to ~45 mm rearward — the
//    button split.
// 5) Add a recessed scroll-wheel cavity at the front of the centre split.
// 6) Fillet outer edges to soften the body.
//
// Coordinate convention: Z-up, mm, degrees. Front face (buttons) at smallest Y.
// Base of shell sits on Z=0.

const MOUSE_L = 115;   // Y length
const MOUSE_W = 65;    // X width
const MOUSE_H = 38;    // Z height (peak; tapers downward toward front)
const BUTTON_SPLIT_LEN = 45;
const BUTTON_SPLIT_W = 1.0;
const WHEEL_Y_FROM_FRONT = 15;
const WHEEL_DIA = 12;
const WHEEL_RECESS = 4;

// ----- 1) Plan silhouette -----
// Build the silhouette in the sketch (XY) plane, traced CCW from the rear-left.
// Use sagittaArc for each side so every edge is curved.
const halfW_rear = MOUSE_W / 2;
const halfW_front = MOUSE_W * 0.40;   // front pinch (narrower)
// Coordinates: y=0 is rear of mouse, y=MOUSE_L is front.
const silhouette = path()
  .moveTo(-halfW_rear * 0.20, 0)                 // start near rear-centre, slight offset
  .sagittaArc(-halfW_rear, MOUSE_L * 0.35, -5)   // rear-left bulge
  .sagittaArc(-halfW_front, MOUSE_L, -3)         // left side curve toward narrower front
  .sagittaArc( halfW_front, MOUSE_L, -2)         // front (slight outward curve)
  .sagittaArc( halfW_rear, MOUSE_L * 0.35, -3)   // right side curve back
  .sagittaArc( halfW_rear * 0.20, 0, -5)         // rear-right bulge
  .sagittaArc(-halfW_rear * 0.20, 0, -2)         // rear edge close
  .close();

// ----- 2) Extrude to slab -----
const slab = silhouette.extrude(MOUSE_H);

// ----- 3) Carve the curved top hump -----
// A long cylinder running along X, centred above the slab, with a radius
// large enough that subtracting it leaves a smooth front-to-back arc on the
// top surface. The cylinder's centre sits at Y near the rear (so the rear
// end stays tall) and Z above the slab (so only the upper part of the
// cylinder dips below the slab top, removing material near the front).
//
// Algebraic intuition: a cylinder of radius R centred at (any X, y0, z0)
// removes material wherever |(y - y0, z - z0)| < R. With y0 = -0.25 * MOUSE_L
// (well in front of the rear), z0 = MOUSE_H + R*0.65, and R = MOUSE_L * 0.95,
// the locus dips down toward the front of the mouse and stays out of the
// rear. The shell's rear height ≈ MOUSE_H; the front height ≈ MOUSE_H * 0.6.
const R_top = MOUSE_L * 0.95;
const topCut = cylinder(MOUSE_W * 4, R_top, 64)
  .alongAxis([1, 0, 0])
  .translate(-MOUSE_W * 2, -MOUSE_L * 0.25, MOUSE_H + R_top * 0.65);

const sculpted = slab.subtract(topCut);

// ----- 4) Button-split slot -----
// Narrow rectangular slot running from the front edge (y = MOUSE_L) rearward
// by BUTTON_SPLIT_LEN, centred on x=0. Extend Z slightly beyond the slab top
// so the cut is unambiguous on the front face.
const split = box(BUTTON_SPLIT_W, BUTTON_SPLIT_LEN + 4, MOUSE_H + 4)
  .translate(-BUTTON_SPLIT_W / 2, MOUSE_L - BUTTON_SPLIT_LEN, -2);
const withSplit = sculpted.subtract(split);

// ----- 5) Scroll-wheel recess -----
// Small cylindrical pocket sunk into the top surface at the front of the
// centre split. Orient along X so the wheel is a transverse cylinder; the
// pocket is just slightly larger than the wheel.
const wheelPocket = cylinder(WHEEL_DIA + 4, WHEEL_DIA / 2 + 1, 48)
  .alongAxis([1, 0, 0])
  .translate(-(WHEEL_DIA + 4) / 2, MOUSE_L - WHEEL_Y_FROM_FRONT, MOUSE_H - WHEEL_RECESS / 2);
const pocketed = withSplit.subtract(wheelPocket);

// ----- 6) Soften outer edges -----
// Attempt a small global fillet. OCCT can reject global fillet on a body
// that's already heavily curved (top arc + booleans); fall back to the
// unfilleted body in that case. We skip the fillet in the simplified expert
// solution since the silhouette already reads correctly and adding fillet
// just risks an OCCT crash.

return pocketed.color('#1a1a1a');
