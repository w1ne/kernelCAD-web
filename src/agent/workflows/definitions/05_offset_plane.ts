// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { WorkflowDefinition } from '../registry';

export const offsetPlane: WorkflowDefinition = {
    id: 'offset-plane',
    name: 'Offset Plane',
    description: 'Sketch on a plane offset from standard planes.',
    code: `
const { Sketcher } = replicad;

// XY Plane offset by 20 in Z
const plane = new replicad.Plane([0,0,20]); 
const sketch = new Sketcher(plane)
    .circle(10)
    .extrude(10);

return sketch;
`,
    expected: {
        sketchCount: 1,
        volume: Math.PI * 100 * 10
    }
};
