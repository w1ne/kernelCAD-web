// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/25: module 1, 30 teeth, 6 mm face + Ø16 × 8 hub, Ø6 bore, radial M3 set screw in the hub.
const faceWidth = 6;
const hubR = 8;
const hubL = 8;
const bore = 6;
const screwZ = faceWidth + 4;

const gear = spurGear({ module: 1, teeth: 30, faceWidth, backlash: 0.1 });
const hub = cylinder(hubL + 0.1, hubR).translate(0, 0, faceWidth - 0.1);

return union(gear, hub)
  .hole({ byNormal: 'Z', atZ: faceWidth + hubL }, { u: 0, v: 0, diameter: bore, depth: 'through', name: 'bore' })
  // Radial M3 set screw from +X into the hub's round side, through to the bore.
  // The world point picks the hub cylinder among the cylindrical faces.
  .hole({ ofSurfaceType: 'CYLINDER' }, {
    at: [hubR, 0, screwZ], diameter: 3, depth: 'through', thread: { pitch: 0.5 }, name: 'setScrew',
  });
