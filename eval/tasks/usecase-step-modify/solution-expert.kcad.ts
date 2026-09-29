// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-step-modify/solution-expert.kcad.ts
//
// Typical use case U15: modify an imported STEP. "Here is a STEP file of a
// part; add two 5 mm holes 20 mm apart through the top face." The part is
// the U2 NEMA 17 mount; its top face is the base plate's upper face (z = 5).
// The holes go on the free area behind the extrusion slots, at y = 35.

const holeDia = param('holeDia', 5);
const holeSpacing = param('holeSpacing', 20);
const holeY = param('holeY', 35);

const imported = await lib.fromSTEP('input.step');

// Longer than the 5 mm plate so each cut clears both faces.
const drill = (x) => cylinder(20, holeDia.divide(2)).translate(x, holeY, -5);

dfmSpec({ minWall: 1.2 });

return imported.subtract(drill(holeSpacing.divide(-2))).subtract(drill(holeSpacing.divide(2)));
