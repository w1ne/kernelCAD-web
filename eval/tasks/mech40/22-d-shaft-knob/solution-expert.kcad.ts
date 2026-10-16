// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/22: Ø30 × 15 knob, 12 deep D-bore (Ø6.2, flat at x = 1.5), M3 set screw from -X.
const R = 15;
const H = 15;
const boreR = 3.1;
const flatX = 1.5;
const boreDepth = 12;
const screwZ = 5;

// D profile: chord at x = flatX, round on the -X side.
const y = Math.sqrt(boreR * boreR - flatX * flatX);
const dProfile = path().moveTo(flatX, -y).lineTo(flatX, y).threePointsArc(flatX, -y, -boreR, 0).close();

return cylinder(H, R)
  // 'bottom' face frame: u = +X, v = +Y from the face centre.
  .cutout(dProfile, { face: 'bottom', depth: boreDepth })
  // M3 set screw from -X (180°) on the round side, through into the D-bore.
  .hole({ ofSurfaceType: 'CYLINDER' }, {
    at: { angleDeg: 180, z: screwZ }, diameter: 3, depth: 'through', thread: { pitch: 0.5 }, name: 'setScrew',
  });
