import { MousePointer2 } from 'lucide-react';
import { type Feature } from '../types';
import { type CodeGenerationContext } from '../../lib/codeGeneration';

export const SketchOnFaceFeature: Feature = {
    id: 'sketchOnFace',
    label: 'Sketch on Face',
    icon: MousePointer2,
    description: 'Start a new sketch on the selected planar face',
    execute: (context) => {
        context.setActiveDialog('sketchOnFace');
    }
};

export const generateSketchOnFaceCode = (
    context: CodeGenerationContext,
    targetName: string | null,
    faceId: number,
    sketchNameBase: string,
    planeData?: { origin: [number, number, number]; normal: [number, number, number]; xDir?: [number, number, number] }
): string => {
    // If we have a target variable name, we can do parametric sketchOnFace
    if (targetName && targetName !== 'unknown' && targetName !== 'shape') {
        const sketchName = context.generateUniqueName(sketchNameBase);
        const planeName = context.generateUniqueName(`plane_${sketchNameBase}`);
        const faceVar = context.generateUniqueName(`face_${sketchNameBase}`);

        // Use the correct Replicad API for creating a plane from a face
        return `
const ${faceVar} = ${targetName}.faces[${faceId}];
const ${planeName} = replicad.makePlaneFromFace(${faceVar});
const ${sketchName} = new Sketcher(${planeName});
`.trim();
    }

    // Fallback: Detached Sketch (Path B)
    // Used for anonymous shapes (e.g. return [box.cut(cyl)])
    const sketchName = context.generateUniqueName(sketchNameBase);
    const origin = planeData?.origin || [0, 0, 0];
    const normal = planeData?.normal || [0, 0, 1];
    const xDir = planeData?.xDir;
    const xDirArg = xDir ? `[${xDir[0]}, ${xDir[1]}, ${xDir[2]}]` : 'null';

    return `
// NOTE: This sketch is detached because the parent shape is anonymous (no variable name).
const plane_${sketchName} = new replicad.Plane([${origin.join(', ')}], ${xDirArg}, [${normal.join(', ')}]);
const ${sketchName} = new Sketcher(plane_${sketchName});
`.trim();
};
