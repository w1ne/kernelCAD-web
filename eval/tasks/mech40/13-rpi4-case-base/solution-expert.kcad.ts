// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/13: Raspberry Pi 4 case base — 93 × 64 × 30, 2 mm walls, 4 tapped standoffs, ports.
const wall = 2;
const floorT = 2;
const gap = 2; // board to inside wall
const outer = { x: 93, y: 64, z: 30 };
const standoffH = 5;
const portZ = 8; // port bottom edge above the case bottom

// Board origin (its X-min / Y-min corner) in case coordinates.
const bx = wall + gap;
const by = wall + gap;
const piHoles: [number, number][] = [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]];

let base = box(outer.x, outer.y, outer.z)
  .subtract(box(outer.x - 2 * wall, outer.y - 2 * wall, outer.z).translate(wall, wall, floorT));

for (const [hx, hy] of piHoles) {
  const standoff = cylinder(standoffH + 0.1, 3)
    .hole('top', { u: 0, v: 0, diameter: 2.5, depth: 4, thread: { pitch: 0.45 } })
    .translate(bx + hx, by + hy, floorT - 0.1);
  base = base.union(standoff);
}

/** Rectangle in a face's (u, v) frame. */
const rect = (u0: number, v0: number, u1: number, v1: number) =>
  path().moveTo(u0, v0).lineTo(u1, v0).lineTo(u1, v1).lineTo(u0, v1).close();

// X-max end (outside face picked by normal; same frame as 'right': u = +Y, v = +Z from the face centre y = 32, z = 15).
const boardMidY = by + 56 / 2;
base = base.cutout(rect(boardMidY - 27 - 32, portZ - 15, boardMidY + 27 - 32, portZ + 16 - 15), { face: { byNormal: 'X', atX: outer.x }, depth: wall });
// Y-min side (outside face, frame of 'front': u = +X, v = +Z from the face centre x = 46.5, z = 15).
const sidePort = (along: number, w: number) => {
  const cx = bx + along - outer.x / 2;
  return rect(cx - w / 2, portZ - 15, cx + w / 2, portZ + 5 - 15);
};
base = base
  .cutout(sidePort(11.2, 10), { face: { byNormal: '-Y', atY: 0 }, depth: wall })
  .cutout(sidePort(26, 8), { face: { byNormal: '-Y', atY: 0 }, depth: wall })
  .cutout(sidePort(39.5, 8), { face: { byNormal: '-Y', atY: 0 }, depth: wall });

return base;
