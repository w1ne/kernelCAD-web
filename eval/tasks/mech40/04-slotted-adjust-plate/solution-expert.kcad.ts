// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/04: 80 × 40 × 5 plate, two 6 × 20 obround through slots at x = 20 / 60.
const t = 5;
const slotW = 6;
const slotL = 20;

/** Obround slot centred at face-local u = c, running along u. */
function slot(c: number) {
  const r = slotW / 2;
  const half = slotL / 2 - r; // straight half-length
  return path()
    .moveTo(c - half, -r)
    .lineTo(c + half, -r)
    .threePointsArc(c + half, r, c + half + r, 0)
    .lineTo(c - half, r)
    .threePointsArc(c - half, -r, c - half - r, 0)
    .close();
}

// cutout profiles are face-local: origin at the top-face centre (x = 40).
return box(80, 40, t)
  .cutout(slot(-20), { face: 'top', depth: t })
  .cutout(slot(20), { face: 'top', depth: t });
