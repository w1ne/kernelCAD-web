// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/12: 100 × 70 × 35 printed box, 2.5 walls, 4 tapped M3 bosses, screw-down lid.
const L = 100;
const W = 70;
const H = 35;
const wall = 2.5;
const lidT = 2.5;
const bossD = 10;
const bossInset = 10.5;

const corners: [number, number][] = [
  [bossInset, bossInset], [L - bossInset, bossInset], [bossInset, W - bossInset], [L - bossInset, W - bossInset],
];

let base = box(L, W, H).subtract(box(L - 2 * wall, W - 2 * wall, H).translate(wall, wall, wall));
for (const [x, y] of corners) {
  // Boss from 0.1 mm inside the floor to the rim; M3 tapped 10 deep from the top.
  const boss = cylinder(H - wall + 0.1, bossD / 2)
    .hole('top', { u: 0, v: 0, diameter: 3, depth: 10, thread: { pitch: 0.5 } })
    .translate(x, y, wall - 0.1);
  base = base.union(boss);
}

const lid = box(L, W, lidT)
  .holes('top', { positions: corners.map(([x, y]) => ({ u: x - L / 2, v: y - W / 2 })), diameter: 3.4, depth: 'through' })
  .translate(0, 0, H);

const box3d = assembly('project-box');
box3d.part('base', base, { material: 'petg' });
box3d.part('lid', lid, { material: 'petg' });
return box3d.model();
