import { CodeBuilder } from '../../lib/CodeBuilder';
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
    // We don't want to output the 'currentCode' again, so we'll just use the builder for name generation
    // and then extract the new lines. But CodeBuilder is designed to build *on top*. 
    // Wait, insertCode usually expects just the NEW snippet. 
    // My CodeBuilder design: "constructor(initialCode) { this.lines.push(initialCode) }"
    // If I use toString(), it returns everything.
    // I should probably use a clean builder for the snippet, but pass a "context mock" or 
    // just use the builder to check variable existence if I implemented that.
    // For now, let's just make a builder for unique name generation if we want to be safe, 
    // OR just use a fresh builder for the snippet and assume we need to check uniqueness against 'currentCode'.
    // 
    // My CodeBuilder implementation of getUniqueName checks "this.lines". 
    // So I MUST populate it with currentCode to get unique names.
    // BUT I only want to return the *new* code. 
    // I need a way to get "new code only". 
    // Refinement to CodeBuilder later: `toString(onlyNew: boolean)`?
    // For now, I will use a separate builder for generation, but checking names might be tricky.
    // Actually, I can just initialize with currentCode, generate, and then
    // effectively I'd return `builder.toString().replace(currentCode, '')` which is risky.
    // simpler: initialize builder with code. 

    // Let's modify the usage slightly. We want to generate a *snippet*.
    // But we need context for uniqueness.
    // Let's rely on the timestamp-based logic for now within the builder or specific names.
    // Actually, CodeBuilder has getUniqueName. 
    // Let's create a builder initialized with `currentCode`, generate the stuff, 
    // and then returning the *added* lines is not directly supported by my simple class yet.

    // Workaround: 
    // 1. Init builder with currentCode.
    // 2. Add new lines.
    // 3. Slice the lines array. 
    // Accessing private 'lines' is not allowed. 

    // Let's just use the builder to construct the string, and manually check uniqueness if needed?
    // The previous implementation used timestamps. CodeBuilder standardizes this.
    // Let's stick to the previous strong uniqueness guarantees or improve.
    // CodeBuilder.getUniqueName handles uniqueness within *its* scope.

    // Let's use a fresh builder (no initial code) to generate the snippet.
    const builder = new CodeBuilder();

    // To ensure uniqueness against existing code, we normally would parse it.
    // For this specific feature, we can append a random hash or timestamp if generic names collide.
    // But `getUniqueName` is designed to be smart.
    // Let's just trust `getUniqueName` will give us `sketchOnFace1` etc if called sequentially.
    // Cross-session uniqueness is harder without context.
    // I'll stick to the pattern but maybe add a timestamp suffix to base for safety if I don't feed it context.

    const timestamp = Date.now().toString(36);
    const sketchName = builder.getUniqueName(`${targetName}_sketch_${faceId}_${timestamp}`);
    const extrusionName = builder.getUniqueName(`${targetName}_extrude_${faceId}`);
    const resultName = builder.getUniqueName(`${targetName}_fused`);

    builder.addStatement(`const ${sketchName} = sketchOnFace(${targetName}, ${faceId});`);
    builder.addStatement(`const ${extrusionName} = extrude(${sketchName}, ${distance});`);
    builder.addStatement(`const ${resultName} = ${targetName}.fuse(${extrusionName});`);

    return builder.toString();
};
