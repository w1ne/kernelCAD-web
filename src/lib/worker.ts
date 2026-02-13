import * as replicad from 'replicad';
import { setOC } from 'replicad';
import { chamfer, extrude, fillet, makeCompound, sketchOnFace } from './geometryHelpers';
import { createSafeReplicad, SafeSketcher } from './safeSketch';
import { withTemporaryGlobals } from './withTemporaryGlobals';
import { createUserGlobals } from './userGlobals';
import {
  type ExecutionResult,
  type FaceGeometry,
  type GeometryResult,
  type SketchGeometry,
  type WorkerRequest,
  type WorkerResponse,
  WorkerRequestSchema,
} from './workerTypes';

type UnknownRecord = Record<string, unknown>;

const DEBUG = false;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getFn(obj: unknown, key: string): ((...args: unknown[]) => unknown) | null {
  if (!isRecord(obj)) return null;
  const val = obj[key];
  return typeof val === 'function' ? (val as (...args: unknown[]) => unknown) : null;
}

function getString(obj: unknown, key: string): string | null {
  if (!isRecord(obj)) return null;
  const val = obj[key];
  return typeof val === 'string' ? val : null;
}

function getWire(obj: unknown): unknown | null {
  if (!isRecord(obj)) return null;

  // Prefer explicit wire/outline accessors when available (sketch results, planar faces, etc.).
  const tryWireValue = (val: unknown, ctx: unknown): unknown | null => {
    if (!val) return null;
    if (isRecord(val)) return val;
    if (typeof val === 'function') {
      try {
        const out = (val as (...args: unknown[]) => unknown).call(ctx);
        return out ?? null;
      } catch {
        return null;
      }
    }
    return null;
  };

  // Unwrap common Replicad wrappers.
  const raw =
    (isRecord((obj as UnknownRecord)._wrapped) ? ((obj as UnknownRecord)._wrapped as UnknownRecord) : null) ??
    (isRecord((obj as UnknownRecord).occ) ? ((obj as UnknownRecord).occ as UnknownRecord) : null);
  if (raw) {
    const unwrapped = getWire(raw);
    if (unwrapped) return unwrapped;
  }

  const shapeProp = (obj as UnknownRecord).shape;
  if (shapeProp) {
    const fromShape = getWire(shapeProp);
    if (fromShape) return fromShape;
  }

  const directWire = tryWireValue(obj.wire, obj);
  if (directWire) return directWire;

  const wireFn = getFn(obj, 'wire');
  if (wireFn) {
    try {
      const out = wireFn.call(obj);
      if (out) return out;
    } catch {
      // ignore
    }
  }

  const outerWire = tryWireValue((obj as UnknownRecord).outerWire, obj);
  if (outerWire) return outerWire;

  const outerWireFn = getFn(obj, 'outerWire');
  if (outerWireFn) {
    try {
      const out = outerWireFn.call(obj);
      if (out) return out;
    } catch {
      // ignore
    }
  }

  const wires = (obj as UnknownRecord).wires;
  if (Array.isArray(wires) && wires.length > 0 && isRecord(wires[0])) return wires[0];

  // Recurse into common wrapper containers (e.g. SafeSketcher.sketch, sketch result holders).
  const sketch = (obj as UnknownRecord).sketch;
  if (sketch) {
    const fromSketch = getWire(sketch);
    if (fromSketch) return fromSketch;
  }

  return null;
}

function tryVec3(v: unknown): [number, number, number] | null {
  if (typeof v === 'function') {
    try {
      v = (v as () => unknown).call(null);
    } catch {
      return null;
    }
  }

  if (Array.isArray(v) && v.length >= 3) {
    const [x, y, z] = v;
    if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') return [x, y, z];
  }
  if (!isRecord(v)) return null;
  const xr = (v as UnknownRecord).x;
  const yr = (v as UnknownRecord).y;
  const zr = (v as UnknownRecord).z;
  const Xr = (v as UnknownRecord).X;
  const Yr = (v as UnknownRecord).Y;
  const Zr = (v as UnknownRecord).Z;

  const x = typeof xr === 'number' ? xr : (typeof xr === 'function' ? (xr as () => unknown).call(v) : (typeof Xr === 'number' ? Xr : (typeof Xr === 'function' ? (Xr as () => unknown).call(v) : null)));
  const y = typeof yr === 'number' ? yr : (typeof yr === 'function' ? (yr as () => unknown).call(v) : (typeof Yr === 'number' ? Yr : (typeof Yr === 'function' ? (Yr as () => unknown).call(v) : null)));
  const z = typeof zr === 'number' ? zr : (typeof zr === 'function' ? (zr as () => unknown).call(v) : (typeof Zr === 'number' ? Zr : (typeof Zr === 'function' ? (Zr as () => unknown).call(v) : null)));

  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null;
  return [x, y, z];
}

function tryExtractFaceCenter(face: unknown): [number, number, number] | null {
  if (!isRecord(face)) return null;
  const centerFn = getFn(face, 'center');
  if (centerFn) {
    try {
      return tryVec3(centerFn.call(face));
    } catch {
      // ignore and continue with property-based fallback
    }
  }
  return tryVec3((face as UnknownRecord).center);
}

function tryExtractPlaneFromFace(face: unknown): FaceGeometry['plane'] {
  if (!isRecord(face)) return undefined;
  const geomType = getString(face, 'geomType');
  if (!geomType) return undefined;
  const geomTypeUpper = geomType.toUpperCase();
  if (geomTypeUpper !== 'PLANE' && geomTypeUpper !== 'PLANAR') return undefined;

  const p =
    (isRecord(face.planarPlane) ? face.planarPlane : null) ??
    (isRecord(face.plane) ? face.plane : null) ??
    (isRecord(face.surface) && isRecord((face.surface as UnknownRecord).plane) ? ((face.surface as UnknownRecord).plane as UnknownRecord) : null);

  // Preferred strategy: use Replicad helper if available
  try {
    const makePlaneFromFaceFn = (replicad as unknown as { makePlaneFromFace?: (f: unknown) => unknown }).makePlaneFromFace;
    if (typeof makePlaneFromFaceFn === 'function') {
      const planeObj = makePlaneFromFaceFn(face);
      if (isRecord(planeObj)) {
        const originFn = getFn(planeObj, 'origin');
        const origin = tryVec3(originFn ? (originFn as () => unknown).call(planeObj) : planeObj.origin);

        const zDirFn = getFn(planeObj, 'zDir');
        const normalFnAlt = getFn(planeObj, 'normal');
        const norm = tryVec3(
          zDirFn ? (zDirFn as () => unknown).call(planeObj) :
            normalFnAlt ? (normalFnAlt as () => unknown).call(planeObj) :
              (planeObj.zDir ?? planeObj.normal)
        );

        const xDirFn = getFn(planeObj, 'xDir');
        const xDir = tryVec3(xDirFn ? (xDirFn as () => unknown).call(planeObj) : planeObj.xDir);

        const yDirFn = getFn(planeObj, 'yDir');
        const yDir = tryVec3(yDirFn ? (yDirFn as () => unknown).call(planeObj) : planeObj.yDir);

        if (origin && norm) {
          // Anchor plane to a point guaranteed to lie on the selected face.
          // Some plane origins are generic/canonical and can shift committed sketches.
          const anchoredOrigin = tryExtractFaceCenter(face) ?? origin;
          return { origin: anchoredOrigin, normal: norm, xDir: xDir ?? undefined, yDir: yDir ?? undefined };
        }
      }
    }
  } catch (e) {
    if (DEBUG) console.warn('Worker: replicad.makePlaneFromFace failed', e);
  }

  if (!p) {
    // Fallback for native Replicad objects: use center and normalAt
    try {
      const centerFn = getFn(face, 'center');
      const center = centerFn ? centerFn.call(face) : (face as UnknownRecord).center;

      const normalFn = getFn(face, 'normalAt');
      const faceRec = face as UnknownRecord;
      const normal = normalFn
        ? (normalFn.length === 0 ? normalFn.call(face) : normalFn.call(face, center || [0, 0, 0]))
        : (faceRec.normal || (isRecord(faceRec.surface) ? (faceRec.surface as UnknownRecord).normal : null) || (isRecord(faceRec.plane) ? (faceRec.plane as UnknownRecord).normal : null));

      if (center && normal) {
        const origin = tryVec3(center);
        const norm = tryVec3(normal);

        // Final fallback: try to get directions if it's a plane
        const faceRec = face as UnknownRecord;
        const planeNode = faceRec.plane ||
          (isRecord(faceRec.surface) ? (faceRec.surface as UnknownRecord).plane : null) ||
          faceRec.planarPlane;
        const xDir = planeNode && isRecord(planeNode) ? tryVec3((planeNode as UnknownRecord).xDir || (typeof (planeNode as UnknownRecord).xDir === 'function' ? ((planeNode as UnknownRecord).xDir as () => unknown)() : null)) : undefined;
        const yDir = planeNode && isRecord(planeNode) ? tryVec3((planeNode as UnknownRecord).yDir || (typeof (planeNode as UnknownRecord).yDir === 'function' ? ((planeNode as UnknownRecord).yDir as () => unknown)() : null)) : undefined;

        if (origin && norm) {
          const anchoredOrigin = tryExtractFaceCenter(face) ?? origin;
          return { origin: anchoredOrigin, normal: norm, xDir: xDir ?? undefined, yDir: yDir ?? undefined };
        }
      }
    } catch (e) {
      if (DEBUG) console.warn('Worker: Fallback plane extraction failed', e);
    }
    return undefined;
  }

  const origin =
    tryVec3((p as UnknownRecord).origin) ??
    tryVec3((p as UnknownRecord).location) ??
    tryVec3((p as UnknownRecord).pos) ??
    tryVec3((p as UnknownRecord).p0);

  const normal =
    tryVec3((p as UnknownRecord).normal) ??
    tryVec3((p as UnknownRecord).zDir) ??
    tryVec3((p as UnknownRecord).direction) ??
    tryVec3((p as UnknownRecord).dir);

  if (!origin || !normal) return undefined;

  const xDir =
    tryVec3((p as UnknownRecord).xDir) ??
    tryVec3((p as UnknownRecord).xDirection) ??
    tryVec3((p as UnknownRecord).xAxis);
  const yDir =
    tryVec3((p as UnknownRecord).yDir) ??
    tryVec3((p as UnknownRecord).yDirection) ??
    tryVec3((p as UnknownRecord).yAxis);

  const anchoredOrigin = tryExtractFaceCenter(face) ?? origin;
  return { origin: anchoredOrigin, normal, xDir: xDir ?? undefined, yDir: yDir ?? undefined };
}

function tryExtractCylinderFromFace(face: unknown): FaceGeometry['cylinder'] {
  if (!isRecord(face)) return undefined;

  // Check geomType
  const geomType = getString(face, 'geomType');

  if (geomType) {
    const t = geomType.toUpperCase();
    if (t !== 'CYLINDER' && t !== 'CYLINDRICAL' && t !== 'CYLINDRE') {
      return undefined;
    }
  }

  // 1. Try OCJS direct extraction if available
  if (OC) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawFace = (face as any)._wrapped ?? (face as any).occ ?? face;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adaptor = new (OC as any).BRepAdaptor_Surface_2(rawFace, true);
      const type = adaptor.GetType();

      // Check if it is a cylinder (GeomAbs_Cylinder = 3)
      // We use the validation from geomType or the adaptor check
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isCyl = (type.value === (OC as any).GeomAbs_SurfaceType.GeomAbs_Cylinder.value) ||
        (geomType && geomType.toUpperCase().includes('CYL'));

      if (isCyl) {
        const cyl = adaptor.Cylinder();
        const ax1 = cyl.Axis();
        const loc = ax1.Location();
        const dir = ax1.Direction();

        const origin: [number, number, number] = [loc.X(), loc.Y(), loc.Z()];
        const axis: [number, number, number] = [dir.X(), dir.Y(), dir.Z()];
        const radius = cyl.Radius();

        adaptor.delete();
        cyl.delete();
        ax1.delete();
        loc.delete();
        dir.delete();

        return { origin, axis, radius };
      }
      adaptor.delete();
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn('Worker: OC extraction failed', e, (e as any).stack);
    }
  }

  // Helper to extract cylinder data from a surface object
  const extractFromSurface = (surf: unknown): FaceGeometry['cylinder'] | undefined => {
    if (!isRecord(surf)) return undefined;

    const origin =
      tryVec3((surf as UnknownRecord).origin) ??
      tryVec3((surf as UnknownRecord).location);

    const axis =
      tryVec3((surf as UnknownRecord).axis) ??
      tryVec3((surf as UnknownRecord).direction) ??
      tryVec3((surf as UnknownRecord).zDir);

    const radius = (surf as UnknownRecord).radius;

    if (origin && axis && typeof radius === 'number') {
      return { origin, axis, radius };
    }
    return undefined;
  };

  // 1. Try direct properties (if it's a surface)
  const direct = extractFromSurface(face);
  if (direct) return direct;

  // 2. Try 'surface' property
  const surface = (face as UnknownRecord).surface;
  if (surface) {
    const fromSurf = extractFromSurface(surface);
    if (fromSurf) return fromSurf;
  }

  // 3. Try Replicad 'geom' property (sometimes found on faces)
  const geom = (face as UnknownRecord).geom;
  if (geom) {
    const fromGeom = extractFromSurface(geom);
    if (fromGeom) return fromGeom;
  }

  return undefined;
}

function meshWireToSketch(wire: unknown, id: string, name: string): SketchGeometry | null {
  if (!isRecord(wire)) return null;
  const meshEdgesFn = getFn(wire, 'meshEdges');
  if (meshEdgesFn) {
    const meshEdges = meshEdgesFn.call(wire, { tolerance: 0.1, angularTolerance: 30 }) as UnknownRecord;
    const lines = isRecord(meshEdges) && Array.isArray((meshEdges as UnknownRecord).lines)
      ? ((meshEdges as UnknownRecord).lines as number[])
      : null;
    if (lines && lines.length > 0) {
      return { id, name, vertices: new Float32Array(lines) };
    }
  }

  const meshFn = getFn(wire, 'mesh');
  if (!meshFn) return null;

  const mesh = meshFn.call(wire, { tolerance: 0.1 }) as UnknownRecord;
  if (!isRecord(mesh) || !Array.isArray(mesh.vertices)) return null;
  return { id, name, vertices: new Float32Array(mesh.vertices as number[]) };
}

function meshFaceToGeometry(face: unknown, faceId: number): FaceGeometry | null {
  if (!isRecord(face)) return null;
  const meshFn = getFn(face, 'mesh');
  if (!meshFn) return null;

  const mesh = meshFn.call(face, { tolerance: 0.1, angularTolerance: 30 }) as UnknownRecord;
  if (!isRecord(mesh)) return null;

  const vertices = Array.isArray(mesh.vertices) ? (mesh.vertices as number[]) : null;
  const triangles = Array.isArray(mesh.triangles) ? (mesh.triangles as number[]) : null;
  const normals = Array.isArray(mesh.normals) ? (mesh.normals as number[]) : null;
  if (!vertices || !triangles || !normals) return null;

  const plane = tryExtractPlaneFromFace(face);
  if (plane) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    const count = Math.floor(vertices.length / 3);
    if (count > 0) {
      for (let i = 0; i < vertices.length; i += 3) {
        cx += vertices[i] ?? 0;
        cy += vertices[i + 1] ?? 0;
        cz += vertices[i + 2] ?? 0;
      }
      plane.origin = [cx / count, cy / count, cz / count];
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(triangles),
    normals: new Float32Array(normals),
    faceId,
    plane,
    cylinder: tryExtractCylinderFromFace(face),
  };
}

function tryGetVolume(shape: unknown): number | undefined {
  if (!isRecord(shape)) return undefined;

  // Try measureVolume from replicad
  try {
    const v = (replicad as unknown as Record<string, (s: unknown) => unknown>).measureVolume(shape);
    if (typeof v === 'number' && v !== 0) return v;
  } catch {
    // ignore
  }

  const raw = (isRecord(shape._wrapped) ? shape._wrapped : null) ?? (isRecord(shape.occ) ? shape.occ : null) ?? shape;

  // Try to call volume() method with context
  const volFn = getFn(raw, 'volume') ?? getFn(shape, 'volume');
  if (volFn) {
    try {
      const context = getFn(raw, 'volume') ? raw : shape;
      const v = volFn.call(context);
      if (typeof v === 'number') return v;
    } catch {
      // ignore and look for property
    }
  }

  // Try to read volume property
  const volVal = (raw as UnknownRecord).volume;
  if (typeof volVal === 'number') return volVal;

  const shapeVolVal = (shape as UnknownRecord).volume;
  if (typeof shapeVolVal === 'number') return shapeVolVal;

  return undefined;
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

    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {};
    if (DEBUG) console.log('Worker: Initializing OpenCascade...');
    if (DEBUG) console.log('Worker: Environment:', JSON.stringify(env));

    OC = await opencascade({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          const baseUrl = typeof env.BASE_URL === 'string' ? env.BASE_URL : '/';
          let path = baseUrl.startsWith('.') ? '/' + file : baseUrl + file;
          path = path.replace(/\/\//g, '/');
          const finalUrl = new URL(path, self.location.origin).href + '?v=' + Date.now();
          if (DEBUG) console.log(`Worker: Locating ${file} -> ${finalUrl}`);
          return finalUrl;
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

        const func = new Function(
          'replicad',
          'startSketch',
          'makeCompound',
          'fillet',
          'chamfer',
          'sketchOnFace',
          'extrude',
          code,
        ) as unknown as (...args: unknown[]) => unknown;

        const result = withTemporaryGlobals(
          {
            // Convenience globals for generated snippets and common user code.
            // Safe per-execution: restored after this run to avoid leaking callbacks/closures.
            ...userGlobals,
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
            ),
        );
        const shapes = (Array.isArray(result) ? result : [result]).filter(Boolean);

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

            // Safety check for deleted objects
            const isRec = isRecord(shape);
            if (isRec && (shape as Record<string, unknown>).isDeleted) {
              console.warn(`Worker: Shape ${shapeIndex} is marked as deleted!`);
              return;
            }

            const facesRaw = shape.faces;
            if (DEBUG) console.log(`Worker: Shape ${shapeIndex} faces accessed.`);

            const faces = (() => {
              if (Array.isArray(facesRaw)) return facesRaw;
              if (!isRecord(facesRaw)) return null;

              const maybeLen = (facesRaw as { length?: unknown }).length;
              if (typeof maybeLen !== 'number') return null;
              return Array.from(facesRaw as unknown as ArrayLike<unknown>);
            })();

            if (DEBUG) console.log(`Worker: Shape ${shapeIndex} faces retrieved: ${faces?.length || 0}`);

            const faceGeometries: FaceGeometry[] = [];
            if (Array.isArray(faces)) {
              faces.forEach((face, faceId) => {
                try {
                  const geometry = meshFaceToGeometry(face, faceId);
                  if (geometry) faceGeometries.push(geometry);
                } catch (e) {
                  console.warn(`Worker: Failed to mesh face ${faceId} of shape ${shapeIndex}:`, e);
                }
              });
            }

            if (faceGeometries.length > 0) {
              const volume = tryGetVolume(shape);

              // Extract Analytical Edges
              let edges: Float32Array | undefined;
              try {
                const meshEdgesFn = getFn(shape, 'meshEdges');
                if (meshEdgesFn) {
                  // Use a fine tolerance for visualization edges
                  const edgeRes = meshEdgesFn.call(shape, { tolerance: 0.1, angularTolerance: 30 }) as UnknownRecord;
                  if (isRecord(edgeRes) && Array.isArray((edgeRes as UnknownRecord).lines)) {
                    const lines = (edgeRes as UnknownRecord).lines as number[];
                    if (lines.length > 0) {
                      edges = new Float32Array(lines);
                    }
                  }
                }
              } catch (e) {
                console.warn(`Worker: Failed to mesh edges for shape ${shapeIndex}`, e);
              }

              if (DEBUG) console.log(`Worker: Shape ${shapeIndex} successfully meshed. Vol: ${volume}, Edges: ${edges?.length ? (edges.length / 3) + ' pts' : 'none'}`);
              geometries.push({ faces: faceGeometries, volume, edges });
            } else {
              console.warn(`Worker: Shape ${shapeIndex} has no valid face geometries`);
            }

            const wire = getWire(shape);
            if (wire) {
              if (DEBUG) console.log(`Worker: Shape ${shapeIndex} has wire, meshing to sketch...`);
              try {
                const sketchId = `return-sketch-${shapeIndex}-seq-${returnedSketchSeq++}`;
                const sketch = meshWireToSketch(wire, sketchId, `sketch_ret_${shapeIndex + 1}`);
                if (sketch) returnedSketches.push(sketch);
              } catch (e) {
                console.warn(`Worker: Failed to mesh wire of shape ${shapeIndex}`, e);
              }
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

        const func = new Function(
          'replicad',
          'startSketch',
          'makeCompound',
          'fillet',
          'chamfer',
          'sketchOnFace',
          'extrude',
          code,
        ) as unknown as (...args: unknown[]) => unknown;

        const userGlobals = createUserGlobals(
          safeReplicad as unknown as { Sketcher: new (plane?: unknown) => SafeSketcher },
        );

        const result = withTemporaryGlobals(userGlobals, () =>
          func(safeReplicad, wrappedStartSketch, makeCompound, fillet, chamfer, sketchOnFace, extrude),
        );
        const shape = Array.isArray(result) ? result[0] : result;
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
