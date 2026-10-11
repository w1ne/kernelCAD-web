// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/20: Ø20 × 25 rigid coupler, Ø5 / Ø8 bores, 2 × radial M3 set screws.
const R = 10;
const L = 25;

const body = cylinder(L, R)
  .hole('bottom', { u: 0, v: 0, diameter: 5, depth: L / 2, name: 'motorBore' })
  .hole('top', { u: 0, v: 0, diameter: 8, depth: L / 2, name: 'screwBore' });

// Radial M3 set screws from +X, drilled straight into the cylinder side:
// `at: { angleDeg, z }` places them on the round face, 'through' stops at the bore.
const side = { ofSurfaceType: 'CYLINDER' } as const;
return body
  .hole(side, { at: { angleDeg: 0, z: 6 }, diameter: 3, depth: 'through', thread: { pitch: 0.5 }, name: 'setScrewMotor' })
  .hole(side, { at: { angleDeg: 0, z: 19 }, diameter: 3, depth: 'through', thread: { pitch: 0.5 }, name: 'setScrewLead' });
