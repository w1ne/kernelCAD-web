// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { WorkflowDefinition } from '../registry';

export const revolveWorkflow: WorkflowDefinition = {
    id: 'basic-revolve',
    name: 'Basic Revolve',
    description: 'Revolves a profile around an axis.',
    code: `
const { Sketcher } = replicad;
const sketch = new Sketcher()
    .movePointerTo([10, 0])
    .vLine(10)
    .hLine(5)
    .vLine(-10)
    .close();

return sketch.revolve();
`,
    expected: {
        // Volume: Cylinder outer R=15, inner R=10, h=10
        // PI * (15^2 - 10^2) * 10 = PI * (225 - 100) * 10 = 1250 * PI
        volume: 1250 * Math.PI,
        sketchCount: 1
    }
};
