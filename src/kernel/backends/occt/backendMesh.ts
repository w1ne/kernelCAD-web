// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/backendMesh.ts
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { stitchCracks } from './meshHeal';
import { cleanupExportMesh, isClosedEdgeManifold } from './meshCleanup';

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
    // Weld faces as they are read so the raw geometry buffers never overlap
    // with the final mesh buffers.
    const welded = readAndWeld(oc, shape, deflection);
    const manifold = isClosedEdgeManifold(welded.triangles);
    if (!manifold) {
      stitchCracks(welded, 0.05);
      compactDegenerateTriangles(welded.triangles);
    }
    cleanupExportMesh(welded, undefined, manifold);
    return welded;
  } finally {
    if (mesher) mesher.delete();
  }
}

function readAndWeld(
  oc: ReturnType<typeof getOC>,
  shape: replicad.Shape3D,
  deflection?: ExportMeshDeflection,
): { vertices: number[]; triangles: number[] } {
  const size = countFaceTriangulations(oc, shape);
  const builder = new WeldedMeshBuilder(size.nodes, size.triangles);
  for (const face of shape.faces) {
    if (appendFaceTriangulation(oc, face, builder)) continue;
    // The whole-shape relative-deflection pass can leave faces untriangulated.
    // Retry those faces alone in absolute-deflection mode; their boundaries
    // are stitched after the complete welded mesh is assembled.
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
    appendFaceTriangulation(oc, face, builder);
  }
  const welded = builder.finish();
  return welded;
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

/** Builds the welded mesh directly from each face's nodes and indices. */
class WeldedMeshBuilder {
  readonly vertices: number[];
  readonly triangles: number[];
  faceRemap: Int32Array;
  private slots: Int32Array;
  private mask: number;
  private vertexLength = 0;
  private triangleLength = 0;
  /** Quantization is well below the export's geometric tolerance. */
  private static readonly Q = 1e7;

  constructor(estimatedNodes: number, estimatedTriangles: number) {
    let capacity = 1024;
    while (capacity < estimatedNodes * 2) capacity *= 2;
    this.slots = new Int32Array(capacity).fill(-1);
    this.mask = capacity - 1;
    const nodeCapacity = Math.max(1024, estimatedNodes);
    this.vertices = new Array<number>(nodeCapacity * 3);
    this.triangles = new Array<number>(Math.max(1024, estimatedTriangles) * 3);
    this.faceRemap = new Int32Array(nodeCapacity);
  }

  weldVertex(x: number, y: number, z: number): number {
    const Q = WeldedMeshBuilder.Q;
    const qx = Math.round(x * Q), qy = Math.round(y * Q), qz = Math.round(z * Q);
    let h = this.hash(qx, qy, qz);
    for (;;) {
      const candidate = this.slots[h];
      if (candidate === -1) {
        if ((this.vertexLength / 3 + 1) * 2 > this.slots.length) {
          this.growSlots();
          h = this.hash(qx, qy, qz);
          while (this.slots[h] !== -1) h = (h + 1) & this.mask;
        }
        const index = this.vertexLength / 3;
        if (this.vertexLength + 3 > this.vertices.length) this.vertices.length = Math.max(this.vertexLength + 3, this.vertices.length * 2);
        this.vertices[this.vertexLength++] = x;
        this.vertices[this.vertexLength++] = y;
        this.vertices[this.vertexLength++] = z;
        this.slots[h] = index;
        return index;
      }
      if (
        sameKeyPart(Math.round(this.vertices[candidate * 3] * Q), qx) &&
        sameKeyPart(Math.round(this.vertices[candidate * 3 + 1] * Q), qy) &&
        sameKeyPart(Math.round(this.vertices[candidate * 3 + 2] * Q), qz)
      ) return candidate;
      h = (h + 1) & this.mask;
    }
  }

  ensureFaceRemap(nodes: number): void {
    if (nodes <= this.faceRemap.length) return;
    const next = new Int32Array(Math.max(nodes, this.faceRemap.length * 2));
    next.set(this.faceRemap);
    this.faceRemap = next;
  }

  private hash(qx: number, qy: number, qz: number): number {
    const hash = Math.imul(qx | 0, 0x9e3779b1) ^ Math.imul(qy | 0, 0x85ebca77) ^ Math.imul(qz | 0, 0xc2b2ae3d);
    return (hash ^ (hash >>> 15)) & this.mask;
  }

  private growSlots(): void {
    const slots = new Int32Array(this.slots.length * 2).fill(-1);
    const mask = slots.length - 1;
    const Q = WeldedMeshBuilder.Q;
    for (let index = 0; index < this.vertexLength / 3; index++) {
      const qx = Math.round(this.vertices[index * 3] * Q);
      const qy = Math.round(this.vertices[index * 3 + 1] * Q);
      const qz = Math.round(this.vertices[index * 3 + 2] * Q);
      const hash = Math.imul(qx | 0, 0x9e3779b1) ^ Math.imul(qy | 0, 0x85ebca77) ^ Math.imul(qz | 0, 0xc2b2ae3d);
      let h = (hash ^ (hash >>> 15)) & mask;
      while (slots[h] !== -1) h = (h + 1) & mask;
      slots[h] = index;
    }
    this.slots = slots;
    this.mask = mask;
  }

  finish(): { vertices: number[]; triangles: number[] } {
    this.vertices.length = this.vertexLength;
    this.triangles.length = this.triangleLength;
    return { vertices: this.vertices, triangles: this.triangles };
  }

  addTriangle(a: number, b: number, c: number): void {
    if (a === b || b === c || c === a) return;
    if (this.triangleLength + 3 > this.triangles.length) this.triangles.length = Math.max(this.triangleLength + 3, this.triangles.length * 2);
    this.triangles[this.triangleLength++] = a;
    this.triangles[this.triangleLength++] = b;
    this.triangles[this.triangleLength++] = c;
  }
}

/**
 * Append one face's cached triangulation directly into the welded mesh.
 * Returns false when the face carries no triangulation (or is empty).
 * Every OCCT handle is deleted immediately, and export does not compute
 * vertex normals.
 */
function appendFaceTriangulation(
  oc: ReturnType<typeof getOC>,
  face: replicad.Face,
  builder: WeldedMeshBuilder,
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
    builder.ensureFaceRemap(nbNodes);
    const remap = builder.faceRemap;
    for (let i = 1; i <= nbNodes; i++) {
      const node = tri.Node(i);
      const p = transformation === undefined ? node : node.Transformed(transformation);
      remap[i - 1] = builder.weldVertex(p.X(), p.Y(), p.Z());
      if (p !== node) p.delete();
      node.delete();
    }
    const backward = face.orientation === 'backward';
    const nbTriangles = tri.NbTriangles() as number;
    for (let nt = 1; nt <= nbTriangles; nt++) {
      const t = tri.Triangle(nt);
      const n1 = t.Value(1) as number;
      const n2 = t.Value(2) as number;
      const n3 = t.Value(3) as number;
      t.delete();
      builder.addTriangle(
        remap[(backward ? n2 : n1) - 1],
        remap[(backward ? n1 : n2) - 1],
        remap[n3 - 1],
      );
    }
    return true;
  } finally {
    transformation?.delete();
    handle.delete();
    location.delete();
  }
}

/** Node and triangle totals of the faces' cached triangulations. */
function countFaceTriangulations(
  oc: ReturnType<typeof getOC>,
  shape: replicad.Shape3D,
): { nodes: number; triangles: number } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = oc as any;
  let nodes = 0;
  let triangles = 0;
  for (const face of shape.faces) {
    const location = new o.TopLoc_Location_1();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = o.BRep_Tool.Triangulation((face as any).wrapped, location, 0);
    if (!handle.IsNull()) {
      const tri = handle.get();
      nodes += tri.NbNodes() as number;
      triangles += tri.NbTriangles() as number;
    }
    handle.delete();
    location.delete();
  }
  return { nodes, triangles };
}

/** Same equality as comparing the two numbers' decimal strings. */
function sameKeyPart(a: number, b: number): boolean {
  return a === b || (a !== a && b !== b);
}

/** Remove welding artifacts without allocating a second triangle array. */
function compactDegenerateTriangles(triangles: number[]): void {
  let write = 0;
  for (let read = 0; read < triangles.length; read += 3) {
    const a = triangles[read], b = triangles[read + 1], c = triangles[read + 2];
    if (a === b || b === c || c === a) continue;
    triangles[write++] = a;
    triangles[write++] = b;
    triangles[write++] = c;
  }
  triangles.length = write;
}
