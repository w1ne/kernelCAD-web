import type { SketchGeometry } from './geometryEngine';
import { getSketchVariablesAST, getReturnedVariables } from './ast';

/**
 * Remaps sketch IDs to meaningful variable names from user code.
 * 
 * The worker assigns temporary IDs like:
 * - `sketch-${index}-seq-${n}` for tracked sketches (from startSketch/sketchOnFace)
 * - `return-sketch-${index}-seq-${n}` for returned sketches (wires of returned shapes)
 * 
 * This function maps those temporary IDs to the actual variable names from the code.
 */
export function remapSketchNames(
    sketches: SketchGeometry[],
    code: string
): SketchGeometry[] {
    const sketchVarNames = (() => {
        try {
            return getSketchVariablesAST(code);
        } catch {
            return [];
        }
    })();

    const returnedVarNames = (() => {
        try {
            return getReturnedVariables(code);
        } catch {
            return [];
        }
    })();

    return sketches.map((s) => {
        // Path A: Tracked sketches (from startSketch/sketchOnFace variables)
        const mTracked = /^sketch-(\d+)(?:-|$)/.exec(s.id);
        if (mTracked) {
            const idx = Number(mTracked[1]);
            const name = sketchVarNames[idx];
            if (name) return { ...s, name };
        }

        // Path B: Returned sketches (wires of returned shapes)
        const mReturned = /^return-sketch-(\d+)(?:-|$)/.exec(s.id);
        if (mReturned) {
            const idx = Number(mReturned[1]);
            const name = returnedVarNames[idx];
            if (name) return { ...s, name };
        }

        return s;
    });
}
