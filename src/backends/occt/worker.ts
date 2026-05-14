import * as replicad from 'replicad';
import { setOC } from 'replicad';
import wasmUrl from 'replicad-opencascadejs/src/replicad_single.wasm?url';
import { chamfer, extrude, fillet, makeCompound, sketchOnFace } from '../../lib/geometryHelpers';
import { createSafeReplicad, SafeSketcher } from '../../lib/safeSketch';
import { withTemporaryGlobals } from '../../lib/withTemporaryGlobals';
import { createUserGlobals } from '../../lib/userGlobals';
import { createV01ApiGlobals, unwrapV01Shape } from '../../lib/v01ApiShim';
import {
  type ExecutionResult,
  type GeometryResult,
  type SketchGeometry,
  type WorkerRequest,
  type WorkerResponse,
  WorkerRequestSchema,
} from '../../lib/workerTypes';
import { meshShape, meshWireToSketch, getWire, isRecord, getFn } from './meshing';

const DEBUG = false;

function getString(obj: unknown, key: string): string | null {
  if (!isRecord(obj)) return null;
  const val = obj[key];
  return typeof val === 'string' ? val : null;
}

let isInitialized = false;
let executionLock = Promise.resolve();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let OC: any = null;

async function init() {
  if (isInitialized) return;

  try {
    const mod = (await import('replicad-opencascadejs')) as unknown as {
      default: (opts?: unknown) => Promise<unknown>;
    };
    const opencascade = mod.default;

    if (DEBUG) console.log('Worker: Initializing OpenCascade...');

    OC = await opencascade({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          if (DEBUG) console.log(`Worker: Locating ${file} -> ${wasmUrl}`);
          return wasmUrl;
        }
        return file;
      },
    });

    setOC(OC);
    isInitialized = true;
    if (DEBUG) console.log('Worker: OpenCascade initialized successfully');
  } catch (err) {
    console.error('Worker: Failed to initialize OpenCascade:', err);
    throw err;
  }
}

function postResponse(response: WorkerResponse, transfer?: Transferable[]) {
  if (transfer) self.postMessage(response, { transfer } as unknown as { transfer: Transferable[] });
  else self.postMessage(response);
}

self.onmessage = (e: MessageEvent<unknown>) => {
  const rawData = e.data;

  // Queue all incoming messages to process them sequentially
  executionLock = executionLock.then(async () => {
    let request: WorkerRequest;
    try {
      request = WorkerRequestSchema.parse(rawData);
    } catch (err: unknown) {
      const id = getString(rawData, 'id') ?? 'unknown';
      postResponse({ type: 'ERROR', id, error: `Protocol Violation: ${String(err)}` });
      return;
    }

    const { type, id } = request;

    if (type === 'INIT') {
      try {
        await init();
        postResponse({ type: 'SUCCESS', id });
      } catch (error: unknown) {
        postResponse({ type: 'ERROR', id, error: String(error) });
      }
      return;
    }

    if (type === 'EXECUTE') {
      try {
        await init();
        const code = request.code;
        if (DEBUG) console.log(`Worker: Executing code: ${code.substring(0, 100)}...`);

        const activeSketches: SafeSketcher[] = [];
        const safeReplicad = createSafeReplicad(replicad, (sketch) => activeSketches.push(sketch));

        const wrappedStartSketch = () => {
          const SketcherCtor = (safeReplicad as unknown as { Sketcher: new (plane?: unknown) => SafeSketcher }).Sketcher;
          return new SketcherCtor();
        };

        const wrappedSketchOnFace = (shape: unknown, faceId: number) => {
          const native = getFn(shape, 'sketchOnFace');
          const sketcher = native ? native.call(shape, faceId) : sketchOnFace(shape, faceId);
          const safeSketch = new SafeSketcher(sketcher);
          activeSketches.push(safeSketch);
          return safeSketch;
        };

        const userGlobals = createUserGlobals(
          safeReplicad as unknown as { Sketcher: new (plane?: unknown) => SafeSketcher },
        );

        // v0.1 API globals: `param`, `box`, `cylinder`, `sphere`. The shim
        // returns Replicad-shape proxies that expose v0.1's `subtract`/
        // `union`/`intersect`/`translate` while still supporting the worker's
        // existing mesh / blob extraction paths.
        const v01Api = createV01ApiGlobals(replicad);

        const func = new Function(
          'replicad',
          'startSketch',
          'makeCompound',
          'fillet',
          'chamfer',
          'sketchOnFace',
          'extrude',
          'param',
          'box',
          'cylinder',
          'sphere',
          code,
        ) as unknown as (...args: unknown[]) => unknown;

        const result = withTemporaryGlobals(
          {
            // Convenience globals for generated snippets and common user code.
            // Safe per-execution: restored after this run to avoid leaking callbacks/closures.
            ...userGlobals,
            ...v01Api,
          },
          () =>
            func(
              safeReplicad,
              wrappedStartSketch,
              makeCompound,
              fillet,
              chamfer,
              wrappedSketchOnFace,
              extrude,
              v01Api.param,
              v01Api.box,
              v01Api.cylinder,
              v01Api.sphere,
            ),
        );
        const shapes = (Array.isArray(result) ? result : [result])
          .map(unwrapV01Shape)
          .filter(Boolean);

        const geometries: GeometryResult[] = [];
        const returnedSketches: SketchGeometry[] = [];
        let returnedSketchSeq = 0;

        shapes.forEach((shape, shapeIndex) => {
          try {
            if (DEBUG) console.log(`Worker: Processing shape ${shapeIndex}...`);
            if (!isRecord(shape)) {
              if (DEBUG) console.log(`Worker: Shape ${shapeIndex} is not a record:`, typeof shape);
              return;
            }

            const result = meshShape(shape);
            if (result) {
              if (DEBUG) console.log(`Worker: Shape ${shapeIndex} successfully meshed. Vol: ${result.volume}, Edges: ${result.edges?.length ? (result.edges.length / 3) + ' pts' : 'none'}`);
              geometries.push(result);
            } else {
              const isDeletedShape = isRecord(shape) && shape.isDeleted;
              console.warn(
                isDeletedShape
                  ? `Worker: Shape ${shapeIndex} is marked as deleted!`
                  : `Worker: Shape ${shapeIndex} has no valid face geometries`
              );
            }

            const wire = getWire(shape);
            if (wire) {
              if (DEBUG) console.log(`Worker: Shape ${shapeIndex} has wire, meshing to sketch...`);
              try {
                const sketchId = `return-sketch-${shapeIndex}-seq-${returnedSketchSeq++}`;
                const sketch = meshWireToSketch(wire, sketchId, `sketch_ret_${shapeIndex + 1}`);
                if (sketch) returnedSketches.push(sketch);
              } catch (e) { console.warn(`Worker: Failed to mesh wire of shape ${shapeIndex}`, e); }
            }
          } catch (err) {
            console.error(`Worker: Fatal error processing shape ${shapeIndex}:`, err);
          }
        });

        let trackedSketchSeq = 0;
        const trackedSketches = activeSketches
          .map((s, index) => {
            try {
              const sketchObj = s.sketch;
              const wire = getWire(sketchObj) ?? getWire(s as unknown);
              if (!wire) return null;
              const sketchId = `sketch-${index}-seq-${trackedSketchSeq++}`;
              return meshWireToSketch(wire, sketchId, `sketch${index + 1}`);
            } catch (e) {
              console.warn(`Worker: Failed to track sketch ${index}:`, e);
              return null;
            }
          })
          .filter((s): s is SketchGeometry => s !== null);

        const allSketchesByFingerprint = new Map<string, SketchGeometry>();
        [...returnedSketches, ...trackedSketches].forEach((s) => {
          // Deduplicate sketches defensively (same sketch can be discovered via "returned shapes"
          // and via "tracked sketches"). Use a bbox-based fingerprint to avoid collisions.
          const v = s.vertices;
          let minX = Infinity, minY = Infinity, minZ = Infinity;
          let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
          for (let i = 0; i < v.length; i += 3) {
            const x = v[i] ?? 0;
            const y = v[i + 1] ?? 0;
            const z = v[i + 2] ?? 0;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (z < minZ) minZ = z;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (z > maxZ) maxZ = z;
          }
          const r = (n: number) => (Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0);
          const fingerprint = `${v.length}-${r(minX)}-${r(minY)}-${r(minZ)}-${r(maxX)}-${r(maxY)}-${r(maxZ)}`;
          if (!allSketchesByFingerprint.has(fingerprint)) allSketchesByFingerprint.set(fingerprint, s);
        });
        const allSketches = [...allSketchesByFingerprint.values()];

        const transferables: Transferable[] = [];
        geometries.forEach((g) => {
          g.faces.forEach((f) => {
            transferables.push(f.vertices.buffer, f.indices.buffer, f.normals.buffer);
          });
          if (g.edges) {
            transferables.push(g.edges.buffer);
          }
        });
        allSketches.forEach((s) => transferables.push(s.vertices.buffer));

        const payload: ExecutionResult = { geometries, sketches: allSketches };
        postResponse({ type: 'SUCCESS', id, geometries: payload }, transferables);
      } catch (error: unknown) {
        let message = String(error);
        if (message.match(/^\d+$/)) {
          message = `OpenCascade Error (Code: ${message}). This often means an invalid geometric operation.`;
        }
        postResponse({ type: 'ERROR', id, error: message });
      }
      return;
    }

    if (type === 'EXPORT_STEP' || type === 'EXPORT_STL') {
      try {
        await init();
        const code = request.code;
        const safeReplicad = createSafeReplicad(replicad);

        const wrappedStartSketch = () => {
          const SketcherCtor = (safeReplicad as unknown as { Sketcher: new (plane?: unknown) => SafeSketcher }).Sketcher;
          return new SketcherCtor();
        };

        const v01Api = createV01ApiGlobals(replicad);

        const func = new Function(
          'replicad',
          'startSketch',
          'makeCompound',
          'fillet',
          'chamfer',
          'sketchOnFace',
          'extrude',
          'param',
          'box',
          'cylinder',
          'sphere',
          code,
        ) as unknown as (...args: unknown[]) => unknown;

        const userGlobals = createUserGlobals(
          safeReplicad as unknown as { Sketcher: new (plane?: unknown) => SafeSketcher },
        );

        const result = withTemporaryGlobals({ ...userGlobals, ...v01Api }, () =>
          func(
            safeReplicad,
            wrappedStartSketch,
            makeCompound,
            fillet,
            chamfer,
            sketchOnFace,
            extrude,
            v01Api.param,
            v01Api.box,
            v01Api.cylinder,
            v01Api.sphere,
          ),
        );
        const rawResult = Array.isArray(result) ? result[0] : result;
        const shape = unwrapV01Shape(rawResult);
        if (!shape) throw new Error('No shape returned');

        const blobFn = type === 'EXPORT_STEP' ? getFn(shape, 'blobSTEP') : getFn(shape, 'blobSTL');
        if (!blobFn) throw new Error(`Shape does not support ${type === 'EXPORT_STEP' ? 'blobSTEP()' : 'blobSTL()'}`);

        const maybeBlob = blobFn.call(shape);
        const blob = maybeBlob instanceof Promise ? await maybeBlob : maybeBlob;
        if (!(blob instanceof Blob)) throw new Error('Export did not return a Blob');

        postResponse({ type: 'SUCCESS', id, blob });
      } catch (error: unknown) {
        postResponse({ type: 'ERROR', id, error: String(error) });
      }
    }
  }).catch((err) => {
    console.error('Worker: Unhandled lock error:', err);
  });
};
