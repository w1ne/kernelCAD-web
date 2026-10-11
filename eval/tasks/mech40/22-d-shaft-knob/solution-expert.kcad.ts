// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/22: Ø30 × 15 knob, 12 deep D-bore (Ø6.2, flat at x = 1.5), M3 set screw from -X.
const R = 15;
const H = 15;
const boreR = 3.1;
const flatX = 1.5;
const boreDepth = 12;
const screwZ = 5;
const spot = 0.5;

// D profile: chord at x = flatX, round on the -X side.
const y = Math.sqrt(boreR * boreR - flatX * flatX);
const dProfile = path().moveTo(flatX, -y).lineTo(flatX, y).threePointsArc(flatX, -y, -boreR, 0).close();

return cylinder(H, R)
  // 'bottom' face frame: u = +X, v = +Y from the face centre.
  .cutout(dProfile, { face: 'bottom', depth: boreDepth })
  .subtract(box(2, 6, 6, true).translate(-(R - spot + 1), 0, screwZ))
  .hole({ byNormal: '-X', atX: -(R - spot) }, {
    u: 0, v: 0, diameter: 3, depth: R - spot - boreR + 0.5, thread: { pitch: 0.5 }, name: 'setScrew',
  });
