// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { WorkflowDefinition } from '../registry';

export const userReproSideSketch: WorkflowDefinition = {
    id: 'user-repro-side-sketch',
    name: 'User Repro: Side Sketch Visibility',
    description: 'Reproduces the users attempt to sketch on the side using XY plane vs correct implementation.',
    code: `
const { Sketcher } = replicad;

// 1. User's Base
const base = new Sketcher()
    .hLine(40)
    .vLine(40)
    .hLine(-40)
    .close()
    .extrude(30);

const filleted = base.fillet(2);
const cyl = replicad.makeCylinder(10, 30).translate(0, 0, 10);
const finalShape = filleted.cut(cyl);

// 2. User's exact attempt (with fix to return it)
// new Sketcher('XY') is on Z=0 (Bottom/Floor)
const userSketch = new Sketcher('XY')
    .movePointerTo([-16, 13])
    .lineTo([25, 1]);

// 3. Correct approach for "Side" (Vertical Face)
// Find a vertical face (like we did in test 09)
let sideFaceIndex = 0;
// Simple heuristic for this known geometry
// Face 0 is often a side face in a box extrusion
const correctSketchBase = sketchOnFace(finalShape, 0); 
const correctSketch = correctSketchBase.circle(5);

// Return everything so we can verify counts
return [
    finalShape, 
    userSketch,    // Will be on floor
    correctSketch  // Will be on side
];
`,
    expected: {
        sketchCount: 3
    }
};
