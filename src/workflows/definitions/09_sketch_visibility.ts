import type { WorkflowDefinition } from '../registry';

export const sketchVisibility: WorkflowDefinition = {
    id: 'sketch-visibility',
    name: 'Sketch Visibility on Face',
    description: 'Verifies that a sketch drawn on a face is located at the correct Z-height and returned.',
    code: `
	const { Sketcher } = replicad;
	const __DEBUG__ = typeof process !== 'undefined' && process?.env?.KERNELCAD_TEST_LOG === '1';
	
	// 1. Create Base Shape
	const base = new Sketcher()
    .hLine(40)
    .vLine(40)
    .hLine(-40)
    .close()
    .extrude(30);

const filleted = base.fillet(2);

// 2. Sketch on a Side Face (Valid Legitimate Workflow)
// We want to find a face that is vertical (Normal Z is 0).
let faceIndex = -1;

if (filleted.faces && filleted.faces.length > 0) {
    for (let i = 0; i < filleted.faces.length; i++) {
        const face = filleted.faces[i];
        if (face.geomType === 'PLANE') {
             try {
                // Replicad faces might not expose .normal directly, but makePlaneFromFace does.
                const plane = replicad.makePlaneFromFace(face);
                
                // Check normal Z component.
                // Replicad Plane usually has zDir vector as normal.
                
                let normalZ = 0;
	                if (plane.zDir) {
	                    normalZ = plane.zDir.z;
	                }
	                
	                if (__DEBUG__) console.log('Face ' + i + ': NormalZ=' + normalZ);
	
	                // Side face is vertical, so Normal Z should be near 0.
	                if (Math.abs(normalZ) < 0.1) {
	                     faceIndex = i;
	                     if (__DEBUG__) console.log('Found side face (Vertical) at index ' + i);
	                     break;
	                }
	             } catch (e) {
	                 if (__DEBUG__) console.log('Face ' + i + ': Error checking plane ' + e);
	             }
	        }
	    }
	}

if (faceIndex === -1) {
    throw new Error('Could not find a side face. Check logs.');
}

const s1 = sketchOnFace(filleted, faceIndex); 

// Draw something on the side
const mySketch = s1.circle(5);

// 3. Return BOTH: Shape and Sketch
return [filleted, mySketch];
`,
    expected: {
        sketchCount: 2
    }
};
