import * as replicad from "replicad";
import { setOC } from "replicad";
import { startSketch, makeCompound, fillet, chamfer } from "./geometryHelpers";

let isInitialized = false;

async function init() {
    if (isInitialized) return;

    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const opencascade = (await import("replicad-opencascadejs")).default;

        let OC;
        if (typeof self !== "undefined" && import.meta.env) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            OC = await opencascade({
                locateFile: () => (import.meta.env.BASE_URL + "opencascade.wasm").replace("//", "/"),
            });
        } else {
            OC = await opencascade();
        }

        setOC(OC);
        isInitialized = true;
        console.log("Worker: Replicad initialized");
    } catch (e) {
        console.error("Worker: Init error", e);
        throw e;
    }
}

self.onmessage = async ({ data }) => {
    const { type, code, id } = data;

    if (type === 'EXECUTE') {
        try {
            await init();

            // Create function with injected scope
            const func = new Function("replicad", "startSketch", "makeCompound", "fillet", "chamfer", code);
            const result = func(replicad, startSketch, makeCompound, fillet, chamfer);

            // Normalize result
            const shapes = Array.isArray(result) ? result : [result];

            // Mesh the shapes
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const geometries = shapes.map((shape: any) => {
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

            // Transfer buffers to avoid copy
            const transferables: Transferable[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            geometries.forEach((g: any) => {
                transferables.push(g.vertices.buffer, g.indices.buffer, g.normals.buffer);
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            self.postMessage({ type: 'SUCCESS', id, geometries }, { transfer: transferables } as any);

        } catch (error) {
            self.postMessage({ type: 'ERROR', id, error: String(error) });
        }
    } else if (type === 'EXPORT_STEP' || type === 'EXPORT_STL') {
        try {
            await init();
            // Export usually doesn't need helpers injected into the function if the code is just the user code, 
            // but the user code might USE helpers, so we MUST inject them.
            // The function signature in 'EXECUTE' was ("replicad", "startSketch"...) 
            // The user code string is the body.
            const func = new Function("replicad", "startSketch", "makeCompound", "fillet", "chamfer", code);
            const result = func(replicad, startSketch, makeCompound, fillet, chamfer);

            const shape = Array.isArray(result) ? result[0] : result;
            if (!shape) throw new Error("No shape returned");

            let blob;
            if (type === 'EXPORT_STEP') {
                blob = shape.blobSTEP();
            } else {
                blob = shape.blobSTL();
            }

            self.postMessage({ type: 'SUCCESS', id, blob });
        } catch (error) {
            self.postMessage({ type: 'ERROR', id, error: String(error) });
        }
    }
};
