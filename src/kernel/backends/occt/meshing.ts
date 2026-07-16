// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Shared face/edge meshing helpers for the OCCT backend.
 *
 * Extracted from worker.ts so that Node-side callers (demo pipeline) can
 * reuse the exact same meshing logic with no divergence from what the
 * browser worker produces.
 */

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import type { FaceGeometry, GeometryResult, SketchGeometry } from '../../../shared/worker/workerTypes';

const DEBUG = false;

type UnknownRecord = Record<string, unknown>;

/**
 * Linear + angular deflection passed to replicad's `mesh()` / `meshEdges()`.
 * Smaller values produce finer (slower) tessellation.
 *
 * BOTH fields are forwarded verbatim to OCCT — replicad's `_mesh` is a straight
 * passthrough to `BRepMesh_IncrementalMesh_2(shape, tolerance, false,
 * angularTolerance, false)`, whose 4th argument is `theAngDeflection` in
 * RADIANS. There is no unit conversion anywhere in the chain.
 */
export interface MeshOptions {
  /** Linear deflection in model units / mm (OCCT `BRepMesh` `theLinDeflection`). */
  tolerance: number;
  /**
   * Angular deflection in RADIANS (OCCT `BRepMesh` `theAngDeflection`).
   *
   * NOT degrees. This docstring used to claim degrees "(replicad converts to
   * radians)" — it does not convert, and the claim cost us every curved surface
   * in the viewer. See {@link FINE_MESH_OPTIONS}.
   *
   * Reference points: replicad default 0.1 (~5.7°), OCCT default 0.5 (~28.6°).
   * Any value above ~6.28 (2π) disables the criterion entirely.
   */
  angularTolerance: number;
}

/**
 * Default fine mesh quality.
 *
 * `angularTolerance` was `30` here for a long time. Because the value is radians,
 * not degrees, 30 rad (~1719°) is far beyond 2π — the angular criterion never
 * bound, and curved surfaces were tessellated by linear deflection ALONE. That
 * is what made small curves look faceted: a ⌀4mm cylinder meshed to 56
 * triangles, because 0.1mm of sag on a 2mm radius permits a very coarse angular
 * step.
 *
 * Proof the criterion was off: a r=2mm cylinder meshes IDENTICALLY at 30, 60 and
 * 6.3 rad (56 tris) — all exceed 2π, so only linear deflection bound.
 *
 * 0.3 rad (~17°) is chosen from measurement, not from the doc. Sweep at
 * tolerance 0.1, triangles / mesh-ms:
 *
 *            ang=30(off)   ang=0.5    ang=0.3    ang=0.2     ang=0.1
 *   fillet    372 / 14.6   628/14.8  1380/19.8  2804/29.0   9460/90.4
 *   sphere    520 /  3.5   516/ 3.2   868/ 6.3  2022/15.2   8002/75.7
 *   cyl r=2    56 /  5.0   100/ 5.0   164/ 5.9   248/ 7.2    500/11.4
 *
 * Cost is ~flat to 0.35 and cliffs below 0.15. At 0.3 a filleted box gets 3.7x
 * the triangles for 1.36x the mesh time — the visual win lands on exactly the
 * doubly-curved surfaces (fillets, spheres) that looked worst, while a
 * r=200mm cylinder is unchanged at 560 tris because linear deflection already
 * binds there.
 *
 * NOTE: OCCT_PERFORMANCE.md §9.1 targets 0.1 rad for `display`. That doc is
 * architecture-phase and was never measured — 0.1 costs 6-21x mesh time here
 * and would trade one complaint (faceting) for another (edit latency). 0.3 also
 * matches OcctBackend.getMesh's long-standing value, the one call site whose
 * author clearly knew these were radians.
 */
export const FINE_MESH_OPTIONS: MeshOptions = { tolerance: 0.1, angularTolerance: 0.3 };

/**
 * Coarse mesh quality for an immediate-preview fast path. Much looser linear
 * AND angular deflection so large imported STEP parts tessellate quickly enough
 * to show *something* in Studio while the fine pass runs. Visually rougher
 * (faceted curves) but topologically valid and positive-volume — never used as
 * the final mesh, only as a first paint before a refine pass replaces it.
 *
 * `angularTolerance` was `60` (i.e. 60 radians — same disabled-criterion bug as
 * FINE above). 0.5 rad is OCCT's own default: visibly coarser than FINE's 0.1
 * while still actually constraining curvature.
 *
 * NOTE: this preset has no production caller — the two-tier preview path was
 * scaffolded up to this constant and never built (OCCT_PERFORMANCE.md §9.2).
 * It is kept because the units fix belongs with its sibling; wire it or delete
 * it deliberately, don't let it rot as decoration.
 */
export const COARSE_MESH_OPTIONS: MeshOptions = { tolerance: 1.0, angularTolerance: 0.5 };

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

export function getFn(obj: unknown, key: string): ((...args: unknown[]) => unknown) | null {
  if (!isRecord(obj)) return null;
  const val = obj[key];
  return typeof val === 'function' ? (val as (...args: unknown[]) => unknown) : null;
}

function getString(obj: unknown, key: string): string | null {
  if (!isRecord(obj)) return null;
  const val = obj[key];
  return typeof val === 'string' ? val : null;
}

export function getWire(obj: unknown): unknown | null {
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
    if (DEBUG) console.warn('meshing: replicad.makePlaneFromFace failed', e);
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
        const faceRec2 = face as UnknownRecord;
        const planeNode = faceRec2.plane ||
          (isRecord(faceRec2.surface) ? (faceRec2.surface as UnknownRecord).plane : null) ||
          faceRec2.planarPlane;
        const xDir = planeNode && isRecord(planeNode) ? tryVec3((planeNode as UnknownRecord).xDir || (typeof (planeNode as UnknownRecord).xDir === 'function' ? ((planeNode as UnknownRecord).xDir as () => unknown)() : null)) : undefined;
        const yDir = planeNode && isRecord(planeNode) ? tryVec3((planeNode as UnknownRecord).yDir || (typeof (planeNode as UnknownRecord).yDir === 'function' ? ((planeNode as UnknownRecord).yDir as () => unknown)() : null)) : undefined;

        if (origin && norm) {
          const anchoredOrigin = tryExtractFaceCenter(face) ?? origin;
          return { origin: anchoredOrigin, normal: norm, xDir: xDir ?? undefined, yDir: yDir ?? undefined };
        }
      }
    } catch (e) {
      if (DEBUG) console.warn('meshing: Fallback plane extraction failed', e);
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
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OC = getOC() as any;
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
        console.warn('meshing: OC extraction failed', e, (e as any).stack);
      }
    }
  } catch {
    // getOC() may throw if not initialized — fall through to property-based extraction
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

export function meshWireToSketch(
  wire: unknown,
  id: string,
  name: string,
  options: MeshOptions = FINE_MESH_OPTIONS,
): SketchGeometry | null {
  if (!isRecord(wire)) return null;
  const meshEdgesFn = getFn(wire, 'meshEdges');
  if (meshEdgesFn) {
    // Was a hardcoded `{ tolerance: 0.1, angularTolerance: 30 }` that ignored the
    // shared presets entirely — so sketch curves carried the same disabled
    // angular criterion as FINE did. Take the preset.
    const meshEdges = meshEdgesFn.call(wire, {
      tolerance: options.tolerance,
      angularTolerance: options.angularTolerance,
    }) as UnknownRecord;
    const lines = isRecord(meshEdges) && Array.isArray((meshEdges as UnknownRecord).lines)
      ? ((meshEdges as UnknownRecord).lines as number[])
      : null;
    if (lines && lines.length > 0) {
      return { id, name, vertices: new Float32Array(lines) };
    }
  }

  const meshFn = getFn(wire, 'mesh');
  if (!meshFn) return null;

  // Fallback path. Passing only `tolerance` leaves replicad's own
  // angularTolerance default (0.1 rad) in play — which is why this call was
  // never part of the faceting bug. Pass the preset explicitly so both branches
  // agree instead of agreeing by accident.
  const mesh = meshFn.call(wire, {
    tolerance: options.tolerance,
    angularTolerance: options.angularTolerance,
  }) as UnknownRecord;
  if (!isRecord(mesh) || !Array.isArray(mesh.vertices)) return null;
  return { id, name, vertices: new Float32Array(mesh.vertices as number[]) };
}

export function meshFaceToGeometry(
  face: unknown,
  faceId: number,
  options: MeshOptions = FINE_MESH_OPTIONS,
): FaceGeometry | null {
  if (!isRecord(face)) return null;
  const meshFn = getFn(face, 'mesh');
  if (!meshFn) return null;

  const mesh = meshFn.call(face, {
    tolerance: options.tolerance,
    angularTolerance: options.angularTolerance,
  }) as UnknownRecord;
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

/**
 * Mesh a single replicad/OCCT shape into a GeometryResult.
 *
 * Returns null if the shape has no valid face geometries (e.g. deleted,
 * non-record, or all faces fail to mesh).
 *
 * `options` controls tessellation quality. Defaults to {@link FINE_MESH_OPTIONS}
 * so existing single-pass callers are unchanged. Pass {@link COARSE_MESH_OPTIONS}
 * (or any looser {@link MeshOptions}) for a fast preview mesh.
 */
export function meshShape(
  shape: unknown,
  options: MeshOptions = FINE_MESH_OPTIONS,
): GeometryResult | null {
  if (!isRecord(shape)) return null;
  if (shape.isDeleted) return null;

  const facesRaw = shape.faces;
  const faces = (() => {
    if (Array.isArray(facesRaw)) return facesRaw;
    if (!isRecord(facesRaw)) return null;
    const maybeLen = (facesRaw as { length?: unknown }).length;
    if (typeof maybeLen !== 'number') return null;
    return Array.from(facesRaw as unknown as ArrayLike<unknown>);
  })();

  const faceGeometries: FaceGeometry[] = [];
  if (Array.isArray(faces)) {
    faces.forEach((face, faceId) => {
      try {
        const geometry = meshFaceToGeometry(face, faceId, options);
        if (geometry) faceGeometries.push(geometry);
      } catch {
        // ignore per-face mesh errors — match worker behavior
      }
    });
  }
  if (faceGeometries.length === 0) return null;

  const volume = tryGetVolume(shape);

  let edges: Float32Array | undefined;
  try {
    const meshEdgesFn = getFn(shape, 'meshEdges');
    if (meshEdgesFn) {
      const edgeRes = meshEdgesFn.call(shape, {
        tolerance: options.tolerance,
        angularTolerance: options.angularTolerance,
      }) as Record<string, unknown>;
      if (isRecord(edgeRes) && Array.isArray(edgeRes.lines)) {
        const lines = edgeRes.lines as number[];
        if (lines.length > 0) edges = new Float32Array(lines);
      }
    }
  } catch {
    // ignore edge-mesh failures
  }

  return { faces: faceGeometries, volume, edges };
}
