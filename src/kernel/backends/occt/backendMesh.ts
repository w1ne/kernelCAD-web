// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/backendMesh.ts
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { stitchCracks, dropDegenerateTriangles } from './meshHeal';
import { cleanupExportMesh } from './meshCleanup';

/**
 * Tessellation tolerances for {@link meshShapeForExport}, honoured by both
 * the whole-shape mesher and the per-face fallback. Omitted = the export
 * defaults (whole shape: relative 0.01, 0.05 rad; per-face fallback:
 * absolute 0.02 mm, 0.1 rad). A validity check that only needs a
 * closed-manifold verdict can pass a coarser absolute deflection.
 */
export interface ExportMeshDeflection {
  linear: number;
  relative: boolean;
  angularRad: number;
}

export interface ExportMeshToleranceOptions {
  /** Absolute sampled chord-deviation target in millimetres. */
  tolerance?: number;
  /** Maximum normal-angle change in degrees. */
  angularToleranceDeg?: number;
}

export interface MeshDeviationReport {
  requested_mm: number;
  /** Greatest distance among the reported samples; not a certified global maximum. */
  measured_max_mm: number;
  /** 95th percentile of the reported sampled distances. */
  measured_p95_mm: number;
  samples: number;
  triangles: number;
  measurement: 'sampled_brep_surface_to_export_triangles';
  global_max_certified: false;
}

export function validateExportMeshToleranceOptions(options: unknown): string | undefined {
  if (options === undefined || options === null || typeof options !== 'object') return undefined;
  const value = options as { tolerance?: unknown; angularToleranceDeg?: unknown };
  if (value.tolerance !== undefined && !isValidLinearTolerance(value.tolerance)) {
    return 'options.tolerance must be a finite number greater than or equal to 0.001 mm.';
  }
  if (value.angularToleranceDeg !== undefined && !isValidAngularToleranceDegrees(value.angularToleranceDeg)) {
    return 'options.angularToleranceDeg must be a finite number greater than 0 and at most 180 degrees.';
  }
  if (value.angularToleranceDeg !== undefined && !convertsToPositiveRadians(value.angularToleranceDeg)) {
    return 'options.angularToleranceDeg must convert to a finite, positive radian value.';
  }
  return undefined;
}

function isValidLinearTolerance(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.001;
}

function isValidAngularToleranceDegrees(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 180;
}

function convertsToPositiveRadians(degrees: unknown): boolean {
  if (typeof degrees !== 'number') return false;
  const radians = degrees * Math.PI / 180;
  return Number.isFinite(radians) && radians > 0;
}

const DEFAULT_LINEAR_DEFLECTION = 0.01;
const DEFAULT_ANGULAR_DEFLECTION_RAD = 0.05;

/**
 * Convert agent-facing mesh controls to OCCT's mesher parameters. A requested
 * linear tolerance uses absolute mode; an angular-only request keeps the
 * existing relative linear mode. Requests that are already met by the
 * current default mesh keep that mesh in the export runtime.
 */
export function exportMeshDeflection(
  options?: ExportMeshToleranceOptions,
): ExportMeshDeflection | undefined {
  if (options?.tolerance === undefined && options?.angularToleranceDeg === undefined) return undefined;
  const requestedAngularRad = options?.angularToleranceDeg === undefined
    ? DEFAULT_ANGULAR_DEFLECTION_RAD
    : options.angularToleranceDeg * Math.PI / 180;
  return {
    linear: options?.tolerance === undefined
      ? DEFAULT_LINEAR_DEFLECTION
      : Math.min(options.tolerance, DEFAULT_LINEAR_DEFLECTION),
    relative: options?.tolerance === undefined,
    angularRad: Math.min(DEFAULT_ANGULAR_DEFLECTION_RAD, requestedAngularRad),
  };
}

/**
 * Export-grade mesher. Builds an OCCT `BRepMesh_IncrementalMesh_2` with
 * `isRelative=true` (linear tolerance is scaled by each edge's length), then
 * reads back per-face triangulation via replicad's `face.triangulation()`.
 *
 * Why bypass `shape.mesh()`: replicad's `mesh()` always re-runs `_mesh()`
 * with absolute (non-relative) deflection, which produces seam slivers on
 * adjacent curved faces (cones, sweeps) — the resulting STL fails open3d's
 * `is_watertight()` check even when the BREP is topologically perfect.
 * Relative-deflection mode + a tight angularTolerance produces matched
 * boundary discretization across faces, eliminating the slivers.
 *
 * Cost: ~3-4x slower mesh on cone-heavy parts, negligible on box / plate.
 * Used only for STL export; the preview path keeps the coarse defaults.
 */
export function meshShapeForExport(
  shape: replicad.Shape3D,
  deflection?: ExportMeshDeflection,
): { vertices: number[]; triangles: number[] } {
  const oc = getOC();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (shape as any).wrapped;
  // Wipe any cached preview-grade triangulation so the fresh mesher actually
  // runs. `theForce=true` removes triangulation on all faces, not just those
  // marked dirty.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (oc as any).BRepTools.Clean(wrapped, true);

  const mesher = meshWholeShapeIfSmall(oc, shape, wrapped, deflection);
  if (mesher === null) {
    meshFacesIndividually(oc, shape, deflection);
  }
  try {
    const { rawTriangles, rawVertices } = readFaceTriangulations(oc, shape, deflection);
    return weldVertices(rawVertices, rawTriangles);
  } finally {
    if (mesher) mesher.delete();
  }
}

/**
 * Remove every cached triangulation from `shape` (`BRepTools::Clean`, forced).
 * Best effort: a shape OCCT cannot clean keeps its cache.
 */
export function clearTriangulation(shape: replicad.Shape3D): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getOC() as any).BRepTools.Clean((shape as any).wrapped, true);
  } catch {
    // Cache stays; meshes already read from it are unaffected.
  }
}

function meshWholeShapeIfSmall(
  oc: ReturnType<typeof getOC>,
  shape: replicad.Shape3D,
  wrapped: unknown,
  deflection?: ExportMeshDeflection,
): { delete(): void } | null {
  // Whole-shape mesher escape hatch for pathologically dense imported packages.
  //
  // OCCT's shape-level BRepMesh ABORTS (throws a raw exception pointer) on some
  // very dense multi-face imported STEP — notably KiCad's LQFP-144 (2195 faces).
  // Worse, the aborted pass irreversibly damages the shape's geometry: a later
  // per-face retry (or even a STEP round-trip) then yields nothing. Recovery
  // after the fact is impossible, so the only safe path is to NOT run the
  // shape-level mesher on shapes dense enough to risk it, and mesh every face
  // independently instead (proven to succeed face-by-face where the whole-shape
  // pass fails). Every board component we currently ship meshes cleanly at the
  // shape level up to 1275 faces (ESP32-S3-WROOM-1); the LQFP-144 outlier is at
  // 2195. A 1600-face gate cleanly separates them, so every existing export
  // keeps its byte-identical shape-level triangulation and only the outliers
  // take the per-face path.
  const WHOLE_SHAPE_FACE_LIMIT = 1600;
  let faceCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _f of shape.faces) faceCount++;
  if (faceCount > WHOLE_SHAPE_FACE_LIMIT) return null;

  // Fresh tessellation with relative-deflection mode. The ctor performs the
  // meshing and stamps each face's triangulation in-place.
  // BRepMesh_IncrementalMesh_2(theShape, theLinDeflection, isRelative,
  //                            theAngDeflection, isInParallel)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (oc as any).BRepMesh_IncrementalMesh_2(
      wrapped,
      deflection?.linear ?? 0.01, // linear deflection — scaled per-edge because isRelative=true,
            //   so absolute deflection is ~0.01 * edgeLength (e.g. 0.3 mm on a
            //   30 mm slant; 0.6 mm on a 60 mm radius) — finer than the
            //   absolute-mode 0.05 default, with uniform refinement across
            //   face boundaries.
      deflection?.relative ?? true, // isRelative — tolerance is fraction of edge length
      deflection?.angularRad ?? 0.05, // angular deflection (rad). Replicad's default is 0.1; halving to
            //   0.05 reduces chord error on curved surfaces. Note: tightening
            //   further does not eliminate OCCT-mesher self-intersection on
            //   adjacent cone rings (a known mesher limitation, not tolerance
            //   sensitivity) — see cqe-task14 follow-up for the welding +
            //   self-intersection fix.
      false, // isInParallel
    );
  } catch {
    // A shape below the gate still aborted: best-effort per-face below rather
    // than crash the whole export (the aborted pass may have damaged this
    // shape, so its part can come out empty — the watertight verify reports it).
    return null;
  }
}

function meshFacesIndividually(
  oc: ReturnType<typeof getOC>,
  shape: replicad.Shape3D,
  deflection?: ExportMeshDeflection,
): void {
  // No shape-level triangulation: mesh every face independently so the
  // read-back loop finds populated triangulations. Default: ABSOLUTE mode
  // (0.02 mm, 0.1 rad). A caller's deflection wins here too, so the
  // whole-shape and per-face paths honour the same tolerances.
  const linear = deflection?.linear ?? 0.02;
  const relative = deflection?.relative ?? false;
  const angularRad = deflection?.angularRad ?? 0.1;
  for (const face of shape.faces) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fw = (face as any).wrapped;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (oc as any).BRepTools.Clean(fw, true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fm = new (oc as any).BRepMesh_IncrementalMesh_2(fw, linear, relative, angularRad, false);
      fm.delete();
    } catch {
      // Face left untriangulated; the read-back loop's fallback + the
      // watertight verify will surface any resulting hole.
    }
  }
}

/** Append-only typed buffer: export meshes run to millions of entries, and a
 *  boxed `number[]` grown by `push` plus its doubling copies dominated the
 *  evaluator's peak memory on dense parts. */
class GrowableFloat64 {
  data = new Float64Array(3 * 1024);
  length = 0;
  reserve(extra: number): void {
    const need = this.length + extra;
    if (need <= this.data.length) return;
    const next = new Float64Array(Math.max(need, this.data.length * 2));
    next.set(this.data.subarray(0, this.length));
    this.data = next;
  }
}

class GrowableUint32 {
  data = new Uint32Array(3 * 1024);
  length = 0;
  reserve(extra: number): void {
    const need = this.length + extra;
    if (need <= this.data.length) return;
    const next = new Uint32Array(Math.max(need, this.data.length * 2));
    next.set(this.data.subarray(0, this.length));
    this.data = next;
  }
}

/**
 * Append one face's cached triangulation to the raw buffers. Returns false
 * when the face carries no triangulation (or an empty one).
 *
 * Same node transform, orientation flip and index order as replicad's
 * `Face.triangulation()`, with two differences that matter only for memory:
 * every OCCT handle is deleted as soon as it is read instead of being parked
 * on a FinalizationRegistry until the next GC, and vertex normals (two more
 * handles per node) are not computed because no export reads them.
 */
function appendFaceTriangulation(
  oc: ReturnType<typeof getOC>,
  face: replicad.Face,
  rawVertices: GrowableFloat64,
  rawTriangles: GrowableUint32,
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = oc as any;
  const location = new o.TopLoc_Location_1();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = o.BRep_Tool.Triangulation((face as any).wrapped, location, 0);
  let transformation: { delete(): void } | undefined;
  try {
    if (handle.IsNull()) return false;
    const tri = handle.get();
    const nbNodes = tri.NbNodes() as number;
    if (nbNodes === 0) return false;
    // An identity location (the common case) leaves the node as it is, so the
    // transformed copy, and its handle, is skipped.
    if (!location.IsIdentity()) transformation = location.Transformation();
    const index0 = rawVertices.length / 3;
    rawVertices.reserve(nbNodes * 3);
    const V = rawVertices.data;
    let vi = rawVertices.length;
    for (let i = 1; i <= nbNodes; i++) {
      const node = tri.Node(i);
      const p = transformation === undefined ? node : node.Transformed(transformation);
      V[vi++] = p.X();
      V[vi++] = p.Y();
      V[vi++] = p.Z();
      if (p !== node) p.delete();
      node.delete();
    }
    rawVertices.length = vi;
    const backward = face.orientation === 'backward';
    const nbTriangles = tri.NbTriangles() as number;
    rawTriangles.reserve(nbTriangles * 3);
    const T = rawTriangles.data;
    let ti = rawTriangles.length;
    for (let nt = 1; nt <= nbTriangles; nt++) {
      const t = tri.Triangle(nt);
      const n1 = t.Value(1) as number;
      const n2 = t.Value(2) as number;
      const n3 = t.Value(3) as number;
      t.delete();
      T[ti++] = (backward ? n2 : n1) - 1 + index0;
      T[ti++] = (backward ? n1 : n2) - 1 + index0;
      T[ti++] = n3 - 1 + index0;
    }
    rawTriangles.length = ti;
    return true;
  } finally {
    transformation?.delete();
    handle.delete();
    location.delete();
  }
}

function readFaceTriangulations(
  oc: ReturnType<typeof getOC>,
  shape: replicad.Shape3D,
  deflection?: ExportMeshDeflection,
): { rawTriangles: Uint32Array; rawVertices: Float64Array } {
  // Read per-face triangulation directly. This is the same loop as
  // replicad's `Shape3D.mesh()` minus the redundant _mesh() call that
  // would overwrite our relative-mode triangulation with the absolute-mode
  // default.
  const rawTriangles = new GrowableUint32();
  const rawVertices = new GrowableFloat64();
  for (const face of shape.faces) {
    if (appendFaceTriangulation(oc, face, rawVertices, rawTriangles)) continue;
    // The whole-shape relative-deflection pass can leave individual faces
    // untriangulated (boolean leftovers at exact tangencies) — silently
    // skipping them leaves the entire face boundary as an open ring in
    // the STL. Retry the face alone in ABSOLUTE-deflection mode (the
    // relative-mode retry stays null on the regression corpus). The
    // fallback boundary won't match the neighbors' discretization;
    // the crack-stitch pass below makes the seam conformal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fw = (face as any).wrapped;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (oc as any).BRepTools.Clean(fw, true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const faceMesher = new (oc as any).BRepMesh_IncrementalMesh_2(
      fw,
      deflection?.linear ?? 0.02,
      deflection?.relative ?? false,
      deflection?.angularRad ?? 0.1,
      false,
    );
    faceMesher.delete();
    // Still empty: the watertight verify will report the hole.
    appendFaceTriangulation(oc, face, rawVertices, rawTriangles);
  }
  return {
    rawTriangles: rawTriangles.data.subarray(0, rawTriangles.length),
    rawVertices: rawVertices.data.subarray(0, rawVertices.length),
  };
}

/** Same equality as comparing the two numbers' decimal strings. */
function sameKeyPart(a: number, b: number): boolean {
  return a === b || (a !== a && b !== b);
}

function weldVertices(
  rawVertices: Float64Array,
  rawTriangles: Uint32Array,
): { vertices: number[]; triangles: number[] } {
  // Weld coincident vertices across face boundaries. OCCT's shape-level
  // mesher emits matching points on shared edges, but the per-face
  // read-back appends each face's vertex array independently — so a shared
  // edge ends up with two index sequences referring to coordinate-equal
  // but index-distinct vertices. open3d's `is_watertight()` requires each
  // edge to be shared by exactly two triangles via the *same* indices, so
  // without welding it reports the mesh as non-manifold (every shared edge
  // looks like four boundary edges instead of one shared edge).
  //
  // Quantize to 1e-7 mm — well below any geometric tolerance — to absorb
  // any floating-point drift between the per-face coordinate reads.
  //
  // The lookup is an open-addressing table of welded vertex indices keyed by
  // the quantized triple. A `Map` keyed by the triple's string cost a string
  // and a map entry per raw vertex.
  const Q = 1e7;
  const rawCount = rawVertices.length / 3;
  let capacity = 1024;
  while (capacity < rawCount * 2) capacity *= 2;
  const mask = capacity - 1;
  const slots = new Int32Array(capacity).fill(-1);
  const vertices: number[] = [];
  const remap = new Int32Array(rawCount);
  for (let i = 0; i < rawVertices.length; i += 3) {
    const x = rawVertices[i];
    const y = rawVertices[i + 1];
    const z = rawVertices[i + 2];
    const qx = Math.round(x * Q);
    const qy = Math.round(y * Q);
    const qz = Math.round(z * Q);
    let h = Math.imul(qx | 0, 0x9e3779b1) ^ Math.imul(qy | 0, 0x85ebca77) ^ Math.imul(qz | 0, 0xc2b2ae3d);
    h = (h ^ (h >>> 15)) & mask;
    let idx = -1;
    for (;;) {
      const candidate = slots[h];
      if (candidate === -1) break;
      if (
        sameKeyPart(Math.round(vertices[candidate * 3] * Q), qx) &&
        sameKeyPart(Math.round(vertices[candidate * 3 + 1] * Q), qy) &&
        sameKeyPart(Math.round(vertices[candidate * 3 + 2] * Q), qz)
      ) {
        idx = candidate;
        break;
      }
      h = (h + 1) & mask;
    }
    if (idx === -1) {
      idx = vertices.length / 3;
      vertices.push(x, y, z);
      slots[h] = idx;
    }
    remap[i / 3] = idx;
  }
  const triangles: number[] = new Array(rawTriangles.length);
  for (let i = 0; i < rawTriangles.length; i++) triangles[i] = remap[rawTriangles[i]];
  const welded: { vertices: number[]; triangles: number[] } = {
    vertices,
    triangles: dropDegenerateTriangles(triangles),
  };
  // Heal T-junction cracks born at tangent junctions and along
  // fallback-face seams. No-op (0 splits) on conformal meshes.
  stitchCracks(welded, 0.05);
  welded.triangles = dropDegenerateTriangles(welded.triangles);
  // Remove coplanar triangle rows and caps. Both are valid geometry but
  // fail float-precision self-intersection tests (open3d `is_watertight`)
  // once the STL rounds vertices to float32. Surface moves by < 1 micron;
  // a mesh that is not closed and manifold is left untouched.
  cleanupExportMesh(welded);
  return welded;
}
