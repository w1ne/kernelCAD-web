// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Gallery copy of eval/tasks/raised-logo-extrusion/solution-expert.kcad.ts as a two-tone
// plate and logo. The geometry is identical to the eval solution: one body, where
// union() keeps each member's finish on its own faces.
const plate = extrudeRect(60, 60, 2).finish('anodized', { color: '#1d3557' });
const logo = sketch
  .text('KC', { size: 20, align: 'center', position: [0, 0], rotation: 15 })
  .extrude(1.5)
  .translate(0, 0, 2)
  .finish('anodized', { color: '#f4a261' });

return union(plate, logo);
