// @vitest-environment node
import { describe, it, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { setOC } from 'replicad';
import opencascade from 'replicad-opencascadejs';
import { startSketch, makeCompound, fillet, chamfer, sketchOnFace, extrude } from '../lib/geometryHelpers';
import { createSafeReplicad } from '../lib/safeSketch';
import { expectGeometryMatch } from '../test/geometryValidators';

// Initialize Replicad in Node environment
let isInitialized = false;
async function initReplicad() {
    if (isInitialized) return;
    const OC = await opencascade();
    setOC(OC);
    isInitialized = true;
}

// Mimic Worker Execution Logic
function executeGeometry(code: string) {
    if (!isInitialized) throw new Error("Replicad not initialized");

    const safeReplicad = createSafeReplicad(replicad);

    // Mock active sketches tracking if needed, or just pass simple wrappers
    // For regression tests, we care about the final shape, so simple wrappers suffice for now
    // unless the code explicitly depends on the side effects (which it shouldn't for pure geometry)

    // We need to replicate the wrappers if they modify behavior.
    // worker.ts wrappers:
    // - wrappedStartSketch: calls startSketch(), pushes to list
    // - wrappedSketchOnFace: calls sketchOnFace(), pushes to list

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

    const func = new Function(
        "replicad", "startSketch", "makeCompound", "fillet", "chamfer", "sketchOnFace", "extrude",
        code
    );

    const result = func(
        safeReplicad, wrappedStartSketch, makeCompound, fillet, chamfer, wrappedSketchOnFace, extrude
    );

    const shapes = Array.isArray(result) ? result : [result];
    if (shapes.length === 0 || !shapes[0]) throw new Error("No shape returned");

    return shapes[0]; // Return first shape for validation
}

describe('Geometry Regression Suite', () => {
    beforeAll(async () => {
        await initReplicad();
    });

    describe('Primitives', () => {
        it('should create a Cylinder', () => {
            const code = `
                const { makeCylinder } = replicad;
                const cyl = makeCylinder(10, 10);
                return cyl;
            `;
            const shape = executeGeometry(code);
            expectGeometryMatch({ volume: shape.volume }, { volume: Math.PI * 100 * 10 });
        });
    });

    describe('Complex Operations', () => {
        it('should perform boolean transformations', () => {
            // Translate and Fuse
            const code = `
                const { makeCylinder } = replicad;
                const c1 = makeCylinder(5, 10);
                const c2 = makeCylinder(5, 10).translate(0, 0, 10);
                const fused = c1.fuse(c2);
                return fused;
             `;
            const shape = executeGeometry(code);
            // Two stacked cylinders. Total height 20.
            // Vol = PI * 25 * 20
            expectGeometryMatch({ volume: shape.volume }, { volume: Math.PI * 25 * 20 });
        });
    });

    describe('Robustness', () => {
        it('should handle boolean cut', () => {
            const code = `
                 const { makeCylinder } = replicad;
                 const base = makeCylinder(10, 10);
                 const tool = makeCylinder(5, 20).translate(0, 0, -5);
                 const result = base.cut(tool);
                 return result;
            `;
            const shape = executeGeometry(code);
            // Vol = Base - Hole
            expectGeometryMatch({ volume: shape.volume }, { volume: Math.PI * 100 * 10 - Math.PI * 25 * 10 });
        });
    });
});
