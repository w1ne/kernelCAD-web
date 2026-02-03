import { ArrowUpFromLine } from 'lucide-react';
import { type Feature } from '../types';
import { CodeBuilder } from '../../lib/CodeBuilder';
import { type CodeGenerationContext } from '../../lib/codeGeneration';

export const ExtrudeFromFaceFeature: Feature = {
    id: 'extrudeFromFace',
    label: 'Extrude Face',
    icon: ArrowUpFromLine,
    description: 'Extrude a selected planar face by a specified distance',
    execute: ({ setActiveDialog, insertCode, codeContext }, params) => {
        if (params && typeof params.distance === 'number' && typeof params.faceId === 'number') {
            const { distance, faceId, shapeIndex } = params;

            // Resolve the actual variable name using the unified context
            const targetName = typeof shapeIndex === 'number'
                ? codeContext.getVariableAtIndex(shapeIndex)
                : null;

            // Extract plane data if provided (for detached fallback)
            let planeData: { origin: [number, number, number]; normal: [number, number, number] } | undefined;
            if (typeof params.originX === 'number') {
                planeData = {
                    origin: [params.originX, params.originY, params.originZ],
                    normal: [params.normalX, params.normalY, params.normalZ]
                };
            }

            const generatedCode = generateExtrudeFromFaceCode(codeContext, targetName, faceId, distance, planeData);
            insertCode(generatedCode);
            setActiveDialog(null);
        } else {
            setActiveDialog('extrudeFromFace');
        }
    }
};

export const generateExtrudeFromFaceCode = (
    context: CodeGenerationContext,
    targetName: string | null,
    faceId: number,
    distance: number,
    planeData?: { origin: [number, number, number]; normal: [number, number, number] }
): string => {
    const builder = new CodeBuilder();

    // Path A: Parametric (Linked to variable)
    if (targetName && targetName !== 'unknown' && targetName !== 'shape') {
        const sketchName = context.generateUniqueName(`${targetName}_sketch_${faceId}`);
        const extrusionName = context.generateUniqueName(`${targetName}_extrude_${faceId}`);
        const resultName = context.generateUniqueName(`${targetName}_fused`);

        builder.addStatement(`const ${sketchName} = sketchOnFace(${targetName}, ${faceId});`);
        builder.addStatement(`const ${extrusionName} = extrude(${sketchName}, ${distance});`);
        builder.addStatement(`const ${resultName} = ${targetName}.fuse(${extrusionName});`);

        return builder.toString();
    }

    // Path B: Detached (Anonymous shape)
    const sketchName = context.generateUniqueName(`sketch_face_${faceId}`);
    const extrusionName = context.generateUniqueName(`extrude_face_${faceId}`);

    const origin = planeData?.origin || [0, 0, 0];
    const normal = planeData?.normal || [0, 0, 1];

    builder.addStatement(`// NOTE: This extrusion is detached because the parent shape is anonymous.`);
    builder.addStatement(`const plane_${sketchName} = new replicad.Plane([${origin.join(', ')}], null, [${normal.join(', ')}]);`);
    builder.addStatement(`const ${sketchName} = new Sketcher(plane_${sketchName});`);
    builder.addStatement(`// DRAW HERE (e.g. ${sketchName}.rect(10, 10))`);
    builder.addComment(`Extruding the detached sketch`);
    builder.addStatement(`const ${extrusionName} = extrude(${sketchName}, ${distance});`);

    return builder.toString();
};
