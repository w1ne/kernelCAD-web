// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/25: module 1, 30 teeth, 6 mm face + Ø16 × 8 hub, Ø6 bore, radial M3 set screw in the hub.
const faceWidth = 6;
const hubR = 8;
const hubL = 8;
const bore = 6;
const spot = 0.5;
const screwZ = faceWidth + 4;

const gear = spurGear({ module: 1, teeth: 30, faceWidth, backlash: 0.1 });
const hub = cylinder(hubL + 0.1, hubR).translate(0, 0, faceWidth - 0.1);

return union(gear, hub)
  .hole({ byNormal: 'Z', atZ: faceWidth + hubL }, { u: 0, v: 0, diameter: bore, depth: 'through', name: 'bore' })
  .subtract(box(2, 6, 6, true).translate(hubR - spot + 1, 0, screwZ))
  .hole({ byNormal: 'X', atX: hubR - spot, atZ: screwZ }, {
    u: 0, v: 0, diameter: 3, depth: hubR - spot - bore / 2 + 0.5, thread: { pitch: 0.5 }, name: 'setScrew',
  });
