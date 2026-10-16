// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/01: 100 × 60 × 6 plate, R5 vertical corners, 4 × M5 clearance holes.
const length = param('length', 100, { min: 40, max: 300 });
const width = param('width', 60, { min: 30, max: 200 });
const thickness = param('thickness', 6, { min: 2, max: 20 });
const inset = 8; // hole centre from each edge
const du = 100 / 2 - inset;
const dv = 60 / 2 - inset;

// Rounded corners belong to the outline: a 5 mm fillet on 6 mm tall edges
// would be longer than the edges it rounds.
return extrudeRoundedRect(length, width, 5, thickness)
  .holes({ byNormal: 'Z' }, {
    positions: [{ u: -du, v: -dv }, { u: du, v: -dv }, { u: -du, v: dv }, { u: du, v: dv }],
    diameter: 5.5, // ISO 273 normal clearance for M5
    depth: 'through',
  });
