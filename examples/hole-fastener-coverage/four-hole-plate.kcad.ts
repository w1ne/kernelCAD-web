// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Local modeled coverage example: four catalog M3 screws in four Ø3.2 bores.
// Set extraHole to true to expose an unexplained Ø4 hole. The caller can then
// declare its current report id in holeReasons as 'cable pass-through'.
const extraHole = param('extraHole', false);
const arm = assembly('hole-coverage');
const points = [[-6, -6], [-6, 6], [6, -6], [6, 6]];
let plate = box(24, 24, 3, true).translate(0, 0, 1.5);
for (const [x, y] of points) {
  plate = plate.subtract(cylinder(4, 1.6).translate(x, y, -.5));
}
if (extraHole.value) plate = plate.subtract(cylinder(4, 2).translate(0, 0, -.5));
arm.part('plate', plate);
for (let i = 0; i < points.length; i++) {
  const [x, y] = points[i];
  arm.part(`screw-${i}`, (await lib.fetchPart('iso-4762-m3x10')).translate(x, y, 3));
}
return arm.model();
