import * as replicad from "replicad";
import { setOC } from "replicad";
import { startSketch, makeCompound, fillet, chamfer, sketchOnFace, extrude } from "./geometryHelpers";
import { createSafeReplicad, SafeSketcher } from "./safeSketch";
import { type WorkerRequest, type WorkerResponse, WorkerRequestSchema } from "./workerTypes";

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

// Type-safe message handler
function postResponse(response: WorkerResponse, transfer?: Transferable[]) {
    if (transfer) {
        self.postMessage(response, { transfer } as unknown as { transfer: Transferable[] });
    } else {
        self.postMessage(response);
    }
}

self.onmessage = async ({ data: rawData }: { data: unknown }) => {
    let request: WorkerRequest;
    try {
        request = WorkerRequestSchema.parse(rawData);
    } catch (e) {
        console.error("Worker Protocol Violation:", e);
        const id = (rawData as any)?.id || 'unknown';
        postResponse({ type: 'ERROR', id, error: `Protocol Violation: ${e}` });
        return;
    }

    const { type, code, id } = request;

    if (type === 'EXECUTE') {
        try {
            await init();

            // Track sketches created during execution
            const activeSketches: any[] = [];

            // Create Safe Replicad Proxy using Factory and capture sketches
            const safeReplicad = createSafeReplicad(replicad, (sketch) => {
                activeSketches.push(sketch);
            });

            // We need to capture the underlying sketcher from the SafeSketcher if we want to extract check wire?
            // SafeSketcher wraps the real one. 
            // 'activeSketches' functionality relies on the object returned by 'startSketch'.
            // If startSketch returns SafeSketcher, can we mesh it?
            // SafeSketcher proxies methods, but does it expose 'sketch' property?
            // I need to add 'sketch' getter to SafeSketcher!

            // Helper to proxy objects and capture derived sketches
            const createCaptureProxy = (target: any): any => {
                if (typeof target !== 'object' || target === null) return target;

                return new Proxy(target, {
                    get: (obj, prop) => {
                        const value = (obj as any)[prop];
                        if (typeof value === 'function') {
                            return (...args: any[]) => {
                                const result = value.apply(obj, args);
                                // If result looks like a sketch/shape (has wire/mesh), capture it
                                if (result && typeof result === 'object') {
                                    // Check for wire or mesh capability to identify interesting objects
                                    // But avoid capturing generic objects or arrays unless they are shapes
                                    if ((result.wire || result.sketch?.wire || typeof result.mesh === 'function') && !activeSketches.includes(result)) {
                                        activeSketches.push(result);
                                        // Recursively proxy the result so we capture ITS children
                                        return createCaptureProxy(result);
                                    }
                                }
                                return result;
                            };
                        }
                        return value;
                    }
                });
            };

            const wrappedStartSketch = () => {
                const s = startSketch();
                const safeS = new SafeSketcher(s);
                activeSketches.push(safeS);
                return safeS;
            };

            const wrappedSketchOnFace = (shape: any, faceId: number) => {
                const s = sketchOnFace(shape, faceId);
                const safeS = new SafeSketcher(s);
                activeSketches.push(safeS);
                return safeS;
            };

            // Fix SafeSketcher to expose 'sketch' property (getter)
            // or modify activeSketches logic to unwrap.

            // Create function with injected scope
            const func = new Function("replicad", "startSketch", "makeCompound", "fillet", "chamfer", "sketchOnFace", "extrude", code);
            // Pass safeReplicad instead of replicad
            const result = func(safeReplicad, wrappedStartSketch, makeCompound, fillet, chamfer, wrappedSketchOnFace, extrude);

            // Normalize result
            const shapes = Array.isArray(result) ? result : [result];

            const geometries: any[] = [];
            const returnedSketches: any[] = [];

            shapes
                .filter((shape: any, index: number) => {
                    if (!shape || (typeof shape.mesh !== "function" && !shape.wire && !shape.sketch?.wire)) {
                        console.warn(`Worker: Invalid object at index ${index} - skipping mesh. Details:`, {
                            typeof: typeof shape,
                            keys: shape ? Object.keys(shape) : null,
                            constructor: shape?.constructor?.name
                        });
                        return false;
                    }
                    return true;
                })
                .forEach((shape: any, shapeIndex: number) => {
                    try {
                        // 1. Check for Faces (Solid Geometry)
                        if (shape.faces && shape.faces.length > 0) {
                            const faceGeometries = shape.faces.map((face: replicad.Face, index: number) => {
                                try {
                                    const mesh = face.mesh({ tolerance: 0.1, angularTolerance: 30 });

                                    let plane;
                                    try {
                                        if ((face.geomType as any) === 'PLANE' || (face.geomType as any) === 'Planar') {
                                            const p = (face as any).planarPlane || (face as any).plane;
                                            if (p && p.origin && p.normal) {
                                                plane = {
                                                    origin: [p.origin.x, p.origin.y, p.origin.z] as [number, number, number],
                                                    normal: [p.normal.x, p.normal.y, p.normal.z] as [number, number, number],
                                                    xDir: p.xDir ? [p.xDir.x, p.xDir.y, p.xDir.z] as [number, number, number] : undefined,
                                                    yDir: p.yDir ? [p.yDir.x, p.yDir.y, p.yDir.z] as [number, number, number] : undefined
                                                };
                                            } else {
                                                const center = face.center;
                                                const normal = face.normalAt();
                                                // For non-planar surfaces or fallback, we might not have a stable X-axis easily available
                                                // unless we compute it from UV derivatives.
                                                if (center && normal) {
                                                    plane = {
                                                        origin: [center.x, center.y, center.z] as [number, number, number],
                                                        normal: [normal.x, normal.y, normal.z] as [number, number, number]
                                                    };
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        // Silent warning for plane detection
                                    }

                                    return {
                                        vertices: new Float32Array(mesh.vertices),
                                        indices: new Uint32Array(mesh.triangles),
                                        normals: new Float32Array(mesh.normals),
                                        faceId: index,
                                        plane
                                    };
                                } catch (e) {
                                    console.warn(`Worker: Failed to mesh face ${index} of shape ${shapeIndex}`, e);
                                    return null;
                                }
                            }).filter((f: any) => f !== null);

                            if (faceGeometries.length > 0) {
                                geometries.push({
                                    faces: faceGeometries
                                });
                            }
                        }

                        // 2. Check for Wire (Sketch Geometry) in the returned shapes
                        // Use try-catch for property access as Replicad objects can throw on property access if invalid
                        try {
                            const wire = shape.wire || shape.sketch?.wire;
                            if (wire) {
                                const mesh = wire.mesh({ tolerance: 0.1 });
                                returnedSketches.push({
                                    id: `return-sketch-${shapeIndex}-${Date.now()}`,
                                    name: `sketch_ret_${shapeIndex + 1}`,
                                    vertices: new Float32Array(mesh.vertices)
                                });
                            }
                        } catch (e) {
                            console.warn(`Worker: Failed to extract/mesh wire for shape ${shapeIndex}`, e);
                        }
                    } catch (e) {
                        console.error(`Worker: Critical error processing shape ${shapeIndex}`, e);
                    }
                });

            // Extract geometries for sketches from activeSketches tracker
            const trackedSketches = activeSketches.map((s, index) => {
                try {
                    // Try to get wire from SafeSketcher or original
                    const wire = (s as any).wire || (s as any).sketch?.wire || (s as any).sketcher?.sketch?.wire;

                    if (!wire) {
                        return null;
                    }
                    const mesh = wire.mesh({ tolerance: 0.1 });

                    return {
                        id: `sketch-${index}-${Date.now()}`,
                        name: `sketch${index + 1}`,
                        vertices: new Float32Array(mesh.vertices)
                    };
                } catch (e) {
                    console.warn("Failed to mesh tracked sketch", e);
                    return null;
                }
            }).filter((s): s is NonNullable<typeof s> => s !== null);

            // Combine and deduplicate sketches by comparing vertex count and first vertex
            // (Simple heuristic to avoid double-rendering same sketches from return and tracker)
            const allSketchesMap = new Map<string, any>();

            [...returnedSketches, ...trackedSketches].forEach(s => {
                const fingerprint = `${s.vertices.length}-${s.vertices[0]}-${s.vertices[1]}`;
                if (!allSketchesMap.has(fingerprint)) {
                    allSketchesMap.set(fingerprint, s);
                }
            });

            const allSketches = Array.from(allSketchesMap.values());

            // Transfer buffers
            const transferables: Transferable[] = [];
            geometries.forEach((g: any) => {
                g.faces.forEach((f: any) => {
                    transferables.push(f.vertices.buffer, f.indices.buffer, f.normals.buffer);
                });
            });

            allSketches.forEach((s) => {
                if (s) transferables.push(s.vertices.buffer);
            });

            postResponse({
                type: 'SUCCESS',
                id,
                geometries: {
                    geometries,
                    sketches: allSketches
                }
            }, transferables);

        } catch (error) {
            postResponse({ type: 'ERROR', id, error: String(error) });
        }
    } else if (type === 'EXPORT_STEP' || type === 'EXPORT_STL') {
        try {
            await init();
            // Export usually doesn't need helpers injected into the function if the code is just the user code, 
            // but the user code might USE helpers, so we MUST inject them.
            // The function signature in 'EXECUTE' was ("replicad", "startSketch"...) 
            // The user code string is the body.
            const func = new Function("replicad", "startSketch", "makeCompound", "fillet", "chamfer", "sketchOnFace", "extrude", code);
            const result = func(replicad, startSketch, makeCompound, fillet, chamfer, sketchOnFace, extrude);

            const shape = Array.isArray(result) ? result[0] : result;
            if (!shape) throw new Error("No shape returned");

            let blob;
            if (type === 'EXPORT_STEP') {
                blob = shape.blobSTEP();
            } else {
                blob = shape.blobSTL();
            }

            postResponse({ type: 'SUCCESS', id, blob });
        } catch (error) {
            postResponse({ type: 'ERROR', id, error: String(error) });
        }
    }
};
