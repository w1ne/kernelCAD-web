// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { ArrowUpFromLine } from 'lucide-react';
import { type Feature } from '../types';
import { CodeBuilder } from '../../../shared/codeGeneration/CodeBuilder';
import { type CodeGenerationContext } from '../../../shared/codeGeneration/index';
import { insertStatementsAndReplaceReturnAtIndex, promoteReturnExpressionAtIndexToVariable } from '../../../shared/codeGeneration/ast';

interface ExtrudeParams {
    distance: number;
    faceId: number;
    shapeIndex?: number;
}

export const ExtrudeFromFaceFeature: Feature<ExtrudeParams> = {
    id: 'extrudeFromFace',
    label: 'Extrude Face',
    icon: ArrowUpFromLine,
    description: 'Extrude a selected planar face by a specified distance',
    execute: (context, params) => {
        if (params && typeof params.distance === 'number' && typeof params.faceId === 'number') {
            const { distance, faceId, shapeIndex } = params;

            // Resolve the actual variable name using the unified context
            const targetName = typeof shapeIndex === 'number'
                ? context.codeContext.getVariableAtIndex(shapeIndex)
                : null;

            // Prefer rewriting code to (1) name anonymous returns, and (2) replace the
            // selected shape in the return list with the fused result (no duplicates).
            const idx = typeof shapeIndex === 'number' ? shapeIndex : 0;
            let workingCode = context.code;
            let resolvedTarget = targetName;

            if (!resolvedTarget) {
                const generatedBase = context.codeContext.generateUniqueName('shape');
                try {
                    workingCode = promoteReturnExpressionAtIndexToVariable(workingCode, idx, generatedBase);
                    resolvedTarget = generatedBase;
                } catch {
                    resolvedTarget = null;
                }
            }

            if (resolvedTarget) {
                const faceName = context.codeContext.generateUniqueName(`${resolvedTarget}_face_${faceId}`);
                const extrusionName = context.codeContext.generateUniqueName(`${resolvedTarget}_extrude_${faceId}`);
                const resultName = context.codeContext.generateUniqueName(`${resolvedTarget}_fused`);

                const statements = [
                    `const ${faceName} = ${resolvedTarget}.faces[${faceId}];`,
                    `const ${extrusionName} = extrude(${faceName}, ${distance});`,
                    `const ${resultName} = ${resolvedTarget}.fuse(${extrusionName});`,
                ].join('\n');

                try {
                    const next = insertStatementsAndReplaceReturnAtIndex(workingCode, statements, idx, resultName);
                    context.mutateCode(() => next, 'extrudeFromFace.rewrite');
                    context.closePanel('extrudeFromFace');
                    return;
                } catch {
                    // Fallback to snippet insertion below.
                }
            }

            // Fallback: insert a snippet without mutating existing return structure.
            const generatedCode = generateExtrudeFromFaceCode(context.codeContext, resolvedTarget, faceId, distance);
            context.insertCode(generatedCode);
            context.closePanel('extrudeFromFace');
        } else {
            context.openPanel('extrudeFromFace');
        }
    }
};

export const generateExtrudeFromFaceCode = (
    context: CodeGenerationContext,
    targetName: string | null,
    faceId: number,
    distance: number,
): string => {
    const builder = new CodeBuilder();

    if (!targetName) {
        builder.addStatement(`// Cannot extrude from face: the selected shape is anonymous in the return statement.`);
        builder.addStatement(`// Assign it to a variable first (e.g. "const part = ...; return part;") and try again.`);
        return builder.toString();
    }

    const faceName = context.generateUniqueName(`${targetName}_face_${faceId}`);
    const extrusionName = context.generateUniqueName(`${targetName}_extrude_${faceId}`);
    const resultName = context.generateUniqueName(`${targetName}_fused`);

    builder.addStatement(`const ${faceName} = ${targetName}.faces[${faceId}];`);
    builder.addStatement(`const ${extrusionName} = extrude(${faceName}, ${distance});`);
    builder.addStatement(`const ${resultName} = ${targetName}.fuse(${extrusionName});`);

    return builder.toString();
};
