// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingMeshProjection.ts
//
// Hidden-line projection on triangles, for drawing sources built from meshes
// (lib.fromSTL / fromOBJ / from3MF bodies, where every face is a triangle
// facet) or too large for exact HLR.
//
// OCCT's B-rep HLR treats each facet as a surface. The SO-100 arm's 65k
// facets (~3 MB as a mesh) took 2.4 GB through polygonal HLR: a deep copy of
// the whole compound, a BRepMesh pass that triangulated every one-triangle
// face again, and HLRBRep_PolyAlgo's own structures on top. Here the facets
// are read once as an indexed triangle mesh and each view is computed on it
// directly, in plain typed arrays:
//
//   - A facet edge is drawn sharp when it is open (one triangle), shared by
//     more than two, or its triangles meet at more than the crease angle.
//     Flatter facet seams are not drawn.
//   - A smooth facet seam is drawn as outline in a view where it is a
//     silhouette: one of its triangles faces the viewer, the other does not.
//   - Faces that are not facets (designed B-rep faces next to or instead of
//     a mesh) keep their own edges, sharp or smooth by the stored edge
//     continuity as in exact HLR, and occlude through their triangulation;
//     the silhouettes of curved ones come from that triangulation.
//   - Visibility is tested on points along every line against all
//     triangles in view space, through a screen-space grid: the views are
//     orthographic, so a point is hidden when a triangle covering it in 2D
//     lies in front of it.

import { getOC, type ProjectionCamera } from 'replicad';
import type { Polyline2 } from './drawingLayout';

/**
 * A shell whose faces are mostly triangles, with at least this many of
 * them, came from a mesh: its triangle faces are facets, not designed
 * features. Feature recognition (drawingFeatures.ts) skips them too.
 */
export const MESH_FACET_MIN = 2000;

/** Facet seams whose triangles meet at more than this are creases. */
const CREASE_ANGLE_RAD = (30 * Math.PI) / 180;

/** A shell is mesh-derived when at least this share of its faces are triangles. */
const MESH_SHELL_FACET_SHARE = 0.5;

/** Shells with fewer triangle faces are treated as designed B-rep. */
const MESH_SHELL_MIN_FACETS = 100;

/** Same field set as drawingProjection's ProjectedViewEdges. */
export interface MeshViewLines {
  visibleSharp: Polyline2[];
  visibleOutline: Polyline2[];
  visibleSmooth: Polyline2[];
  hiddenSharp: Polyline2[];
  hiddenOutline: Polyline2[];
  hiddenSmooth: Polyline2[];
}

export interface MeshProjectionOptions {
  withHidden?: boolean;
  curveTolerance?: number;
  angularTolerance?: number;
}

/** The triangles and lines of a drawing source, in model space. */
export interface DrawingMesh {
  /** xyz per point. */
  readonly points: Float64Array;
  /** Point indices, three per occluding triangle. */
  readonly triangles: Int32Array;
  /** B-rep face of each triangle, -1 for facets. */
  readonly triangleFace: Int32Array;
  /** Lines drawn sharp, as point-index polylines. */
  readonly sharp: Int32Array[];
  /** Lines drawn thin (tangent B-rep edges). */
  readonly smooth: Int32Array[];
  /** The two B-rep faces each sharp, then each smooth, line bounds (-1:
   *  none), in that order. */
  readonly lineFaces: Int32Array;
  /** Silhouette candidates, four point indices each: the seam a-b and the
   *  third points c and e of its two triangles. */
  readonly folds: Int32Array;
  /** The B-rep faces of each fold's two triangles, -1 for facets. */
  readonly foldFace: Int32Array;
  /** How far a B-rep line may sit behind its own face's triangulation. */
  readonly brepTolerance: number;
  /** First sharp line that is a B-rep edge (earlier ones are facet edges). */
  readonly firstBrepSharp: number;
  /** First fold (in fold records) from a B-rep face's triangulation. */
  readonly firstBrepFold: number;
  /** Triangle facets read as mesh. */
  readonly facets: number;
}

/** Growable typed buffers for the extraction pass. */
class Builder {
  points: number[] = [];
  triangles: number[] = [];
  triangleFace: number[] = [];
  sharp: Int32Array[] = [];
  sharpFaces: number[] = [];
  smooth: Int32Array[] = [];
  smoothFaces: number[] = [];
  folds: number[] = [];
  foldFace: number[] = [];
  brepTolerance = 0;
  facets = 0;

  point(x: number, y: number, z: number): number {
    this.points.push(x, y, z);
    return this.points.length / 3 - 1;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Oc = any;

/**
 * True when `shape` should be drawn from triangles: more than `maxFaces`
 * faces, or more than MESH_FACET_MIN triangle faces.
 */
export function wantsMeshProjection(shape: unknown, maxFaces: number): boolean {
  const oc: Oc = getOC();
  const { TopAbs_FACE, TopAbs_EDGE, TopAbs_SHAPE } = oc.TopAbs_ShapeEnum;
  const faces = new oc.TopExp_Explorer_2(shape, TopAbs_FACE, TopAbs_SHAPE);
  try {
    let n = 0;
    let triangles = 0;
    for (; faces.More(); faces.Next()) {
      if (++n > maxFaces) return true;
      const face = faces.Current();
      if (edgeCount(oc, face, TopAbs_EDGE, TopAbs_SHAPE) === 3 && ++triangles > MESH_FACET_MIN) {
        face.delete();
        return true;
      }
      face.delete();
    }
    return false;
  } finally {
    faces.delete();
  }
}

/** Edges of a face, counted up to four. */
function edgeCount(oc: Oc, face: unknown, edgeType: unknown, avoid: unknown): number {
  const edges = new oc.TopExp_Explorer_2(face, edgeType, avoid);
  let n = 0;
  for (; edges.More() && n < 4; edges.Next()) n += 1;
  edges.delete();
  return n;
}

/**
 * Read `shape` once into a DrawingMesh. Faces of mesh-derived shells become
 * facets of a welded triangle mesh; every other face is triangulated (when it
 * has no triangulation yet) and keeps its B-rep edges. The shape is not
 * modified beyond the triangulation BRepMesh attaches to unmeshed faces.
 */
export function extractDrawingMesh(shape: unknown, options: MeshProjectionOptions = {}): DrawingMesh {
  const oc: Oc = getOC();
  const { TopAbs_SHELL, TopAbs_FACE, TopAbs_SHAPE } = oc.TopAbs_ShapeEnum;
  const out = new Builder();
  const facetTriangles: number[] = [];
  const weld = new Map<string, number>();
  const brepFaces: unknown[] = [];

  const takeShell = (shell: unknown): void => {
    const faces: unknown[] = [];
    const corners: number[][] = [];
    const explorer = new oc.TopExp_Explorer_2(shell, TopAbs_FACE, TopAbs_SHAPE);
    for (; explorer.More(); explorer.Next()) {
      const face = explorer.Current();
      faces.push(face);
      corners.push(facetCorners(oc, face) ?? []);
    }
    explorer.delete();
    const facetCount = corners.filter(c => c.length === 9).length;
    if (facetCount >= MESH_SHELL_MIN_FACETS && facetCount >= faces.length * MESH_SHELL_FACET_SHARE) {
      faces.forEach((face, i) => {
        const c = corners[i];
        if (c.length !== 9) {
          meshForDrawing(oc, face);
          brepFaces.push(face);
          return;
        }
        for (let k = 0; k < 9; k += 3) facetTriangles.push(welded(out, weld, c[k], c[k + 1], c[k + 2]));
        out.facets += 1;
        (face as { delete(): void }).delete();
      });
    } else {
      meshForDrawing(oc, shell);
      for (const face of faces) brepFaces.push(face);
    }
  };

  forEachSubShape(oc, shape, TopAbs_SHELL, TopAbs_SHAPE, takeShell);
  const free = new oc.TopExp_Explorer_2(shape, TopAbs_FACE, TopAbs_SHELL);
  for (; free.More(); free.Next()) {
    const face = free.Current();
    meshForDrawing(oc, face);
    brepFaces.push(face);
  }
  free.delete();

  const facetFaces = new Array<number>(facetTriangles.length / 3).fill(-1);
  addSeams(out, facetTriangles, facetFaces, true);
  for (const v of facetTriangles) out.triangles.push(v);
  for (const f of facetFaces) out.triangleFace.push(f);
  const firstBrepSharp = out.sharp.length;
  const firstBrepFold = out.folds.length / 4;
  try {
    // Triangulation nodes are welded across faces (BRepMesh discretizes a
    // shared edge once for both faces) and across a face's own seam, so a
    // silhouette on a seam or along a tangent edge is found.
    const brepTriangles: number[] = [];
    const brepFaceOf: number[] = [];
    brepFaces.forEach((face, f) => addFaceTriangulation(oc, out, weld, face, f, brepTriangles, brepFaceOf));
    addSeams(out, brepTriangles, brepFaceOf, false);
    for (const v of brepTriangles) out.triangles.push(v);
    for (const f of brepFaceOf) out.triangleFace.push(f);
    addBrepEdges(oc, out, brepFaces, options);
  } finally {
    for (const face of brepFaces) (face as { delete(): void }).delete();
  }
  return {
    points: Float64Array.from(out.points),
    triangles: Int32Array.from(out.triangles),
    triangleFace: Int32Array.from(out.triangleFace),
    sharp: out.sharp,
    smooth: out.smooth,
    lineFaces: Int32Array.from([...out.sharpFaces, ...out.smoothFaces]),
    folds: Int32Array.from(out.folds),
    foldFace: Int32Array.from(out.foldFace),
    brepTolerance: out.brepTolerance,
    firstBrepSharp,
    firstBrepFold,
    facets: out.facets,
  };
}

function welded(out: Builder, weld: Map<string, number>, x: number, y: number, z: number): number {
  const key = `${x},${y},${z}`;
  let index = weld.get(key);
  if (index === undefined) {
    index = out.point(x, y, z);
    weld.set(key, index);
  }
  return index;
}

/** The three corners (9 numbers) of a face bounded by exactly three edges and
 *  three vertices, or null. */
function facetCorners(oc: Oc, face: unknown): number[] | null {
  const { TopAbs_EDGE, TopAbs_VERTEX, TopAbs_SHAPE } = oc.TopAbs_ShapeEnum;
  if (edgeCount(oc, face, TopAbs_EDGE, TopAbs_SHAPE) !== 3) return null;
  const corners: number[] = [];
  const vertices = new oc.TopExp_Explorer_2(face, TopAbs_VERTEX, TopAbs_SHAPE);
  try {
    for (; vertices.More() && corners.length <= 9; vertices.Next()) {
      const shape = vertices.Current();
      const vertex = oc.TopoDS.Vertex_1(shape);
      const p = oc.BRep_Tool.Pnt(vertex);
      const x = p.X();
      const y = p.Y();
      const z = p.Z();
      p.delete();
      vertex.delete();
      shape.delete();
      let seen = false;
      for (let k = 0; k < corners.length; k += 3) {
        if (corners[k] === x && corners[k + 1] === y && corners[k + 2] === z) seen = true;
      }
      if (!seen) corners.push(x, y, z);
    }
  } finally {
    vertices.delete();
  }
  return corners.length === 9 ? corners : null;
}

/** Sharp lines and silhouette candidates of the welded facet mesh. */
/**
 * Seams of a welded triangle set: each edge with exactly two triangles meeting
 * within the crease angle becomes a silhouette candidate (a fold). With
 * `creasesSharp`, every other edge (open, non-manifold, or a crease) is drawn
 * sharp; B-rep triangulations leave those to their own edges. `faceOf` gives
 * each triangle's B-rep face (-1 for facets).
 */
function addSeams(out: Builder, triangles: number[], faceOf: number[], creasesSharp: boolean): void {
  const n = out.points.length / 3;
  // Edge key -> count, and the first two triangles on it.
  const first = new Map<number, number>();
  const second = new Map<number, number>();
  const count = new Map<number, number>();
  const opposite = (t: number, a: number, b: number): number => {
    for (let k = 0; k < 3; k += 1) {
      const v = triangles[t * 3 + k];
      if (v !== a && v !== b) return v;
    }
    return a;
  };
  const nTri = triangles.length / 3;
  for (let t = 0; t < nTri; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      const a = triangles[t * 3 + k];
      const b = triangles[t * 3 + ((k + 1) % 3)];
      if (a === b) continue;
      const key = a < b ? a * n + b : b * n + a;
      const c = (count.get(key) ?? 0) + 1;
      count.set(key, c);
      if (c === 1) first.set(key, t);
      else if (c === 2) second.set(key, t);
    }
  }
  const p = out.points;
  const cosCrease = Math.cos(CREASE_ANGLE_RAD);
  const sharp = (a: number, b: number): void => {
    if (!creasesSharp) return;
    out.sharp.push(Int32Array.of(a, b));
    out.sharpFaces.push(-1, -1);
  };
  for (const [key, c] of count) {
    const a = Math.floor(key / n);
    const b = key - a * n;
    if (c !== 2) {
      sharp(a, b);
      continue;
    }
    const t1 = first.get(key)!;
    const t2 = second.get(key)!;
    const ce = opposite(t1, a, b);
    const ee = opposite(t2, a, b);
    // Normals of the two triangles, both walking the seam in the sense that
    // makes them agree on a flat pair, whatever the triangles' own winding.
    const nA = triNormal(p, a, b, ce);
    const nB = triNormal(p, b, a, ee);
    const la = Math.hypot(nA[0], nA[1], nA[2]);
    const lb = Math.hypot(nB[0], nB[1], nB[2]);
    if (!(la > 0) || !(lb > 0)) continue;
    const cos = (nA[0] * nB[0] + nA[1] * nB[1] + nA[2] * nB[2]) / (la * lb);
    if (cos < cosCrease) {
      sharp(a, b);
    } else {
      out.folds.push(a, b, ce, ee);
      out.foldFace.push(faceOf[t1], faceOf[t2]);
    }
  }
}

function triNormal(p: ArrayLike<number>, a: number, b: number, c: number): [number, number, number] {
  const ux = p[b * 3] - p[a * 3];
  const uy = p[b * 3 + 1] - p[a * 3 + 1];
  const uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3];
  const vy = p[c * 3 + 1] - p[a * 3 + 1];
  const vz = p[c * 3 + 2] - p[a * 3 + 2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

/** A B-rep face's triangulation, welded into `triangles` (face `faceIndex`). */
function addFaceTriangulation(
  oc: Oc, out: Builder, weld: Map<string, number>, face: unknown, faceIndex: number,
  triangles: number[], faceOf: number[],
): void {
  const location = new oc.TopLoc_Location_1();
  const typed = oc.TopoDS.Face_1(face);
  const handle = oc.BRep_Tool.Triangulation(typed, location, 0);
  typed.delete();
  const transformation = location.Transformation();
  try {
    if (handle.IsNull()) return;
    const tri = handle.get();
    out.brepTolerance = Math.max(out.brepTolerance, tri.Deflection_1());
    const nbNodes: number = tri.NbNodes();
    const index = new Int32Array(nbNodes);
    for (let i = 1; i <= nbNodes; i += 1) {
      const node = tri.Node(i);
      const q = node.Transformed(transformation);
      index[i - 1] = welded(out, weld, q.X(), q.Y(), q.Z());
      q.delete();
      node.delete();
    }
    const nbTriangles: number = tri.NbTriangles();
    for (let t = 1; t <= nbTriangles; t += 1) {
      const triangle = tri.Triangle(t);
      triangles.push(index[triangle.Value(1) - 1], index[triangle.Value(2) - 1], index[triangle.Value(3) - 1]);
      faceOf.push(faceIndex);
      triangle.delete();
    }
  } finally {
    transformation.delete();
    handle.delete();
    location.delete();
  }
}

/** Every B-rep edge of `faces`, sharp or smooth by its stored continuity
 *  between its two faces (as exact HLR classifies them). Seams and
 *  degenerate edges are not drawn. */
function addBrepEdges(oc: Oc, out: Builder, faces: unknown[], options: MeshProjectionOptions): void {
  const { TopAbs_EDGE, TopAbs_SHAPE } = oc.TopAbs_ShapeEnum;
  interface Seen { edge: { IsSame(o: unknown): boolean; delete(): void }; face: number; other: number }
  const byHash = new Map<number, Seen[]>();
  const all: Seen[] = [];
  faces.forEach((face, f) => {
    const edges = new oc.TopExp_Explorer_2(face, TopAbs_EDGE, TopAbs_SHAPE);
    for (; edges.More(); edges.Next()) {
      const edge = edges.Current();
      const hash: number = edge.HashCode(2147483647);
      const bucket = byHash.get(hash) ?? [];
      const match = bucket.find(s => s.edge.IsSame(edge));
      if (match) {
        // Seen on the same face again: a seam (other = -2).
        match.other = match.face === f ? -2 : f;
        edge.delete();
      } else {
        const seen: Seen = { edge, face: f, other: -1 };
        bucket.push(seen);
        byHash.set(hash, bucket);
        all.push(seen);
      }
    }
    edges.delete();
  });
  const curveTol = options.curveTolerance ?? 0.02;
  const angTol = options.angularTolerance ?? 0.08;
  try {
    for (const s of all) {
      if (s.other === -2) continue;
      const edge = oc.TopoDS.Edge_1(s.edge);
      try {
        if (oc.BRep_Tool.Degenerated(edge)) continue;
        const line = sampleEdge(oc, out, edge, curveTol, angTol);
        if (!line) continue;
        if (s.other >= 0 && isTangent(oc, edge, faces[s.face], faces[s.other])) {
          out.smooth.push(line);
          out.smoothFaces.push(s.face, s.other);
        } else {
          out.sharp.push(line);
          out.sharpFaces.push(s.face, s.other);
        }
      } finally {
        edge.delete();
      }
    }
  } finally {
    for (const s of all) s.edge.delete();
  }
}

/** True when the edge's stored continuity between the two faces is G1 or
 *  better (a tangent edge, drawn thin). */
function isTangent(oc: Oc, edge: unknown, a: unknown, b: unknown): boolean {
  const fa = oc.TopoDS.Face_1(a);
  const fb = oc.TopoDS.Face_1(b);
  try {
    return oc.BRep_Tool.Continuity_1(edge, fa, fb) !== oc.GeomAbs_Shape.GeomAbs_C0;
  } finally {
    fa.delete();
    fb.delete();
  }
}

interface Sampler {
  NbPoints(): number;
  Value(i: number): { X(): number; Y(): number; Z(): number; delete(): void };
  delete(): void;
}

function sampleEdge(oc: Oc, out: Builder, edge: unknown, curveTol: number, angTol: number): Int32Array | null {
  let adaptor: { delete(): void } | undefined;
  let sampler: Sampler | undefined;
  try {
    adaptor = new oc.BRepAdaptor_Curve_2(edge);
    const s: Sampler = new oc.GCPnts_TangentialDeflection_2(adaptor, angTol, curveTol, 2, 1e-9, 1e-7);
    sampler = s;
    const n = s.NbPoints();
    if (n < 2) return null;
    const line = new Int32Array(n);
    for (let i = 1; i <= n; i += 1) {
      const p = s.Value(i);
      line[i - 1] = out.point(p.X(), p.Y(), p.Z());
      p.delete();
    }
    return line;
  } catch {
    return null;
  } finally {
    sampler?.delete();
    adaptor?.delete();
  }
}

function forEachSubShape(oc: Oc, shape: unknown, type: unknown, avoid: unknown, fn: (sub: unknown) => void): void {
  const explorer = new oc.TopExp_Explorer_2(shape, type, avoid);
  try {
    for (; explorer.More(); explorer.Next()) {
      const sub = explorer.Current();
      try {
        fn(sub);
      } finally {
        sub.delete();
      }
    }
  } finally {
    explorer.delete();
  }
}

/** Triangulate at ~0.1% of the shape's size (under a pen width at drawing
 *  scale) unless it already has a triangulation. A shape OCCT cannot mesh
 *  neither occludes nor shows silhouettes; its edges are still drawn. */
function meshForDrawing(oc: Oc, shape: unknown): void {
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.Add(shape, box, false);
    const diagonal = box.IsVoid() ? 1 : Math.sqrt(box.SquareExtent());
    new oc.BRepMesh_IncrementalMesh_2(shape, Math.max(0.02, diagonal * 1e-3), false, 0.5, false).delete();
  } catch {
    // Left untriangulated.
  } finally {
    box.delete();
  }
}

// ---------------------------------------------------------------------------
// Per-view projection
// ---------------------------------------------------------------------------

type V3 = [number, number, number];

/** Project a DrawingMesh through an orthographic camera. */
export function projectDrawingMesh(
  mesh: DrawingMesh,
  camera: ProjectionCamera,
  options: MeshProjectionOptions = {},
): MeshViewLines {
  const d = unitOf(camera.direction);
  const x = unitOf(camera.xAxis);
  const y: V3 = [d[1] * x[2] - d[2] * x[1], d[2] * x[0] - d[0] * x[2], d[0] * x[1] - d[1] * x[0]];
  const nPoints = mesh.points.length / 3;
  // View coordinates: u right, v up, w toward the viewer.
  const view = new Float64Array(nPoints * 3);
  let diag = 0;
  {
    let lu = Infinity, lv = Infinity, lw = Infinity;
    let hu = -Infinity, hv = -Infinity, hw = -Infinity;
    for (let i = 0; i < nPoints; i += 1) {
      const px = mesh.points[i * 3];
      const py = mesh.points[i * 3 + 1];
      const pz = mesh.points[i * 3 + 2];
      const u = px * x[0] + py * x[1] + pz * x[2];
      const v = px * y[0] + py * y[1] + pz * y[2];
      const w = px * d[0] + py * d[1] + pz * d[2];
      view[i * 3] = u;
      view[i * 3 + 1] = v;
      view[i * 3 + 2] = w;
      lu = Math.min(lu, u); lv = Math.min(lv, v); lw = Math.min(lw, w);
      hu = Math.max(hu, u); hv = Math.max(hv, v); hw = Math.max(hw, w);
    }
    if (nPoints > 0) diag = Math.hypot(hu - lu, hv - lv, hw - lw);
  }
  const occluders = new OccluderGrid(view, mesh.triangles, mesh.triangleFace);
  const meshEps = Math.max(diag * 1e-6, 1e-9);
  const brepEps = Math.max(meshEps, 2 * mesh.brepTolerance);
  const step = Math.max(diag / 2000, 1e-6);
  const withHidden = options.withHidden !== false;
  const lines = new LineSink(view, occluders, step, withHidden);

  const reach = mesh.brepTolerance;
  const lf = mesh.lineFaces;
  mesh.sharp.forEach((line, i) => (i < mesh.firstBrepSharp
    ? lines.add('sharp', line, meshEps, 0, -1, -1)
    : lines.add('sharp', line, brepEps, reach, lf[i * 2], lf[i * 2 + 1])));
  const n = mesh.sharp.length;
  mesh.smooth.forEach((line, i) => lines.add('smooth', line, brepEps, reach, lf[(n + i) * 2], lf[(n + i) * 2 + 1]));
  const f = mesh.folds;
  const pair = new Int32Array(2);
  for (let k = 0; k < f.length; k += 4) {
    if (!isSilhouette(view, f[k], f[k + 1], f[k + 2], f[k + 3])) continue;
    pair[0] = f[k];
    pair[1] = f[k + 1];
    if (k / 4 < mesh.firstBrepFold) lines.add('outline', pair, meshEps, 0, -1, -1);
    else lines.add('outline', pair, brepEps, reach, mesh.foldFace[k / 2], mesh.foldFace[k / 2 + 1]);
  }
  return lines.result();
}

function unitOf(v: { x: number; y: number; z: number }): V3 {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return [v.x / l, v.y / l, v.z / l];
}

/**
 * A seam a-b between triangles (a, b, c) and (b, a, e) is on the silhouette
 * when the triangles face opposite ways relative to the viewer: their view-
 * space normals' depth components (both walking the seam in the sense that
 * agrees on a flat pair) differ in sign. Those signs are relative to the
 * pair, not to the outside of the body, so a triangle seen exactly edge-on
 * next to one that is not also marks a silhouette: the edge-on run projects
 * onto that line, and of the two seams bounding it the far one comes back
 * hidden under the near one.
 */
function isSilhouette(view: Float64Array, a: number, b: number, c: number, e: number): boolean {
  const fa = depthNormal(view, a, b, c);
  const fb = depthNormal(view, b, a, e);
  if (fa === 0 || fb === 0) return fa !== fb;
  return fa > 0 !== fb > 0;
}

/** w component of the view-space normal (b - a) x (c - a), or 0 when the
 *  triangle is edge-on (see facesViewer). */
function depthNormal(view: Float64Array, a: number, b: number, c: number): number {
  if (!facesViewer(view, a * 3, b * 3, c * 3)) return 0;
  const ux = view[b * 3] - view[a * 3];
  const uy = view[b * 3 + 1] - view[a * 3 + 1];
  const vx = view[c * 3] - view[a * 3];
  const vy = view[c * 3 + 1] - view[a * 3 + 1];
  return ux * vy - uy * vx;
}

/** Steeper than this (screen area over true area) and a triangle is edge-on. */
const MIN_PROJECTED_AREA_RATIO = 1e-4;

/** True when the triangle at view offsets a, b, c covers screen area. */
function facesViewer(view: Float64Array, a: number, b: number, c: number): boolean {
  const ux = view[b] - view[a];
  const uy = view[b + 1] - view[a + 1];
  const uz = view[b + 2] - view[a + 2];
  const vx = view[c] - view[a];
  const vy = view[c + 1] - view[a + 1];
  const vz = view[c + 2] - view[a + 2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const area = Math.hypot(nx, ny, nz);
  return area > 0 && Math.abs(nz) >= area * MIN_PROJECTED_AREA_RATIO;
}

/**
 * Triangles binned on a uniform screen-space grid by their 2D bounds. A point
 * is hidden when a triangle that covers it lies more than `eps` in front.
 */
class OccluderGrid {
  private readonly cellStart: Int32Array;
  private readonly cellTris: Int32Array;
  private readonly x0: number;
  private readonly y0: number;
  private readonly nx: number;
  private readonly ny: number;
  private readonly cell: number;
  private readonly view: Float64Array;
  private readonly triangles: Int32Array;
  private readonly triangleFace: Int32Array;

  constructor(view: Float64Array, triangles: Int32Array, triangleFace: Int32Array) {
    this.view = view;
    this.triangles = triangles;
    this.triangleFace = triangleFace;
    const nTri = triangles.length / 3;
    let lx = Infinity;
    let ly = Infinity;
    let hx = -Infinity;
    let hy = -Infinity;
    for (let i = 0; i < triangles.length; i += 1) {
      const p = triangles[i] * 3;
      lx = Math.min(lx, view[p]);
      ly = Math.min(ly, view[p + 1]);
      hx = Math.max(hx, view[p]);
      hy = Math.max(hy, view[p + 1]);
    }
    if (!(hx >= lx)) {
      lx = ly = 0;
      hx = hy = 1;
    }
    const w = Math.max(hx - lx, 1e-9);
    const h = Math.max(hy - ly, 1e-9);
    const cell = Math.max(Math.sqrt((w * h) / Math.max(nTri, 1)), Math.max(w, h) / 4096);
    this.x0 = lx;
    this.y0 = ly;
    this.cell = cell;
    this.nx = Math.max(1, Math.ceil(w / cell));
    this.ny = Math.max(1, Math.ceil(h / cell));
    const counts = new Int32Array(this.nx * this.ny + 1);
    const span = (t: number, fn: (c: number) => void): void => {
      const a = triangles[t * 3] * 3;
      const b = triangles[t * 3 + 1] * 3;
      const c = triangles[t * 3 + 2] * 3;
      // Triangles seen (nearly) edge-on cover no area and hide nothing; their
      // interpolated depth is also ill-conditioned (a top face seen from the
      // side would "hide" its own front edge).
      if (!facesViewer(view, a, b, c)) return;
      const i0 = this.col(Math.min(view[a], view[b], view[c]));
      const i1 = this.col(Math.max(view[a], view[b], view[c]));
      const j0 = this.row(Math.min(view[a + 1], view[b + 1], view[c + 1]));
      const j1 = this.row(Math.max(view[a + 1], view[b + 1], view[c + 1]));
      for (let j = j0; j <= j1; j += 1) for (let i = i0; i <= i1; i += 1) fn(j * this.nx + i);
    };
    for (let t = 0; t < nTri; t += 1) span(t, c => { counts[c + 1] += 1; });
    for (let c = 1; c < counts.length; c += 1) counts[c] += counts[c - 1];
    this.cellStart = counts;
    this.cellTris = new Int32Array(counts[counts.length - 1]);
    const fill = counts.slice(0, counts.length - 1);
    for (let t = 0; t < nTri; t += 1) span(t, c => { this.cellTris[fill[c]++] = t; });
  }

  private col(u: number): number {
    return Math.min(this.nx - 1, Math.max(0, Math.floor((u - this.x0) / this.cell)));
  }

  private row(v: number): number {
    return Math.min(this.ny - 1, Math.max(0, Math.floor((v - this.y0) / this.cell)));
  }

  /**
   * True when a triangle covering (u, v) lies more than `eps` in front of
   * depth w. With `reach` > 0 a triangle within that screen distance also
   * counts, at the depth of its nearest point: a B-rep edge's curve bulges up
   * to the meshing tolerance past the chords of the triangulation that hides
   * it. Faces `own1` and `own2` (the line's own) do not count that way: next
   * to a tangent edge its own surface is steep enough to "hide" it.
   */
  hidden(u: number, v: number, w: number, eps: number, reach: number, own1: number, own2: number): boolean {
    const i0 = Math.floor((u - reach - this.x0) / this.cell);
    const i1 = Math.floor((u + reach - this.x0) / this.cell);
    const j0 = Math.floor((v - reach - this.y0) / this.cell);
    const j1 = Math.floor((v + reach - this.y0) / this.cell);
    for (let j = Math.max(0, j0); j <= Math.min(this.ny - 1, j1); j += 1) {
      for (let i = Math.max(0, i0); i <= Math.min(this.nx - 1, i1); i += 1) {
        if (this.hiddenIn(j * this.nx + i, u, v, w, eps, reach, own1, own2)) return true;
      }
    }
    return false;
  }

  private hiddenIn(
    c: number, u: number, v: number, w: number, eps: number, reach: number, own1: number, own2: number,
  ): boolean {
    const view = this.view;
    const tris = this.triangles;
    for (let k = this.cellStart[c]; k < this.cellStart[c + 1]; k += 1) {
      const t = this.cellTris[k];
      const a = tris[t * 3] * 3;
      const b = tris[t * 3 + 1] * 3;
      const p = tris[t * 3 + 2] * 3;
      const ax = view[a];
      const ay = view[a + 1];
      const e1x = view[b] - ax;
      const e1y = view[b + 1] - ay;
      const e2x = view[p] - ax;
      const e2y = view[p + 1] - ay;
      const det = e1x * e2y - e1y * e2x;
      let s = ((u - ax) * e2y - (v - ay) * e2x) / det;
      let r = (e1x * (v - ay) - e1y * (u - ax)) / det;
      if (s < -1e-9 || r < -1e-9 || s + r > 1 + 1e-9) {
        if (reach <= 0) continue;
        const face = this.triangleFace[t];
        if (face === own1 || face === own2) continue;
        const near = nearestOnTriangle(u - ax, v - ay, e1x, e1y, e2x, e2y);
        if (near.distance > reach) continue;
        s = near.s;
        r = near.r;
      }
      const depth = view[a + 2] + s * (view[b + 2] - view[a + 2]) + r * (view[p + 2] - view[a + 2]);
      if (depth > w + eps) return true;
    }
    return false;
  }
}

/** Nearest point to q of the triangle (0, e1, e2), as barycentrics s, r
 *  (point = s e1 + r e2) and its distance. */
function nearestOnTriangle(
  qx: number, qy: number, e1x: number, e1y: number, e2x: number, e2y: number,
): { s: number; r: number; distance: number } {
  let best = { s: 0, r: 0, distance: Infinity };
  const consider = (s: number, r: number): void => {
    const d = Math.hypot(s * e1x + r * e2x - qx, s * e1y + r * e2y - qy);
    if (d < best.distance) best = { s, r, distance: d };
  };
  const clamp = (x: number): number => Math.min(1, Math.max(0, x));
  // Edge 0 -> e1, edge 0 -> e2, edge e1 -> e2.
  consider(clamp((qx * e1x + qy * e1y) / (e1x * e1x + e1y * e1y || 1)), 0);
  consider(0, clamp((qx * e2x + qy * e2y) / (e2x * e2x + e2y * e2y || 1)));
  const fx = e2x - e1x;
  const fy = e2y - e1y;
  const t = clamp(((qx - e1x) * fx + (qy - e1y) * fy) / (fx * fx + fy * fy || 1));
  consider(1 - t, t);
  return best;
}

type LineClass = 'sharp' | 'outline' | 'smooth';

/**
 * Splits lines into visible and hidden runs by testing points every `step`
 * along them, then joins runs that meet end to end (so a facet crease along
 * many triangles comes back as one polyline).
 */
class LineSink {
  private readonly runs: Record<LineClass, [Polyline2[], Polyline2[]]> = {
    sharp: [[], []],
    outline: [[], []],
    smooth: [[], []],
  };

  private readonly view: Float64Array;
  private readonly occluders: OccluderGrid;
  private readonly step: number;
  private readonly withHidden: boolean;

  constructor(view: Float64Array, occluders: OccluderGrid, step: number, withHidden: boolean) {
    this.view = view;
    this.occluders = occluders;
    this.step = step;
    this.withHidden = withHidden;
  }

  add(kind: LineClass, line: Int32Array, eps: number, reach: number, own1: number, own2: number): void {
    const view = this.view;
    let run: Array<readonly [number, number]> = [];
    let runHidden = false;
    const flush = (): void => {
      if (run.length >= 2 && (!runHidden || this.withHidden)) this.runs[kind][runHidden ? 1 : 0].push(run);
    };
    for (let s = 0; s + 1 < line.length; s += 1) {
      const a = line[s] * 3;
      const b = line[s + 1] * 3;
      const len = Math.hypot(view[b] - view[a], view[b + 1] - view[a + 1]);
      const pieces = Math.max(1, Math.ceil(len / this.step));
      for (let k = 0; k < pieces; k += 1) {
        const t0 = k / pieces;
        const t1 = (k + 1) / pieces;
        const tm = (t0 + t1) / 2;
        const hidden = this.occluders.hidden(
          view[a] + (view[b] - view[a]) * tm,
          view[a + 1] + (view[b + 1] - view[a + 1]) * tm,
          view[a + 2] + (view[b + 2] - view[a + 2]) * tm,
          eps,
          reach,
          own1,
          own2,
        );
        const start: readonly [number, number] = [view[a] + (view[b] - view[a]) * t0, view[a + 1] + (view[b + 1] - view[a + 1]) * t0];
        const end: readonly [number, number] = [view[a] + (view[b] - view[a]) * t1, view[a + 1] + (view[b + 1] - view[a + 1]) * t1];
        if (run.length === 0) {
          run = [start, end];
          runHidden = hidden;
        } else if (hidden === runHidden) {
          // Pieces of one segment are collinear: extend instead of adding.
          if (k > 0) run[run.length - 1] = end;
          else run.push(end);
        } else {
          flush();
          run = [start, end];
          runHidden = hidden;
        }
      }
    }
    flush();
  }

  result(): MeshViewLines {
    const r = this.runs;
    return {
      visibleSharp: joinRuns(r.sharp[0]),
      visibleOutline: joinRuns(r.outline[0]),
      visibleSmooth: joinRuns(r.smooth[0]),
      hiddenSharp: joinRuns(r.sharp[1]),
      hiddenOutline: joinRuns(r.outline[1]),
      hiddenSmooth: joinRuns(r.smooth[1]),
    };
  }
}

/** Join polylines whose ends meet exactly where only two of them meet. */
export function joinRuns(runs: Polyline2[]): Polyline2[] {
  const key = (p: readonly [number, number]): string => `${p[0]},${p[1]}`;
  const ends = new Map<string, number[]>();
  runs.forEach((run, i) => {
    for (const p of [run[0], run[run.length - 1]]) {
      const k = key(p);
      const list = ends.get(k);
      if (list) list.push(i);
      else ends.set(k, [i]);
    }
  });
  const used = new Uint8Array(runs.length);
  const out: Polyline2[] = [];
  // Continue `chain` past its last point while exactly one other unused run
  // meets it there.
  const extend = (chain: Array<readonly [number, number]>, self: number): void => {
    for (;;) {
      const tail = chain[chain.length - 1];
      const at = ends.get(key(tail))!;
      if (at.length !== 2) return;
      const next = at[0] === self ? at[1] : at[0];
      if (next === self || used[next]) return;
      used[next] = 1;
      const run = runs[next];
      const forward = key(run[0]) === key(tail);
      const pts = forward ? run : [...run].reverse();
      for (let i = 1; i < pts.length; i += 1) chain.push(pts[i]);
      self = next;
    }
  };
  runs.forEach((run, i) => {
    if (used[i]) return;
    used[i] = 1;
    const chain: Array<readonly [number, number]> = [...run];
    extend(chain, i);
    chain.reverse();
    extend(chain, i);
    out.push(chain);
  });
  return out;
}
