// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Gallery copy of eval/tasks/raised-logo-extrusion/solution-expert.kcad.ts as a two-tone
// plate and logo. The geometry is identical to the eval solution; here the plate and the
// raised "KC" are separate parts so each carries its own colour (a single union() with two
// finishes still renders one colour in the headless publish render).
const plate = extrudeRect(60, 60, 2).finish('anodized', { color: '#1d3557' });
const logo = sketch
  .text('KC', { size: 20, align: 'center', position: [0, 0], rotation: 15 })
  .extrude(1.5)
  .translate(0, 0, 2)
  .finish('anodized', { color: '#f4a261' });

const asm = assembly('raised-logo-plate');
const plateP = asm.part('plate', plate);
const logoP = asm.part('logo', logo);
const seat = { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } } as const;
plateP.connector('seat', seat);
logoP.connector('seat', seat);
asm.mate('logo-fixed', 'plate.seat', 'logo.seat', 'fastened');
return asm.model();
