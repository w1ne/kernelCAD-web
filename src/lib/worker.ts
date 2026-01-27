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

            // Track sketches created during execution
            const activeSketches: (replicad.Sketcher & { sketch?: { wire: replicad.Wire } })[] = [];
            const wrappedStartSketch = () => {
                const s = startSketch();
                activeSketches.push(s);
                return s;
            };

            // Create function with injected scope
            const func = new Function("replicad", "startSketch", "makeCompound", "fillet", "chamfer", code);
            const result = func(replicad, wrappedStartSketch, makeCompound, fillet, chamfer);

            // Normalize result
            const shapes = Array.isArray(result) ? result : [result];

            // Mesh the shapes
            const geometries = shapes.map((shape: replicad.Shape<any>) => {
                if (!shape || typeof shape.mesh !== "function") {
                    throw new Error("Result must be a Replicad Shape");
                }

                const faceGeometries = shape.faces.map((face: replicad.Face, index: number) => {
                    const mesh = face.mesh({ tolerance: 0.1, angularTolerance: 30 });

                    let plane;
                    try {
                        if ((face.geomType as any) === 'PLANE' || (face.geomType as any) === 'Planar') {
                            // Try common ways to get plane in Replicad
                            const p = (face as any).planarPlane || (face as any).plane;
                            if (p && p.origin && p.normal) {
                                plane = {
                                    origin: [p.origin.x, p.origin.y, p.origin.z] as [number, number, number],
                                    normal: [p.normal.x, p.normal.y, p.normal.z] as [number, number, number]
                                };
                            } else {
                                // Fallback to center and face normal if possible
                                const center = face.center;
                                const normal = face.normalAt();
                                if (center && normal) {
                                    plane = {
                                        origin: [center.x, center.y, center.z] as [number, number, number],
                                        normal: [normal.x, normal.y, normal.z] as [number, number, number]
                                    };
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Worker: Error detecting face plane", e);
                    }

                    return {
                        vertices: new Float32Array(mesh.vertices),
                        indices: new Uint32Array(mesh.triangles),
                        normals: new Float32Array(mesh.normals),
                        faceId: index,
                        plane
                    };
                });

                return {
                    faces: faceGeometries
                };
            });

            // Extract geometries for sketches
            const sketchGeometries = activeSketches.map((s, index) => {
                try {
                    // Try to get the wire from the sketcher
                    // Sketcher.sketch returns the Sketch object
                    // Sketch.wire returns the Wire object
                    const wire = s.sketch?.wire;
                    if (!wire) return null;
                    const mesh = wire.mesh({ tolerance: 0.1 });

                    return {
                        id: `sketch-${index}-${Date.now()}`,
                        name: `sketch${index + 1}`,
                        vertices: new Float32Array(mesh.vertices)
                    };
                } catch (e) {
                    console.warn("Failed to mesh sketch", e);
                    return null;
                }
            }).filter(Boolean);

            // Transfer buffers
            const transferables: Transferable[] = [];
            geometries.forEach((g) => {
                g.faces.forEach((f) => {
                    transferables.push(f.vertices.buffer, f.indices.buffer, f.normals.buffer);
                });
            });

            sketchGeometries.forEach((s) => {
                if (s) transferables.push(s.vertices.buffer);
            });

            self.postMessage({
                type: 'SUCCESS',
                id,
                geometries: {
                    geometries,
                    sketches: sketchGeometries
                }
            }, { transfer: transferables } as unknown as { transfer: Transferable[] });

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
