// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/19: Raspberry Pi 5 plate — 100 × 80 × 3, 4 × M2.5 tapped standoffs on 58 × 49, 4 × Ø4.5 corners.
const plateT = 3;
const standoffH = 6;
const pattern = { x: 58, y: 49 };
const corner = 100 / 2 - 6;
const cornerV = 80 / 2 - 6;

let plate = box(100, 80, plateT).holes('top', {
  positions: [{ u: -corner, v: -cornerV }, { u: corner, v: -cornerV }, { u: -corner, v: cornerV }, { u: corner, v: cornerV }],
  diameter: 4.5,
  depth: 'through',
});
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    plate = plate.union(
      cylinder(standoffH + 0.1, 3)
        .hole('top', { u: 0, v: 0, diameter: 2.5, depth: 5, thread: { pitch: 0.45 } })
        .translate(50 + (sx * pattern.x) / 2, 40 + (sy * pattern.y) / 2, plateT - 0.1),
    );
  }
}
return plate;
