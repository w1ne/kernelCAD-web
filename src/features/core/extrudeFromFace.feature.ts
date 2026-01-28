import { ArrowUpFromLine } from 'lucide-react';
import { type Feature } from '../types';
import { getReturnedVariables } from '../../lib/ast';

export const ExtrudeFromFaceFeature: Feature = {
    id: 'extrudeFromFace',
    label: 'Extrude Face',
    icon: ArrowUpFromLine,
    description: 'Extrude a selected planar face by a specified distance',
    execute: ({ setActiveDialog, insertCode, code }, params) => {
        if (params && typeof params.distance === 'number' && typeof params.faceId === 'number') {
            const { distance, faceId, shapeIndex } = params;

            // Resolve the actual variable name from the code
            let targetName = 'shape'; // fallback
            if (code && typeof shapeIndex === 'number') {
                const returnedVars = getReturnedVariables(code);
                targetName = returnedVars[shapeIndex] || 'shape';
                if (targetName === 'unknown') targetName = 'shape';
            }

            const generatedCode = generateExtrudeFromFaceCode(targetName, faceId, distance);
            insertCode(generatedCode);
            setActiveDialog(null);
        } else {
            setActiveDialog('extrudeFromFace');
        }
    }
};

export const generateExtrudeFromFaceCode = (targetName: string, faceId: number, distance: number): string => {
    // Use timestamp to ensure unique variable names and avoid conflicts with manual sketches
    const timestamp = Date.now();
    const sketchName = `${targetName}_extrudeFace${faceId}_${timestamp}`;
    const extrusionName = `${targetName}_face${faceId}_extrude`;

    // Code breakdown:
    // 1. Create a sketch on the face (which automatically converts the face boundary to sketch)
    // 2. Extrude that sketch
    // 3. Fuse the extrusion with the original shape

    // Note: Replicad's sketchOnFace puts you in a sketching context on that face. 
    // If we just want to extrude the face itself, we might need to assume the face boundary is what we want.
    // .sketchOnFace() returns a Sketcher. 
    // We can assume we want to extrude the profile formed by the face.
    // However, sketchOnFace() starts a new sketch. Does it inherit the face boundary?
    // Usually sketchOnFace() is for *drawing* new things. 
    // To extrude the face itself, we typically want to use the face as a profile.

    // Let's assume for now we use the standard pattern:
    // const sk = shape.sketchOnFace(faceId);
    // const ext = sk.extrude(dist);
    // const result = shape.fuse(ext);

    return `
const ${sketchName} = ${targetName}.sketchOnFace(${faceId});
const ${extrusionName} = ${sketchName}.extrude(${distance});
const ${targetName}_fused = ${targetName}.fuse(${extrusionName});
`.trim();
};
