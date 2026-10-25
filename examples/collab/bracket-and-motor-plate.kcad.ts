// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/no-require-imports -- require() is the kernelCAD requirements API. */
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Two-part model used by the collaboration gate example and the `collab check`
// CLI test. Both parts are authored independently and placed in one assembly;
// the shared `hole-pattern` requirement is the interface contract. Moving one
// bracket hole breaks it, while a cosmetic bracket fillet change does not.
//
//   npx tsx src/agent/cli/index.ts evaluate examples/collab/bracket-and-motor-plate.kcad.ts

const plateT = param('plateT', 6, { min: 4, max: 10 });
const holeDia = param('holeDia', 6.6, { min: 5, max: 9 });
const bracketHoleX = param('bracketHoleX', 12, { min: 6, max: 18 });
const motorHoleX = param('motorHoleX', 12, { min: 6, max: 24 });
const bracketFillet = param('bracketFillet', 1.0, { min: 0.5, max: 3 });
const motorChamfer = param('motorChamfer', 1, { min: 0.2, max: 2 });

const bracketHole = box(40, 30, plateT).hole('top', {
  u: bracketHoleX,
  v: 0,
  diameter: holeDia,
  depth: 'through',
});
const bracket = bracketHole.fillet(bracketFillet, 'top');

const motorHole = box(40, 30, plateT).hole('top', {
  u: motorHoleX,
  v: 0,
  diameter: holeDia,
  depth: 'through',
});
const motorPlate = motorHole.chamfer(motorChamfer, 'top');

const asm = assembly('bracket and motor plate');
asm.part('bracket', bracket, { at: [0, 0, 0] });
asm.part('motor_plate', motorPlate, { at: [0, 0, 0] });

require('hole-pattern', concentric(
  faces(bracketHole, { ofSurfaceType: 'CYLINDER' }),
  faces(motorHole, { ofSurfaceType: 'CYLINDER' }),
).within(0.5));

return asm.model();
