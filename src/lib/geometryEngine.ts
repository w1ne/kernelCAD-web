import * as replicad from "replicad";
import { startSketch, makeCompound, fillet, chamfer } from "./geometryHelpers";

export const defaultCode = `
// You can use standard Replicad API here.
// The variable 'replicad' is available in the scope.
// Helpers available: startSketch(), makeCompound(), fillet(), chamfer()
// You must return a Shape or an array of Shapes.

const { Sketcher } = replicad;

function drawPart() {
  const base = new Sketcher()
    .hLine(40)
    .vLine(40)
    .hLine(-40)
    .close()
    .extrude(20);

  // Apply a fillet to all edges
  const filleted = base.fillet(2);

  // Create a cylinder using standard API
  const cyl = replicad.makeCylinder(10, 30).translate(0, 0, 10);

  // Cut the cylinder from the base
  return filleted.cut(cyl);
}

return drawPart();
`;

export type GeometryResult = {
    vertices: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
};

import { setOC } from "replicad";

let isInitialized = false;

export async function init() {
    if (isInitialized) return;

    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const opencascade = (await import("replicad-opencascadejs")).default;

        let OC;
        // Check if running in browser with Vite
        if (typeof window !== "undefined" && import.meta.env) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            OC = await opencascade({
                locateFile: () => (import.meta.env.BASE_URL + "opencascade.wasm").replace("//", "/"),
            });
        } else {
            // Node.js / Test environment
            // In Node, replicad-opencascadejs usually finds the wasm itself or doesn't need locateFile
            OC = await opencascade();
        }

        setOC(OC);
        isInitialized = true;
        console.log("Replicad initialized successfully");
    } catch (e) {
        console.error("Replicad init error", e);
        throw e;
    }
}

export function executeCode(code: string): Promise<GeometryResult[]> {
    return new Promise((resolve, reject) => {
        try {
            // Create a function from the user code
            // "replicad" is injected
            // We also inject common helpers for convenience
            const func = new Function("replicad", "startSketch", "makeCompound", "fillet", "chamfer", code);

            const result = func(replicad, startSketch, makeCompound, fillet, chamfer);

            // Normalize result to array
            const shapes = Array.isArray(result) ? result : [result];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const geometries: GeometryResult[] = shapes.map((shape: any) => {
                if (!shape || typeof shape.mesh !== "function") {
                    throw new Error("Result must be a Replicad Shape");
                }

                const mesh = shape.mesh({ tolerance: 0.1, angularTolerance: 30 });
                return {
                    vertices: new Float32Array(mesh.vertices),
                    indices: new Uint32Array(mesh.triangles),
                    normals: new Float32Array(mesh.normals)
                };
            });

            resolve(geometries);
        } catch (err) {
            reject(err);
        }
    });
}


