import * as replicad from 'replicad';
import { setOC } from 'replicad';
import opencascade from 'replicad-opencascadejs';
import { startSketch, makeCompound, fillet, chamfer, sketchOnFace, extrude, findPlanarFace } from '../lib/geometryHelpers';
import { createSafeReplicad, SafeSketcher } from '../lib/safeSketch';

const DEBUG = process.env.KERNELCAD_TEST_LOG === '1';

function log(...args: unknown[]) {
    if (DEBUG) console.log(...args);
}

function logError(...args: unknown[]) {
    if (DEBUG) console.error(...args);
}

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

    const activeSketches: unknown[] = [];

    // Use the factory to create SafeReplicad and spy on sketches
    const safeReplicad = createSafeReplicad(replicad, (sketch) => {
        activeSketches.push(sketch);
    });

    const wrappedStartSketch = () => {
        log("Helper: startSketch called");
        const s = startSketch();
        activeSketches.push(s);
        return s;
    };

    const wrappedSketchOnFace = (shape: unknown, faceId: number) => {
        log(`Helper: sketchOnFace called for face ${faceId}`);
        const s = sketchOnFace(shape, faceId);
        // User expects API with .circle(), so we must wrap it if it's a Sketcher
        // sketchOnFace returns a Sketcher (native replicad object)
        const safeS = new SafeSketcher(s);
        activeSketches.push(safeS);
        return safeS;
    };

    const func = new Function(
        "replicad", "startSketch", "makeCompound", "fillet", "chamfer", "sketchOnFace", "extrude", "findPlanarFace",
        `try { 
            ${code} 
        } catch (e) {
            throw e;
        }`
    );

    log("Executing workflow code...");
    const result = func(
        safeReplicad, wrappedStartSketch, makeCompound, fillet, chamfer, wrappedSketchOnFace, extrude, findPlanarFace
    );
    log("Workflow code executed. Result:", typeof result);

    const shapes = Array.isArray(result) ? result : [result];
    if (shapes.length === 0 || !shapes[0]) throw new Error("No shape returned");

    // Inspect shape structure for volume
    try {
        if ((shapes[0] as { volume?: unknown }).volume) log("Shape has volume property");
        else log("Shape volume property missing. Keys:", Object.keys(shapes[0] as object));
    } catch (e) { logError("Error checking shape keys", e); }


    return {
        shape: shapes[0],
        sketches: activeSketches
    };
}
