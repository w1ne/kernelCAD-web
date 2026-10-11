// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/40: 30 × 20 × 15 block, Ø3.4 through, M3 hex nut trap 5.7 AF × 2.6 on the bottom.
const af = 5.5 + 0.2; // across flats, with print clearance
const trapDepth = 2.6;
const rc = af / Math.sqrt(3); // corner radius

// Hexagon with corners on ±u (flats facing ±v), centred on the face centre.
let hex = path().moveTo(rc, 0);
for (let k = 1; k < 6; k++) hex = hex.lineTo(rc * Math.cos((k * Math.PI) / 3), rc * Math.sin((k * Math.PI) / 3));

return box(30, 20, 15)
  .hole('top', { u: 0, v: 0, diameter: 3.4, depth: 'through', name: 'bolt' })
  .cutout(hex.close(), { face: 'bottom', depth: trapDepth });
