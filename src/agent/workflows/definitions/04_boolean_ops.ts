// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { WorkflowDefinition } from '../registry';

export const booleanOps: WorkflowDefinition = {
    id: 'boolean-ops',
    name: 'Boolean Operations',
    description: 'Union, Cut, and Intersection.',
    code: `
const { Sketcher } = replicad;
// const box = replicad.makeBox(50, 50, 50); // makeBox might be unstable in tests?
const box = new Sketcher().hLine(50).vLine(50).hLine(-50).close().extrude(50);

const cyl = replicad.makeCylinder(15, 60).translate(25, 25, -5);

// Cut cylinder from box
const result = box.cut(cyl);

return result;
`,
    expected: {
        sketchCount: 1, // We use a sketch for the box now
        volume: 89657 // Approx
    }
};
