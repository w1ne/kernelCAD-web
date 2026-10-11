// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/20: Ø20 × 25 rigid coupler, Ø5 / Ø8 bores, 2 × radial M3 set screws.
const R = 10;
const L = 25;
const spot = 0.5; // spot-face depth: a flat entry face for each radial hole

let body = cylinder(L, R)
  .hole('bottom', { u: 0, v: 0, diameter: 5, depth: L / 2, name: 'motorBore' })
  .hole('top', { u: 0, v: 0, diameter: 8, depth: L / 2, name: 'screwBore' });

// Radial M3 set screws from +X. A hole needs a planar entry face, so cut a
// 6 × 6 spot face, then tap from it into the bore.
for (const [z, boreR] of [[6, 2.5], [19, 4]] as const) {
  body = body.subtract(box(2, 6, 6, true).translate(R - spot + 1, 0, z));
  body = body.hole({ byNormal: 'X', atX: R - spot, atZ: z }, {
    u: 0, v: 0, diameter: 3, depth: R - spot - boreR + 0.5, thread: { pitch: 0.5 },
  });
}
return body;
