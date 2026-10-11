// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/09: flanged shaft support, Ø8 bore along Y at z = 22, 2 × M5 counterbored.
const flangeL = 42;
const depth = 14;
const flangeT = 6;
const uprightW = 20;
const height = 32;
const boreZ = 22;

const flange = box(flangeL, depth, flangeT).holes('top', {
  positions: [{ u: -15, v: 0 }, { u: 15, v: 0 }],
  diameter: 5.5,
  depth: 'through',
  counterbore: { diameter: 10, depth: 3 },
});
// Upright starts 0.1 mm inside the flange so the union is one solid.
const z0 = flangeT - 0.1;
const uprightH = height - z0;
const upright = box(uprightW, depth, uprightH)
  // 'front' face (-Y): u = +X, v = +Z from its centre
  .hole('front', { u: 0, v: boreZ - z0 - uprightH / 2, diameter: 8, depth: 'through', name: 'shaftBore' })
  .translate((flangeL - uprightW) / 2, 0, z0);

return union(flange, upright);
