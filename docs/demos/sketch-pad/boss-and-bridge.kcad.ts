// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Two additive pads on one plate:
//   * a 10 x 10 x 5 blind boss on the top face;
//   * a 10 x 10 bridge grown from the same top face up to the tower top
//     (z = 20) with upToFace, so the pad height follows the tower.
const base = box(40, 30, 10).union(box(10, 30, 10).translate(30, 0, 10));

const squareAt = (cx, cy) => path()
  .moveTo(cx - 5, cy - 5)
  .lineTo(cx + 5, cy - 5)
  .lineTo(cx + 5, cy + 5)
  .lineTo(cx - 5, cy + 5)
  .close();

const top = { byNormal: 'Z', atZ: 10 };
const towerTop = { atZ: 20, parallelTo: 'XY' };

const withBoss = base.pad(squareAt(-10, 0), { face: top, depth: 5 });
return withBoss.pad(squareAt(0, 0), { face: top, upToFace: towerTop });
