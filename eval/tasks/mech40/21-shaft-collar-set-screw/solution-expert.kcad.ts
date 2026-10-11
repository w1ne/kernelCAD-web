// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/21: Ø22 × 10 collar, Ø8 bore, radial M4 set screw at mid-width.
const R = 11;
const width = 10;
const bore = 8;
const spot = 0.5;

return cylinder(width, R)
  .hole('top', { u: 0, v: 0, diameter: bore, depth: 'through', name: 'bore' })
  // flat entry face for the radial set screw
  .subtract(box(2, 7, 7, true).translate(R - spot + 1, 0, width / 2))
  .hole({ byNormal: 'X', atX: R - spot }, {
    u: 0, v: 0, diameter: 4, depth: R - spot - bore / 2 + 0.5, thread: { pitch: 0.7 }, name: 'setScrew',
  });
