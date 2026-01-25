// Worker instance
let worker: Worker | null = null;
const pendingMessages = new Map<string, { resolve: (val: any) => void, reject: (err: any) => void }>();

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

export async function init() {
    if (worker) return;

    // Initialize worker
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = ({ data }) => {
        const { type, id, geometries, blob, error } = data;
        const pending = pendingMessages.get(id);

        if (pending) {
            if (type === 'SUCCESS') {
                pending.resolve(geometries || blob);
            } else {
                pending.reject(new Error(error));
            }
            pendingMessages.delete(id);
        }
    };
}

function postToWorker(type: string, code: string): Promise<any> {
    if (!worker) init();
    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substr(2, 9);
        pendingMessages.set(id, { resolve, reject });
        worker?.postMessage({ type, code, id });
    });
}

export function executeCode(code: string): Promise<GeometryResult[]> {
    return postToWorker('EXECUTE', code);
}

export function exportSTEP(code: string): Promise<Blob> {
    return postToWorker('EXPORT_STEP', code);
}

export function exportSTL(code: string): Promise<Blob> {
    return postToWorker('EXPORT_STL', code);
}
