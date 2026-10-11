// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/17: 120 × 80 × 40 cover, 2.5 mm shell open at the bottom, 8 × (4 × 50) top slots.
const wall = 2.5;
const slots = 8;
const pitch = 10;
const slotW = 4;
const slotL = 50;

/** Obround slot along v (face-local Y), centred at u. */
function slot(u: number) {
  const r = slotW / 2;
  const half = slotL / 2 - r;
  return path()
    .moveTo(u - r, -half)
    .lineTo(u - r, half)
    .threePointsArc(u + r, half, u, half + r)
    .lineTo(u + r, -half)
    .threePointsArc(u - r, -half, u, -half - r)
    .close();
}

let cover = box(120, 80, 40).shell(wall, { face: 'bottom' });
for (let k = 0; k < slots; k++) {
  cover = cover.cutout(slot((k - (slots - 1) / 2) * pitch), { face: 'top', depth: wall });
}
return cover;
