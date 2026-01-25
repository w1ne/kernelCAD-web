import * as replicad from "replicad";

export const defaultCode = `
// You can use standard Replicad API here.
// The variable 'replicad' is available in the scope.
// You must return a Shape or an array of Shapes.

const { Sketcher } = replicad;

function drawPart() {
  const base = new Sketcher()
    .hLine(20)
    .vLine(20)
    .hLine(-20)
    .close()
    .extrude(10);
    
  return base;
}

return drawPart();
`;

export type GeometryResult = {
    vertices: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
};

export async function init() {
    // Replicad lazy loads WASM. We might want to warm it up.
    // Try to create a dummy sketch
    try {
        new replicad.Sketcher();
        // If this doesn't throw, we are good? 
        // Actually, some ops trigger the load.
    } catch (e) {
        console.error("Replicad init error", e);
    }
}

export function executeCode(code: string): Promise<GeometryResult[]> {
    return new Promise((resolve, reject) => {
        try {
            // Create a function from the user code
            // "replicad" is injected
            const func = new Function("replicad", code);

            const result = func(replicad);

            // Normalize result to array
            const shapes = Array.isArray(result) ? result : [result];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const geometries: GeometryResult[] = shapes.map((shape: any) => {
                if (!shape || typeof shape.mesh !== "function") {
                    throw new Error("Result must be a Replicad Shape");
                }

                const mesh = shape.mesh({ tolerance: 0.1, angularTolerance: 30 });
                return {
                    vertices: mesh.vertices,
                    indices: mesh.triangles,
                    normals: mesh.normals
                };
            });

            resolve(geometries);
        } catch (err) {
            reject(err);
        }
    });
}
