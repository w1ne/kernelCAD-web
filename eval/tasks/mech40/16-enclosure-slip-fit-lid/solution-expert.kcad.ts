// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/16: 70 × 50 × 30 base + lid with a 4 mm locating lip, 0.2 mm/side slip fit.
const L = 70;
const W = 50;
const H = 30;
const wall = 2;
const lidT = 2;
const lipT = 1.5;
const lipDepth = 4;
const fit = 0.2; // per side, FDM slip fit

const base = box(L, W, H).subtract(box(L - 2 * wall, W - 2 * wall, H).translate(wall, wall, wall));

const lipOuter = { x: L - 2 * wall - 2 * fit, y: W - 2 * wall - 2 * fit };
const lip = box(lipOuter.x, lipOuter.y, lipDepth + 0.1)
  .subtract(box(lipOuter.x - 2 * lipT, lipOuter.y - 2 * lipT, lipDepth + 1).translate(lipT, lipT, -0.5))
  .translate(wall + fit, wall + fit, H - lipDepth);
const lid = union(box(L, W, lidT).translate(0, 0, H), lip);

// The lid rests on the rim (design contact), so the fit is the lip gap above;
// the print gate checks the 1.5 mm lip against the minimum wall.
dfmSpec({ minWall: 1.2 });

const enclosure = assembly('slip-fit-enclosure');
enclosure.part('base', base, { material: 'pla' });
enclosure.part('lid', lid, { material: 'pla' });
return enclosure.model();
