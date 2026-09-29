// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-gridfinity-bin/solution-expert.kcad.ts
//
// Typical use case U4: Gridfinity 2 x 1 bin, 6 units tall, magnet holes in
// the base, one divider.
//
// Gridfinity dimensions (https://gridfinity.xyz/specification/): 42 mm grid,
// bin = 42·n − 0.5 mm, 7 mm height units, top corner radius 3.75 mm. Each
// grid cell has its own foot; the foot profile from the bottom is a 0.8 mm
// 45° chamfer, 1.8 mm straight, a 2.15 mm 45° chamfer (4.75 mm). Magnet holes
// Ø6.5 x 2.4 mm (6 x 2 mm magnets) at ±13 mm from each cell centre.

const unitsX = 2;
const unitsY = 1;
const heightUnits = 6;

const PITCH = 42;
const CLEARANCE = 0.5;
const R_TOP = 3.75;
const C1 = 0.8; // bottom chamfer
const S1 = 1.8; // straight
const C2 = 2.15; // top chamfer
const BASE_H = C1 + S1 + C2; // 4.75
const WALL = 1.25; // above the 1.2 mm FDM minimum wall
const FLOOR = 1.2; // floor above the foot stack
const DIVIDER = 1.25;
const MAGNET_D = 6.5;
const MAGNET_H = 2.4;
const MAGNET_OFFSET = 13;

const W = PITCH * unitsX - CLEARANCE; // 83.5
const D = PITCH * unitsY - CLEARANCE; // 41.5
const TOP = 7 * heightUnits; // 42
const FOOT = PITCH - CLEARANCE; // 41.5

// Rounded-rect prism centred in X/Y, z = 0..h.
const slab = (w: number, d: number, r: number, h: number) => extrudeRoundedRect(w, d, r, h);

// One foot: the lower step (chamfered at z = 0) under the upper step that
// widens at 45° to the full foot outline, which runs 1 mm into the body.
function foot() {
  const lower = slab(FOOT - 2 * C2, FOOT - 2 * C2, R_TOP - C2, C1 + S1).chamfer(C1, { face: { atZ: 0 } });
  const upper = slab(FOOT, FOOT, R_TOP, C2 + 1).chamfer(C2, { face: { atZ: 0 } }).translate(0, 0, C1 + S1);
  return lower.union(upper);
}

const cellCentres: [number, number][] = [];
for (let i = 0; i < unitsX; i++) {
  for (let j = 0; j < unitsY; j++) {
    cellCentres.push([(i - (unitsX - 1) / 2) * PITCH, (j - (unitsY - 1) / 2) * PITCH]);
  }
}

let bin = slab(W, D, R_TOP, TOP - BASE_H).translate(0, 0, BASE_H);
for (const [cx, cy] of cellCentres) bin = bin.union(foot().translate(cx, cy, 0));

// Open cavity from the floor to the top.
const floorZ = BASE_H + FLOOR;
bin = bin.subtract(slab(W - 2 * WALL, D - 2 * WALL, R_TOP - WALL, TOP - floorZ + 1).translate(0, 0, floorZ));

// One divider between the two cells, floor to top.
bin = bin.union(box(DIVIDER, D - 2 * WALL, TOP - floorZ, true).translate(0, 0, floorZ + (TOP - floorZ) / 2));

// Magnet holes: four per foot, blind from the bottom face.
for (const [cx, cy] of cellCentres) {
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    bin = bin.subtract(cylinder(MAGNET_H, MAGNET_D / 2).translate(cx + MAGNET_OFFSET * sx, cy + MAGNET_OFFSET * sy, 0));
  }
}

dfmSpec({ minWall: 1.2 });

return bin;
