// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/21: Ø22 × 10 collar, Ø8 bore, radial M4 set screw at mid-width.
const R = 11;
const width = 10;
const bore = 8;

return cylinder(width, R)
  .hole('top', { u: 0, v: 0, diameter: bore, depth: 'through', name: 'bore' })
  // radial M4 set screw straight into the round side, through to the bore
  .hole({ ofSurfaceType: 'CYLINDER' }, {
    at: { angleDeg: 0, z: width / 2 }, diameter: 4, depth: 'through', thread: { pitch: 0.7 }, name: 'setScrew',
  });
