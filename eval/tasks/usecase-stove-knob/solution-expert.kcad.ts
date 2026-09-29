// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-stove-knob/solution-expert.kcad.ts
//
// Typical use case U5: replacement stove knob from measurements. D-shaft
// Ø6 mm with the flat at 4.5 mm, 12 mm deep; knob Ø35 x 20 mm with a knurled
// grip and a pointer mark on top. Shaft hole Ø6.2 (0.2 mm fit clearance).

const knobDia = param('knobDia', 35);
const knobHeight = param('knobHeight', 20);
const shaftDia = param('shaftDia', 6);
const flatHeight = param('flatHeight', 4.5); // round side to the flat
const shaftDepth = param('shaftDepth', 12);
const clearance = param('clearance', 0.2);

const knobR = knobDia.divide(2);
const boreR = shaftDia.add(clearance).divide(2); // Ø6.2
// The flat sits flatHeight + clearance from the far side of the bore.
const flatY = flatHeight.add(clearance).subtract(boreR);

let knob = cylinder(knobHeight, knobR);

// D-shaped shaft hole from the bottom: the round bore minus the segment
// beyond the flat, cut in one go.
const bore = cylinder(shaftDepth.add(1), boreR).translate(0, 0, -1);
const beyondFlat = box(boreR.multiply(2).add(2), boreR.add(2), shaftDepth.add(2))
  .translate(boreR.negate().subtract(1), flatY, -1);
knob = knob.subtract(bore.subtract(beyondFlat));

// Knurled grip: 36 grooves, 1.2 mm wide and 0.8 mm deep, on a 14 mm band.
const bandH = knobHeight.subtract(6);
const groove = box(1.6, 1.2, bandH, true).translate(knobR, 0, bandH.divide(2).add(3));
knob = knob.subtract(groove.patternCircular({ count: 36, axis: [0, 0, 1] }));

// Pointer mark: a 1.5 mm wide, 0.8 mm deep groove on the top face, from the
// centre out to the rim along +Y (the flat's side).
const pointer = box(1.5, knobR.add(1), 1, false).translate(-0.75, 0, knobHeight.subtract(0.8));
knob = knob.subtract(pointer);

knob = knob.finish('pla');

dfmSpec({ minWall: 1.2, process: 'fdm' });

return knob;
