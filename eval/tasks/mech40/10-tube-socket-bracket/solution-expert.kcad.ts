// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/10: 50 × 30 × 5 plate + Ø30 × 25 socket, Ø20.4 blind bore, 2 × Ø4.5.
const plateT = 5;
const socketH = 25;
const tubeD = 20;
const clearance = 0.2; // per side, FDM slip fit

const plate = box(50, 30, plateT).holes('top', {
  positions: [{ u: -19, v: 0 }, { u: 19, v: 0 }],
  diameter: 4.5,
  depth: 'through',
});
const socket = cylinder(socketH + 0.1, 15)
  .hole('top', { u: 0, v: 0, diameter: tubeD + 2 * clearance, depth: socketH, name: 'socket' })
  .translate(25, 15, plateT - 0.1);

return union(plate, socket);
