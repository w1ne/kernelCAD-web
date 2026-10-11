// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/39: 40 × 40 × 12 housing, 608 seat Ø22.1 × 7, Ø12 through, 4 × Ø4.5 corners.
const seatD = 22 + 0.1; // light FDM press fit
const seatDepth = 7;
const corner = 20 - 5;

return box(40, 40, 12)
  // counterbore = the bearing seat, the bore = the shaft clearance hole
  .hole('top', { u: 0, v: 0, diameter: 12, depth: 'through', counterbore: { diameter: seatD, depth: seatDepth }, name: 'seat' })
  .holes('top', {
    positions: [{ u: -corner, v: -corner }, { u: corner, v: -corner }, { u: -corner, v: corner }, { u: corner, v: corner }],
    diameter: 4.5,
    depth: 'through',
  });
