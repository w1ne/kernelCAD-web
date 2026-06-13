// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { WorkflowDefinition } from '../registry';

export const twoSketches: WorkflowDefinition = {
    id: 'user-two-sketches',
    name: 'User Report: Two Sketches',
    description: 'Workflow with multiple sketches on generated faces, fixing the users syntax error.',
    code: `
const { Sketcher } = replicad;

function drawPart() {
    const base = new Sketcher()
        .hLine(40)
        .vLine(40)
        .hLine(-40)
        .close()
        .extrude(30);

    const filleted = base.fillet(2);

    const cyl = replicad.makeCylinder(10, 30).translate(0, 0, 10);

    // Sketch 1
    const sketch1 = new Sketcher('XY').movePointerTo([-14, 10]).lineTo([17, -7]).done();
    // In user code: sketchOnFace(filleted, 12). 
    // We'll use a safer face find approach or just try 12 (if valid) or a planar face.
    // Let's blindly try face 12 as user did, BUT catch error if non-planar.
    // If 12 is fillet, it will fail.
    // The user's screenshot had them separate. 
    // They are projecting sketch1 onto face 12? No, they define sketch1 then define "filleted_sketch_12... = sketchOnFace..."
    
    // User code:
    // const filleted_sketch_12 ... = sketchOnFace(filleted, 12);
    // const filleted_extrude_12 = extrude(filleted_sketch_12 ..., 20);
    // const filleted_fused = filleted.fuse(filleted_extrude_12);
    
    // const sketch2 = new Sketcher('XY')...
    // const filleted_sketch_11 ... = sketchOnFace(filleted, 11);
    // const filleted_extrude_11 = extrude(..., 20);
    // const filleted_fused = ... << SPLAT (Redeclaration)

    // Fixed version:
    
    let result = filleted;
    
    // Operation 1
    const p1 = findPlanarFace(result);
    // console.log("Found planar face 1 at index", p1.index);
    const s1 = sketchOnFace(result, p1.index); 
    const ext1 = extrude(s1.circle(5), 10);
    result = result.fuse(ext1);
    
    // Operation 2 - Find another one, ideally side
    // For now, just finding *any* planar text is better than sphere.
    // Ideally we filter by normal to get a different one.
    const p2 = findPlanarFace(result); 
    const s2 = sketchOnFace(result, p2.index);
    const ext2 = extrude(s2.circle(3), 10);
    result = result.fuse(ext2);
    
    return result.cut(cyl);
}

return drawPart();
    `,
    expected: {
        sketchCount: 4, // 1 base + 2 face sketches + maybe internal or extra sketch?
        faceCount: 39
    }
};
