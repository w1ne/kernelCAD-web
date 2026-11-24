// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Demo: three blind holes with 118° drill points, cut away at y = 20 so the
// conical bottoms are visible in the render. All dimensions are millimetres.
const plate = box(60, 40, 16);
// Keep the y >= 20 half; the cut face passes through every bore centre.
const cutaway = box(60, 20, 16);
const part = plate.subtract(cutaway);

let drilled = part;
for (const [index, depth] of [6, 9, 12].entries()) {
  drilled = drilled.hole('top', {
    u: -20 + index * 20,
    // The top face centre is y = 30; v = -10 puts each bore on the y = 20
    // cut face, so the cutaway shows half of every cone.
    v: -10,
    diameter: 8,
    depth,
    drillPoint: true,
    name: `blind-${depth}`,
  });
}

return drilled.finish('aluminum-6061');
