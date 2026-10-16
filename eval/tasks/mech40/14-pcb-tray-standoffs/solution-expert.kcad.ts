// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/14: 110 × 90 × 3 tray, 4 × Ø7 × 6 standoffs with M3 heat-set pilots (Ø4.0 × 5).
const plateT = 3;
const standoffH = 6;
const insertPilot = 4.0; // M3 × 5.7 heat-set insert
const insertDepth = 5;
// Board 100 × 80 centred on the 110 × 90 plate: board corner at (5, 5); holes 4 in.
const holes: [number, number][] = [[9, 9], [101, 9], [9, 81], [101, 81]];

let tray = box(110, 90, plateT).holes('top', {
  positions: [{ u: -50, v: 0 }, { u: 50, v: 0 }],
  diameter: 3.4,
  depth: 'through',
});
for (const [x, y] of holes) {
  tray = tray.union(
    cylinder(standoffH + 0.1, 3.5)
      .hole('top', { u: 0, v: 0, diameter: insertPilot, depth: insertDepth, name: 'insert' })
      .translate(x, y, plateT - 0.1),
  );
}
return tray;
