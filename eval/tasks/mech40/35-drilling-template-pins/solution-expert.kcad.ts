// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/35: 100 × 60 × 6 drilling template, Ø6 × 8 locating pins, 3 × Ø8 drill holes.
const t = 6;
const pinD = 6;
const pinH = 8;
const pins: [number, number][] = [[10, 10], [90, 50]];

let plate = box(100, 60, t).holes('top', {
  positions: [{ u: -20, v: 0 }, { u: 0, v: 0 }, { u: 20, v: 0 }],
  diameter: 8,
  depth: 'through',
  name: 'drill',
});
for (const [x, y] of pins) {
  plate = plate.union(cylinder(pinH + 0.1, pinD / 2).translate(x, y, t - 0.1));
}
return plate;
