// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

// Local demo fixture: subtract a through-hole, then round the exact boolean seam.
const body = box(40, 30, 20);
const cutter = cylinder(30, 5).translate(20, 15, -5);
const cut = body.subtract(cutter);

return cut.filletIntersection(cutter, 1, {
  sides: 'body',
  toleranceMm: 0.05,
  continuity: 'G1',
});
