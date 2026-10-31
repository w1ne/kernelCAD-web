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
 * Production callers: the Studio edit loop's first paint. The node capture
 * path passes it as `meshFeaturesPerFeature`'s `previewMeshOptions` (the
 * dev-kernel POST's `quality: 'coarse'`); the in-browser worker posts it as an
 * `EXECUTE_PREVIEW` frame before the display result of the same EXECUTE. Both
 * follow with a display pass that replaces the preview — see
 * OCCT_PERFORMANCE.md §9.2.
 */
export const COARSE_MESH_OPTIONS: MeshOptions = { tolerance: 1.0, angularTolerance: 0.5 };

/**
 * Display linear deflection per mm of a shape's bounding-box diagonal.
 *
 * FINE's absolute 0.1 mm is right for a bracket and absurd for a car: a 4 m
 * lofted hatchback body meshed to 508k triangles (48 MB of viewer JSON) and the
 * published-mesh build ran past its memory cap. Scaling the sag with the part
 * keeps it at 0.025 % of the part's size, so parts under ~400 mm are unchanged
 * (the 0.1 mm floor binds) and a 4.7 m diagonal gets ~1.2 mm. The angular
 * criterion (0.3 rad) is unchanged, so curvature is still resolved.
 * Display only: file exports mesh through `meshShapeForExport` at full quality.
 */
export const DISPLAY_RELATIVE_DEFLECTION = 2.5e-4;
/** Ceiling on the scaled display deflection (mm). */
export const DISPLAY_MAX_DEFLECTION = 2;

function shapeDiagonal(shape: unknown): number {
  try {
    if (!isRecord(shape)) return 0;
    const bb = shape.boundingBox as { bounds?: unknown } | undefined;
    const bounds = isRecord(bb) ? (bb as { bounds?: unknown }).bounds : undefined;
    if (!Array.isArray(bounds) || bounds.length !== 2) return 0;
    const [lo, hi] = bounds as [number[], number[]];
    const d = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    return Number.isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
}

/** {@link FINE_MESH_OPTIONS} with the linear deflection scaled to the shape's
 *  size ({@link DISPLAY_RELATIVE_DEFLECTION}). The default for `meshShape`. */
export function displayMeshOptions(shape: unknown): MeshOptions {
  const diagonal = shapeDiagonal(shape);
  const scaled = Math.min(DISPLAY_MAX_DEFLECTION, diagonal * DISPLAY_RELATIVE_DEFLECTION);
  if (!(scaled > FINE_MESH_OPTIONS.tolerance)) return FINE_MESH_OPTIONS;
  return { ...FINE_MESH_OPTIONS, tolerance: scaled };
}

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

// Prefer explicit wire/outline accessors when available (sketch results, planar faces, etc.).
function tryWireValue(val: unknown, ctx: unknown): unknown | null {
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
}

function callWireMethod(obj: UnknownRecord, key: string): unknown | null {
  const fn = getFn(obj, key);
  if (fn) {
    try {
      const out = fn.call(obj);
      if (out) return out;
    } catch {
      // ignore
    }
  }
  return null;
}

function resolveWireAccessor(obj: UnknownRecord, key: string): unknown | null {
  const direct = tryWireValue(obj[key], obj);
  if (direct) return direct;
  return callWireMethod(obj, key);
}

function getWireFromProperty(obj: UnknownRecord, key: string): unknown | null {
  const prop = obj[key];
  if (!prop) return null;
  return getWire(prop);
}

export function getWire(obj: unknown): unknown | null {
  if (!isRecord(obj)) return null;

  // Unwrap common Replicad wrappers.
  const raw =
    (isRecord(obj._wrapped) ? obj._wrapped : null) ??
    (isRecord(obj.occ) ? obj.occ : null);
  if (raw) {
    const unwrapped = getWire(raw);
    if (unwrapped) return unwrapped;
  }

  const fromShape = getWireFromProperty(obj, 'shape');
  if (fromShape) return fromShape;

  const directWire = resolveWireAccessor(obj, 'wire');
  if (directWire) return directWire;

  const outerWire = resolveWireAccessor(obj, 'outerWire');
  if (outerWire) return outerWire;

  const wires = obj.wires;
  if (Array.isArray(wires) && wires.length > 0 && isRecord(wires[0])) return wires[0];

  // Recurse into common wrapper containers (e.g. SafeSketcher.sketch, sketch result holders).
  const fromSketch = getWireFromProperty(obj, 'sketch');
  if (fromSketch) return fromSketch;

  return null;
}

function resolveVecComponent(value: unknown, upper: unknown, thisArg: unknown): unknown {
  if (typeof value === 'number') return value;
  if (typeof value === 'function') return (value as () => unknown).call(thisArg);
  if (typeof upper === 'number') return upper;
  if (typeof upper === 'function') return (upper as () => unknown).call(thisArg);
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

  const x = resolveVecComponent(xr, Xr, v);
  const y = resolveVecComponent(yr, Yr, v);
  const z = resolveVecComponent(zr, Zr, v);

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

function resolveReplicadPlaneOrigin(planeObj: UnknownRecord): [number, number, number] | null {
  const originFn = getFn(planeObj, 'origin');
  return tryVec3(originFn ? (originFn as () => unknown).call(planeObj) : planeObj.origin);
}

function resolveReplicadPlaneNormal(planeObj: UnknownRecord): [number, number, number] | null {
  const zDirFn = getFn(planeObj, 'zDir');
  const normalFnAlt = getFn(planeObj, 'normal');
  return tryVec3(
    zDirFn ? (zDirFn as () => unknown).call(planeObj) :
      normalFnAlt ? (normalFnAlt as () => unknown).call(planeObj) :
        (planeObj.zDir ?? planeObj.normal)
  );
}

function resolveReplicadPlaneXYDirs(planeObj: UnknownRecord): {
  xDir: [number, number, number] | null;
  yDir: [number, number, number] | null;
} {
  const xDirFn = getFn(planeObj, 'xDir');
  const xDir = tryVec3(xDirFn ? (xDirFn as () => unknown).call(planeObj) : planeObj.xDir);

  const yDirFn = getFn(planeObj, 'yDir');
  const yDir = tryVec3(yDirFn ? (yDirFn as () => unknown).call(planeObj) : planeObj.yDir);

  return { xDir, yDir };
}

/** Same axis construction as replicad.makePlaneFromFace, without the surface probe. */
function axesFromNormal(normal: [number, number, number]): {
  xDir: [number, number, number];
  yDir: [number, number, number];
} {
  const [nx, ny, nz] = normal;
  let xx = -ny;
  let xy = nx;
  let xz = 0;
  let len = Math.hypot(xx, xy, xz);
  if (len < 1e-8) {
    xx = 1;
    xy = 0;
    xz = 0;
    len = 1;
  }
  xx /= len;
  xy /= len;
  xz /= len;
  const yx = ny * xz - nz * xy;
  const yy = nz * xx - nx * xz;
  const yz = nx * xy - ny * xx;
  const ylen = Math.hypot(yx, yy, yz) || 1;
  return {
    xDir: [xx, xy, xz],
    yDir: [yx / ylen, yy / ylen, yz / ylen],
  };
}

/** Real OCCT faces expose `wrapped`. Plain test stubs do not, and must keep
 *  the centre/normalAt fallback the characterisation tests lock in. */
function tryFastPlaneFromNormal(face: unknown): FaceGeometry['plane'] | undefined {
  if (!isRecord(face) || !('wrapped' in face)) return undefined;
  const normalFn = getFn(face, 'normalAt');
  if (!normalFn) return undefined;
  try {
    const raw = tryVec3(normalFn.call(face));
    if (!raw) return undefined;
    const len = Math.hypot(raw[0], raw[1], raw[2]);
    if (len < 1e-12) return undefined;
    const normal: [number, number, number] = [raw[0] / len, raw[1] / len, raw[2] / len];
    const { xDir, yDir } = axesFromNormal(normal);
    return { origin: [0, 0, 0], normal, xDir, yDir };
  } catch {
    return undefined;
  }
}

// Preferred strategy: use Replicad helper if available
function tryExtractPlaneViaReplicadHelper(face: unknown): FaceGeometry['plane'] {
  const fast = tryFastPlaneFromNormal(face);
  if (fast) return fast;
  try {
    const makePlaneFromFaceFn = (replicad as unknown as { makePlaneFromFace?: (f: unknown) => unknown }).makePlaneFromFace;
    if (typeof makePlaneFromFaceFn === 'function') {
      const planeObj = makePlaneFromFaceFn(face);
      if (isRecord(planeObj)) {
        const origin = resolveReplicadPlaneOrigin(planeObj);
        const norm = resolveReplicadPlaneNormal(planeObj);
        const { xDir, yDir } = resolveReplicadPlaneXYDirs(planeObj);

        if (origin && norm) {
          // meshFaceToGeometry moves this origin onto the vertex centroid.
          // face.center() is a full surface mass-property pass and would be discarded.
          return { origin, normal: norm, xDir: xDir ?? undefined, yDir: yDir ?? undefined };
        }
      }
    }
  } catch (e) {
    if (DEBUG) console.warn('meshing: replicad.makePlaneFromFace failed', e);
  }
  return undefined;
}

function resolveCenterAndNormalFallback(face: unknown): { center: unknown; normal: unknown } {
  const centerFn = getFn(face, 'center');
  const center = centerFn ? centerFn.call(face) : (face as UnknownRecord).center;

  const normalFn = getFn(face, 'normalAt');
  const faceRec = face as UnknownRecord;
  const normal = normalFn
    ? (normalFn.length === 0 ? normalFn.call(face) : normalFn.call(face, center || [0, 0, 0]))
    : (faceRec.normal || (isRecord(faceRec.surface) ? (faceRec.surface as UnknownRecord).normal : null) || (isRecord(faceRec.plane) ? (faceRec.plane as UnknownRecord).normal : null));

  return { center, normal };
}

function resolvePlaneDirectionsFallback(face: unknown) {
  // Final fallback: try to get directions if it's a plane
  const faceRec2 = face as UnknownRecord;
  const planeNode = faceRec2.plane ||
    (isRecord(faceRec2.surface) ? (faceRec2.surface as UnknownRecord).plane : null) ||
    faceRec2.planarPlane;
  const xDir = planeNode && isRecord(planeNode) ? tryVec3((planeNode as UnknownRecord).xDir || (typeof (planeNode as UnknownRecord).xDir === 'function' ? ((planeNode as UnknownRecord).xDir as () => unknown)() : null)) : undefined;
  const yDir = planeNode && isRecord(planeNode) ? tryVec3((planeNode as UnknownRecord).yDir || (typeof (planeNode as UnknownRecord).yDir === 'function' ? ((planeNode as UnknownRecord).yDir as () => unknown)() : null)) : undefined;
  return { xDir, yDir };
}

// Fallback for native Replicad objects: use center and normalAt
function tryExtractPlaneViaCenterAndNormal(face: unknown): FaceGeometry['plane'] {
  try {
    const { center, normal } = resolveCenterAndNormalFallback(face);

    if (center && normal) {
      const origin = tryVec3(center);
      const norm = tryVec3(normal);

      const { xDir, yDir } = resolvePlaneDirectionsFallback(face);

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

function firstVec3(p: UnknownRecord, keys: readonly string[]): [number, number, number] | null {
  for (const key of keys) {
    const v = tryVec3(p[key]);
    if (v) return v;
  }
  return null;
}

function tryExtractPlaneFromPlaneRecord(face: unknown, p: UnknownRecord): FaceGeometry['plane'] {
  const origin = firstVec3(p, ['origin', 'location', 'pos', 'p0']);
  const normal = firstVec3(p, ['normal', 'zDir', 'direction', 'dir']);

  if (!origin || !normal) return undefined;

  const xDir = firstVec3(p, ['xDir', 'xDirection', 'xAxis']);
  const yDir = firstVec3(p, ['yDir', 'yDirection', 'yAxis']);

  const anchoredOrigin = tryExtractFaceCenter(face) ?? origin;
  return { origin: anchoredOrigin, normal, xDir: xDir ?? undefined, yDir: yDir ?? undefined };
}

export function tryExtractPlaneFromFace(face: unknown, knownPlanar = false): FaceGeometry['plane'] {
  if (!isRecord(face)) return undefined;
  if (!knownPlanar) {
    const geomType = getString(face, 'geomType');
    if (!geomType) return undefined;
    const geomTypeUpper = geomType.toUpperCase();
    if (geomTypeUpper !== 'PLANE' && geomTypeUpper !== 'PLANAR') return undefined;
  }

  const p =
    (isRecord(face.planarPlane) ? face.planarPlane : null) ??
    (isRecord(face.plane) ? face.plane : null) ??
    (isRecord(face.surface) && isRecord((face.surface as UnknownRecord).plane) ? ((face.surface as UnknownRecord).plane as UnknownRecord) : null);

  const viaHelper = tryExtractPlaneViaReplicadHelper(face);
  if (viaHelper) return viaHelper;

  if (!p) {
    return tryExtractPlaneViaCenterAndNormal(face);
  }

  return tryExtractPlaneFromPlaneRecord(face, p);
}

/** Does the face's own `geomType` string claim a cylinder? */
function isCylinderGeomType(geomType: string): boolean {
  const t = geomType.toUpperCase();
  return t === 'CYLINDER' || t === 'CYLINDRICAL' || t === 'CYLINDRE';
}

/** OCJS direct extraction, when the loaded OCCT has the adaptor. Returns
 *  undefined when OCJS is unavailable, rejects the face, or the surface is
 *  not a cylinder, so the caller can fall through to property extraction. */
function tryExtractCylinderViaOcjs(
  face: UnknownRecord,
  geomType: string | null,
): FaceGeometry['cylinder'] {
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
  return undefined;
}

// Helper to extract cylinder data from a surface object
function cylinderFromSurfaceRecord(surf: unknown): FaceGeometry['cylinder'] | undefined {
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
}

/** Property-based fallback: try the face itself, then its `surface` or
 *  Replicad `geom` sub-object. */
function cylinderFromFaceProperties(face: UnknownRecord): FaceGeometry['cylinder'] {
  // 1. Try direct properties (if it's a surface)
  const direct = cylinderFromSurfaceRecord(face);
  if (direct) return direct;

  // 2. Try 'surface' property
  const surface = face.surface;
  if (surface) {
    const fromSurf = cylinderFromSurfaceRecord(surface);
    if (fromSurf) return fromSurf;
  }

  // 3. Try Replicad 'geom' property (sometimes found on faces)
  const geom = face.geom;
  if (geom) {
    const fromGeom = cylinderFromSurfaceRecord(geom);
    if (fromGeom) return fromGeom;
  }

  return undefined;
}

function tryExtractCylinderFromFace(face: unknown, knownCylinder = false): FaceGeometry['cylinder'] {
  if (!isRecord(face)) return undefined;

  // `geomType` builds a BRepAdaptor. Callers that already classified the face
  // pass `knownCylinder` so this hot path does not build a second one.
  const geomType = knownCylinder ? 'CYLINDER' : getString(face, 'geomType');

  if (!knownCylinder && geomType && !isCylinderGeomType(geomType)) {
    return undefined;
  }

  // 1. Try OCJS direct extraction if available
  const viaOcjs = tryExtractCylinderViaOcjs(face, geomType);
  if (viaOcjs) return viaOcjs;

  return cylinderFromFaceProperties(face);
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

  const arrays = extractMeshArrays(mesh);
  if (!arrays) return null;
  return faceGeometryFromArrays(face, faceId, arrays.vertices, arrays.triangles, arrays.normals);
}

/** One IncrementalMesh for the solid, then a read-back per face. */
function collectFaceGeometries(shape: unknown, faces: unknown[], options: MeshOptions): FaceGeometry[] {
  let meshedWhole = false;
  if (faces.length > 1) {
    const meshAll = getFn(shape, '_mesh');
    if (meshAll) {
      try {
        meshAll.call(shape, {
          tolerance: options.tolerance,
          angularTolerance: options.angularTolerance,
        });
        meshedWhole = true;
      } catch {
        meshedWhole = false;
      }
    }
  }

  const faceGeometries: FaceGeometry[] = [];
  for (let faceId = 0; faceId < faces.length; faceId++) {
    const face = faces[faceId];
    try {
      const geometry = (meshedWhole ? meshFaceFromExistingTriangulation(face, faceId) : null)
        ?? meshFaceToGeometry(face, faceId, options);
      if (geometry) faceGeometries.push(geometry);
    } catch {
      // ignore per-face mesh errors — match worker behavior
    }
  }
  return faceGeometries;
}

function meshFaceFromExistingTriangulation(face: unknown, faceId: number): FaceGeometry | null {
  if (!isRecord(face)) return null;
  const triFn = getFn(face, 'triangulation');
  if (!triFn) return null;
  const tri = triFn.call(face, 0);
  if (!isRecord(tri)) return null;
  const vertices = Array.isArray(tri.vertices) ? (tri.vertices as number[]) : null;
  const triangles = Array.isArray(tri.trianglesIndexes) ? (tri.trianglesIndexes as number[]) : null;
  const normals = Array.isArray(tri.verticesNormals) ? (tri.verticesNormals as number[]) : null;
  if (!vertices || !triangles || !normals || vertices.length === 0 || triangles.length === 0) return null;
  return faceGeometryFromArrays(face, faceId, vertices, triangles, normals);
}

type SurfaceKind = 'plane' | 'cylinder' | 'other' | 'unknown';

/** One `geomType` read per face. The getter builds a BRepAdaptor, so the
 *  plane and cylinder probes must not each read it again. */
function surfaceKind(face: unknown): SurfaceKind {
  const geomType = getString(face, 'geomType');
  if (!geomType) return 'unknown';
  const t = geomType.toUpperCase();
  if (t === 'PLANE' || t === 'PLANAR') return 'plane';
  if (isCylinderGeomType(geomType)) return 'cylinder';
  return 'other';
}

function faceMetadata(face: unknown): {
  plane: FaceGeometry['plane'];
  cylinder: FaceGeometry['cylinder'];
} {
  const kind = surfaceKind(face);
  if (kind === 'plane') return { plane: tryExtractPlaneFromFace(face, true), cylinder: undefined };
  if (kind === 'cylinder') return { plane: undefined, cylinder: tryExtractCylinderFromFace(face, true) };
  if (kind === 'other') return { plane: undefined, cylinder: undefined };
  return {
    plane: tryExtractPlaneFromFace(face),
    cylinder: tryExtractCylinderFromFace(face),
  };
}

function faceGeometryFromArrays(
  face: unknown,
  faceId: number,
  vertices: number[],
  triangles: number[],
  normals: number[],
): FaceGeometry {
  const { plane, cylinder } = faceMetadata(face);
  if (plane) {
    recenterPlaneOntoVertices(plane, vertices);
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(triangles),
    normals: new Float32Array(normals),
    faceId,
    plane,
    cylinder,
  };
}

function extractMeshArrays(mesh: UnknownRecord): {
  vertices: number[];
  triangles: number[];
  normals: number[];
} | null {
  const vertices = Array.isArray(mesh.vertices) ? (mesh.vertices as number[]) : null;
  const triangles = Array.isArray(mesh.triangles) ? (mesh.triangles as number[]) : null;
  const normals = Array.isArray(mesh.normals) ? (mesh.normals as number[]) : null;
  if (!vertices || !triangles || !normals) return null;
  return { vertices, triangles, normals };
}

/** Move a face's plane origin onto the centroid of its mesh vertices — the
 *  extracted plane record's own origin is not the tessellated face centre. */
function recenterPlaneOntoVertices(
  plane: NonNullable<FaceGeometry['plane']>,
  vertices: number[],
): void {
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

function volumeViaReplicadMeasure(shape: unknown): number | undefined {
  // Try measureVolume from replicad
  try {
    const v = (replicad as unknown as Record<string, (s: unknown) => unknown>).measureVolume(shape);
    if (typeof v === 'number' && v !== 0) return v;
  } catch {
    // ignore
  }
  return undefined;
}

function unwrapShape(shape: UnknownRecord): unknown {
  return (isRecord(shape._wrapped) ? shape._wrapped : null) ?? (isRecord(shape.occ) ? shape.occ : null) ?? shape;
}

function volumeViaMethod(raw: unknown, shape: UnknownRecord): number | undefined {
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
  return undefined;
}

function volumeViaProperty(raw: unknown, shape: UnknownRecord): number | undefined {
  // Try to read volume property
  const volVal = (raw as UnknownRecord).volume;
  if (typeof volVal === 'number') return volVal;

  const shapeVolVal = (shape as UnknownRecord).volume;
  if (typeof shapeVolVal === 'number') return shapeVolVal;

  return undefined;
}

function tryGetVolume(shape: unknown): number | undefined {
  if (!isRecord(shape)) return undefined;

  const viaMeasure = volumeViaReplicadMeasure(shape);
  if (viaMeasure !== undefined) return viaMeasure;

  const raw = unwrapShape(shape);

  const viaMethod = volumeViaMethod(raw, shape);
  if (viaMethod !== undefined) return viaMethod;

  return volumeViaProperty(raw, shape);
}

/**
 * `meshShape` output. `edgeHashes` is node-side only: the OCCT hash of each
 * edge in `edgeRanges` order, used by feature meshing to attribute edges to
 * features. It is never serialized to the viewer.
 */
export type MeshedShape = GeometryResult & { edgeHashes?: number[] };

/** Split replicad's `meshEdges` groups into the wire `edgeRanges` pairs and
 *  the matching per-edge hashes. Returns undefined when any group is
 *  malformed, so a caller never gets ranges that disagree with `lines`. */
function edgeGroupsToRanges(
  groups: unknown,
  vertexCount: number,
): { edgeRanges: number[]; edgeHashes: number[] } | undefined {
  if (!Array.isArray(groups) || groups.length === 0) return undefined;
  const edgeRanges: number[] = [];
  const edgeHashes: number[] = [];
  for (const g of groups) {
    if (!isRecord(g)) return undefined;
    const { start, count, edgeId } = g as { start?: unknown; count?: unknown; edgeId?: unknown };
    if (typeof start !== 'number' || typeof count !== 'number' || typeof edgeId !== 'number') return undefined;
    if (start < 0 || count < 0 || start + count > vertexCount) return undefined;
    edgeRanges.push(start, count);
    edgeHashes.push(edgeId);
  }
  return { edgeRanges, edgeHashes };
}

type EdgeMeshResult = { lines: number[]; edgeGroups: { start: number; count: number; edgeId: number }[] };
type Deletable = { delete?: () => void };
type OcShapeLike = { wrapped: unknown; hashCode: number } & Deletable;
type OcFaceLike = OcShapeLike & { edges: OcShapeLike[] };

/** Shared state of one `meshShapeEdges` pass. */
interface EdgeMeshPass {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- OCCT wasm bindings are untyped here
  oc: any;
  own: <T>(o: T) => T;
  recorded: Set<number>;
  pushEdge: (points: [number, number, number][], edgeId: number) => void;
}

/** Edges on a triangulated face: polygon nodes live in the triangulation's
 *  frame, so they take the FACE location the triangulation came with. */
function meshFaceEdges(pass: EdgeMeshPass, face: OcFaceLike): void {
  const { oc, own } = pass;
  own(face);
  const faceLoc = own(new oc.TopLoc_Location_1());
  const triangulation = own(oc.BRep_Tool.Triangulation(face.wrapped, faceLoc, 0));
  if (triangulation.IsNull()) return;
  const tri = triangulation.get();
  const faceTrsf = faceLoc.Transformation();
  for (const edge of face.edges) {
    own(edge);
    if (pass.recorded.has(edge.hashCode)) continue;
    const polygon = own(oc.BRep_Tool.PolygonOnTriangulation_1(edge.wrapped, triangulation, faceLoc));
    if (!polygon || polygon.IsNull()) continue;
    const nodes = own(polygon.get().Nodes());
    const points: [number, number, number][] = [];
    for (let i = nodes.Lower(); i <= nodes.Upper(); i++) {
      const p = own(own(tri.Node(nodes.Value(i))).Transformed(faceTrsf));
      points.push([p.X(), p.Y(), p.Z()]);
    }
    pass.pushEdge(points, edge.hashCode);
  }
}

/** An edge no triangulated face covered. `BRepAdaptor_Curve` already
 *  includes the edge's location, so its points take no further transform. */
function meshFreeEdge(pass: EdgeMeshPass, edge: OcShapeLike, options: MeshOptions): void {
  const { oc, own } = pass;
  own(edge);
  if (pass.recorded.has(edge.hashCode)) return;
  const curve = own(new oc.BRepAdaptor_Curve_2(edge.wrapped));
  const sampler = own(new oc.GCPnts_TangentialDeflection_2(
    curve, options.tolerance, options.angularTolerance, 2, 1e-9, 1e-7,
  ));
  const points: [number, number, number][] = [];
  for (let j = 1; j <= sampler.NbPoints(); j++) {
    const p = own(sampler.Value(j));
    points.push([p.X(), p.Y(), p.Z()]);
  }
  pass.pushEdge(points, edge.hashCode);
}

/**
 * BREP edge polylines in WORLD coordinates — a location-correct port of
 * replicad's `Shape.meshEdges()`.
 *
 * replicad (0.23) gets two transforms wrong, and both only bite on shapes
 * whose sub-shapes carry a non-identity `TopLoc_Location` — in practice
 * STEP imports (assembly placements) moved by translate/rotate:
 *  1. For edges on a triangulated face it calls
 *     `PolygonOnTriangulation(edge, T, <fresh identity loc>)` and transforms
 *     the nodes by that identity, instead of passing and applying the FACE
 *     location the triangulation was fetched with. The polygon nodes then sit
 *     in the triangulation's local frame — away from the shaded faces.
 *  2. For free edges it re-applies the last face's location to points that
 *     `BRepAdaptor_Curve` already returns in global coordinates.
 * The result was the "ghost" edge clusters of imported SG90 horns floating
 * tens of mm off their shaded faces in Studio. Grouping, ordering and
 * `edgeId` hashes match replicad's output exactly.
 */
export function meshShapeEdges(shape: unknown, options: MeshOptions): EdgeMeshResult | undefined {
  if (!isRecord(shape)) return undefined;
  const faces = shape.faces as unknown as OcFaceLike[] | undefined;
  const allEdges = shape.edges as unknown as OcShapeLike[] | undefined;
  if (!Array.isArray(faces) || !Array.isArray(allEdges)) return undefined;
  const owned: Deletable[] = [];
  const lines: number[] = [];
  const edgeGroups: EdgeMeshResult['edgeGroups'] = [];
  const recorded = new Set<number>();
  const pass: EdgeMeshPass = {
    oc: getOC(),
    own: (o) => { owned.push(o as Deletable); return o; },
    recorded,
    pushEdge: (points, edgeId) => {
      const start = lines.length / 3;
      for (let i = 1; i < points.length; i++) lines.push(...points[i - 1]!, ...points[i]!);
      edgeGroups.push({ start, count: lines.length / 3 - start, edgeId });
      recorded.add(edgeId);
    },
  };
  try {
    for (const face of faces) meshFaceEdges(pass, face);
    for (const edge of allEdges) meshFreeEdge(pass, edge, options);
    return { lines, edgeGroups };
  } finally {
    for (const o of owned) o?.delete?.();
  }
}

/**
 * Mesh a single replicad/OCCT shape into a GeometryResult.
 *
 * Returns null if the shape has no valid face geometries (e.g. deleted,
 * non-record, or all faces fail to mesh).
 *
 * `meshOptions` controls tessellation quality. Defaults to
 * {@link displayMeshOptions}: FINE, with the linear deflection scaled up for
 * parts larger than ~400 mm. Pass {@link COARSE_MESH_OPTIONS}
 * (or any looser {@link MeshOptions}) for a fast preview mesh.
 */
export function meshShape(
  shape: unknown,
  meshOptions?: MeshOptions,
): MeshedShape | null {
  if (!isRecord(shape)) return null;
  if (shape.isDeleted) return null;
  const options = meshOptions ?? displayMeshOptions(shape);

  const facesRaw = shape.faces;
  const faces = (() => {
    if (Array.isArray(facesRaw)) return facesRaw;
    if (!isRecord(facesRaw)) return null;
    const maybeLen = (facesRaw as { length?: unknown }).length;
    if (typeof maybeLen !== 'number') return null;
    return Array.from(facesRaw as unknown as ArrayLike<unknown>);
  })();

  const faceGeometries = Array.isArray(faces)
    ? collectFaceGeometries(shape, faces, options)
    : [];
  if (faceGeometries.length === 0) return null;

  const volume = tryGetVolume(shape);

  let edges: Float32Array | undefined;
  let edgeGroups: ReturnType<typeof edgeGroupsToRanges>;
  try {
    const meshEdgesFn = getFn(shape, 'meshEdges');
    if (meshEdgesFn) {
      // Our port, not replicad's meshEdges: replicad drops sub-shape
      // locations (see meshShapeEdges), which floats the edges of moved
      // STEP imports away from their faces.
      const edgeRes = meshShapeEdges(shape, options) as Record<string, unknown> | undefined;
      if (isRecord(edgeRes) && Array.isArray(edgeRes.lines)) {
        const lines = edgeRes.lines as number[];
        if (lines.length > 0) {
          edges = new Float32Array(lines);
          // Per-edge vertex ranges let the viewer pick and highlight ONE
          // edge instead of the whole edge set.
          edgeGroups = edgeGroupsToRanges(edgeRes.edgeGroups, lines.length / 3);
        }
      }
    }
  } catch {
    // ignore edge-mesh failures
  }

  return {
    faces: faceGeometries,
    volume,
    edges,
    ...(edgeGroups !== undefined ? { edgeRanges: edgeGroups.edgeRanges, edgeHashes: edgeGroups.edgeHashes } : {}),
  };
}
