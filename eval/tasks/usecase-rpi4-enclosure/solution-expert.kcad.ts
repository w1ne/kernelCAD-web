// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-rpi4-enclosure/solution-expert.kcad.ts
//
// Typical use case U3: two-part enclosure for a Raspberry Pi 4 Model B.
//
// Board data from the Raspberry Pi 4 Model B mechanical drawing: 85 x 56 mm,
// M2.5 mounting holes at (3.5, 3.5), (61.5, 3.5), (3.5, 52.5), (61.5, 52.5)
// (58 x 49 mm pattern). Along the y = 0 edge: USB-C x = 11.2, micro-HDMI
// x = 26 and 39.5, audio x = 54. Along the x = 85 edge: USB 2 y = 9, USB 3
// y = 27, Ethernet y = 45.75. The micro-SD card sits under the board at the
// x = 0 edge, y = 28.
//
// Four M2.5 screws go down through the lid posts and the board's own holes
// into the base standoffs, so the lid also clamps the board.

const wall = 2;
const floor = 2;
const gap = 1.5; // board-to-wall clearance
const standoffH = 5; // room under the board for the SD card and solder
const boardT = 1.5;
const headroom = 18.5; // board top to lid: USB stack is 16 mm tall
const boardL = 85;
const boardW = 56;
const holes: [number, number][] = [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]];

const ox = wall + gap; // board origin in the enclosure
const oy = wall + gap;
const L = boardL + 2 * (wall + gap); // 92
const W = boardW + 2 * (wall + gap); // 63
const boardBottom = floor + standoffH; // 7
const boardTop = boardBottom + boardT; // 8.5
const baseH = boardTop + headroom; // 27
const lidT = 2;

// ---------- base: open box, standoffs, port openings ----------
let base = box(L, W, baseH).subtract(box(L - 2 * wall, W - 2 * wall, baseH).translate(wall, wall, floor));

for (const [hx, hy] of holes) {
  const standoff = cylinder(standoffH + 0.5, 3).translate(ox + hx, oy + hy, floor - 0.5);
  base = base.union(standoff);
}
// Pilot holes for M2.5 thread-forming screws, 4.5 mm deep from the standoff top.
for (const [hx, hy] of holes) {
  base = base.subtract(cylinder(4.5 + 1, 1.1).translate(ox + hx, oy + hy, boardBottom - 4.5));
}

// An opening through a wall: `u` along the wall, `w` wide, z0..z1.
const zPort = boardTop - 1; // 1 mm below the connector
const southPort = (u: number, w: number, z1: number) =>
  box(w, wall + 2, z1 - zPort).translate(ox + u - w / 2, -1, zPort);
const eastPort = (u: number, w: number, z1: number) =>
  box(wall + 2, w, z1 - zPort).translate(L - wall - 1, oy + u - w / 2, zPort);

base = base.subtract(southPort(11.2, 11, boardTop + 4.3)); // USB-C 9 x 3.3
base = base.subtract(southPort(26, 9, boardTop + 4.2)); // micro-HDMI 0, 7 x 3.2
base = base.subtract(southPort(39.5, 9, boardTop + 4.2)); // micro-HDMI 1
base = base.subtract(southPort(54, 8, boardTop + 7)); // audio jack Ø6
base = base.subtract(eastPort(9, 15.5, boardTop + 17)); // USB 2 pair, 13.5 x 16
base = base.subtract(eastPort(27, 15.5, boardTop + 17)); // USB 3 pair
base = base.subtract(eastPort(45.75, 18, boardTop + 14.5)); // Ethernet 16 x 13.5
// Micro-SD slot in the x = 0 wall, under the board.
base = base.subtract(box(wall + 2, 14, boardTop - 4).translate(-1, oy + 28 - 7, 4));

// ---------- lid: plate, screw posts, vents ----------
let lid = box(L, W, lidT).translate(0, 0, baseH);
for (const [hx, hy] of holes) {
  // Post from the lid down to 0.2 mm above the board.
  lid = lid.union(cylinder(baseH - boardTop - 0.2 + 0.5, 3).translate(ox + hx, oy + hy, boardTop + 0.2));
}
for (const [hx, hy] of holes) {
  lid = lid.subtract(cylinder(baseH + lidT, 1.45).translate(ox + hx, oy + hy, boardTop)); // M2.5 clearance
  lid = lid.subtract(cylinder(2, 2.5).translate(ox + hx, oy + hy, baseH + lidT - 1.2)); // head counterbore
}
// Ten vent slots, 2.5 x 30 mm, over the middle of the board.
for (let i = 0; i < 10; i++) {
  lid = lid.subtract(box(2.5, 30, lidT + 2).translate(22 + 5 * i, W / 2 - 15, baseH - 1));
}

// The lid rests on the base by design.
dfmSpec({ minWall: 1.2, minClearance: 0.1, ignore: [['base', 'lid']] });

const enclosure = assembly('rpi4-enclosure');
enclosure.part('base', base.color('plate'));
enclosure.part('lid', lid.color('frame'));
return enclosure.model();
