import * as replicad from 'replicad';
import { setOC } from 'replicad';
import opencascade from 'replicad-opencascadejs';
import { startSketch, makeCompound, fillet, chamfer, sketchOnFace, extrude } from '../lib/geometryHelpers';
import { createSafeReplicad } from '../lib/safeSketch';

// Initialize Replicad in Node environment
let isInitialized = false;
export async function initReplicad() {
    if (isInitialized) return;
    const OC = await opencascade();
    setOC(OC);
    isInitialized = true;
}

// Mimic Worker Execution Logic
export function executeGeometry(code: string) {
    if (!isInitialized) throw new Error("Replicad not initialized");

    const safeReplicad = createSafeReplicad(replicad);

    const activeSketches: any[] = [];
    const wrappedStartSketch = () => {
        const s = startSketch();
        activeSketches.push(s);
        return s;
    };
    const wrappedSketchOnFace = (shape: any, faceId: number) => {
        const s = sketchOnFace(shape, faceId);
        activeSketches.push(s);
        return s;
    };

    const { Sketcher } = safeReplicad;

    const func = new Function(
        "replicad", "Sketcher", "startSketch", "makeCompound", "fillet", "chamfer", "sketchOnFace", "extrude",
        code
    );

    const result = func(
        safeReplicad, Sketcher, wrappedStartSketch, makeCompound, fillet, chamfer, wrappedSketchOnFace, extrude
    );

    const shapes = Array.isArray(result) ? result : [result];
    if (shapes.length === 0 || !shapes[0]) throw new Error("No shape returned");

    return shapes[0]; // Return first shape for validation
}
