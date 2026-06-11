// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { WorkflowDefinition } from '../registry';

export const sketchOnFaceFail: WorkflowDefinition = {
    id: 'sketch-on-face-fail',
    name: 'Sketch On Face (Non-Planar Failure)',
    description: 'Attempts to sketch on a filleted face, identifying the error.',
    code: `
const { Sketcher } = replicad;
const base = new Sketcher().hLine(50).vLine(50).hLine(-50).close().extrude(50).fillet(10);

// Try to sketch on a fillet face (usually index 12 or others, let's try finding one)
// Face 12 is likely a fillet in this box topo.
// Or we can try to extrude a non-planar face directly using the helper which checks both.
const sketch = sketchOnFace(base, 12);

return sketch;
`,
    expected: {
        // We expect an error
        error: /Cannot sketch on non-planar face/
    }
};
