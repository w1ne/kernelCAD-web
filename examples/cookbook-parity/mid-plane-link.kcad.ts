// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Symmetric extrude: an 8 mm thick linkage bar with 60 mm between pin
// centres, 12 mm wide with full-round ends, and two Ø5.2 mm clearance bores
// for M5 pins. The bar is centred on its sketch plane (z = -4 to 4), so a
// clevis or a mirror about z = 0 mates against the mid-plane directly.

const bar = path().moveTo(0, -6).lineTo(60, -6).threePointsArc(60, 6, 66, 0)
  .lineTo(0, 6).threePointsArc(0, -6, -6, 0).close()
  .extrude(8, { symmetric: true });
const bore = path().moveTo(2.6, 0).threePointsArc(-2.6, 0, 0, 2.6).threePointsArc(2.6, 0, 0, -2.6).close()
  .extrude(10, { symmetric: true });
return bar.subtract(bore).subtract(bore.translate(60, 0, 0));
