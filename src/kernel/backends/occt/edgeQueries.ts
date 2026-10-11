// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/backends/occt/edgeQueries.ts
//
// Query-based edge/face selection. Maps typed query keys to the kernel's
// EdgeFinder / FaceFinder primitives, then applies any filters the kernel
// finder doesn't natively expose (convex/concave, dihedral angle, AND-compose).
//
// Resolution path is shared by:
//   - Inline queries: shape.fillet(2, { atZ: 5 })
//   - Pre-selected segments: selectEdges(shape, { ... }) -> EdgeSegment[]
//   - Label sugar: shape.fillet(2, { face: 'rim' })
//     (label translates to probe-point query in occtLowerer.ts)

import type { Edge, Face } from 'replicad';
import { getOC, makeVertex, measureArea, measureDistanceBetween } from 'replicad';
import type { OcctBackend } from './occtBackend';
import { KernelError } from '../../../shared/intent/kernelError';
import type { Vec3 } from '../../../shared/intent/types';
export type { Vec3 };

// Type definitions live in src/shared/intent/queryTypes.ts so intent types
// (featureRecord, queryKeys, types) can reference FaceQuery/EdgeQuery without
// an upward shared→kernel dep. Re-exported here for back-compat with all
// existing kernel-relative imports.
export type { BoundingRegion, EdgeQuery, FaceQuery, EdgeSegment } from '../../../shared/intent/queryTypes';
import type { BoundingRegion, EdgeQuery, FaceQuery, EdgeSegment } from '../../../shared/intent/queryTypes';
import {
  canonicalCurveType,
  canonicalSurfaceType,
  normalizeEdgeQuery,
  normalizeFaceQuery,
  type NormalizedEdgeQuery,
} from '../../../shared/intent/queryNormalize';

const DEFAULT_POS_TOL = 1.0;

function vec(p: { x: number; y: number; z: number }): Vec3 {
  return [p.x, p.y, p.z];
}

function edgeMidpoint(edge: Edge): Vec3 {
  // Geometric midpoint of endpoints — sufficient for atZ/atX/atY matching at
  // typical CAD scales. Arc/spline edges use straight-line midpoint of endpoints.
  const f = edge.startPoint;
  const l = edge.endPoint;
  return [(f.x + l.x) / 2, (f.y + l.y) / 2, (f.z + l.z) / 2];
}

function edgeDirection(edge: Edge): Vec3 {
  const f = edge.startPoint;
  const l = edge.endPoint;
  const dx = l.x - f.x, dy = l.y - f.y, dz = l.z - f.z;
  const len = Math.hypot(dx, dy, dz);
  // Closed edges (full circles) have start == end up to float noise; a
  // normalised noise vector would masquerade as a real direction.
  return len > 1e-9 ? [dx / len, dy / len, dz / len] : [0, 0, 0];
}

function isParallel(a: Vec3, b: Vec3, angleTolDeg: number): boolean {
  const dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const aLen = Math.hypot(...a);
  const bLen = Math.hypot(...b);
  if (aLen < 1e-9 || bLen < 1e-9) return false;
  const cosAng = Math.abs(dot) / (aLen * bLen);
  const maxCos = Math.cos((angleTolDeg * Math.PI) / 180);
  return cosAng >= maxCos;
}

function isPerpendicular(a: Vec3, b: Vec3, angleTolDeg: number): boolean {
  const dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const aLen = Math.hypot(...a);
  const bLen = Math.hypot(...b);
  if (aLen < 1e-9 || bLen < 1e-9) return false;
  const cosAng = Math.abs(dot) / (aLen * bLen);
  const tol = Math.sin((angleTolDeg * Math.PI) / 180);
  return cosAng <= tol;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Resolve an EdgeQuery against an OcctBackend shape. Returns matching Edge
 * instances. Multiple keys are AND-combined.
 *
 * The query is validated + normalised first (`normalizeEdgeQuery`): unknown
 * keys, ill-typed values, and empty regions throw `feature.invalid-args`
 * instead of silently degrading the selection; axis letters, `parallelTo`,
 * `{ min, max }` regions and geometry-type aliases are resolved here.
 */
export function resolveEdgeQuery(base: OcctBackend, rawQuery: EdgeQuery): Edge[] {
  const query = normalizeEdgeQuery(rawQuery);
  const tol = query.tolerance ?? DEFAULT_POS_TOL;
  const angleTol = query.angleTolerance ?? 10;
  const shape = base.getReplicadShape();
  let edges: Edge[] = (shape as unknown as { edges: Edge[] }).edges;

  if (query.atZ !== undefined) {
    const z = query.atZ;
    edges = edges.filter(e => Math.abs(edgeMidpoint(e)[2] - z) <= tol);
  }
  if (query.atX !== undefined) {
    const x = query.atX;
    edges = edges.filter(e => Math.abs(edgeMidpoint(e)[0] - x) <= tol);
  }
  if (query.atY !== undefined) {
    const y = query.atY;
    edges = edges.filter(e => Math.abs(edgeMidpoint(e)[1] - y) <= tol);
  }
  if (query.within) {
    const w = query.within;
    edges = edges.filter(e => pointInRegion(edgeMidpoint(e), w));
  }
  if (query.parallel) {
    const p = query.parallel;
    edges = edges.filter(e => isParallel(edgeDirection(e), p, angleTol));
  }
  if (query.perpendicular) {
    const p = query.perpendicular;
    edges = edges.filter(e => isPerpendicular(edgeDirection(e), p, angleTol));
  }
  if (query.ofCurveType) {
    const wanted = query.ofCurveType;
    edges = edges.filter(e => canonicalCurveType((e as unknown as { geomType?: string }).geomType) === wanted);
  }
  if (query.near) {
    const p = query.near;
    edges.sort((a, b) => distance(edgeMidpoint(a), p) - distance(edgeMidpoint(b), p));
  }

  // Convexity / dihedral filtering — kernel doesn't natively expose; compute on the fly.
  if (query.convex !== undefined || query.concave !== undefined ||
      query.minAngle !== undefined || query.maxAngle !== undefined) {
    edges = edges.filter(e => dihedralMatches(shape as unknown as { faces: Face[] }, e, query));
  }

  return edges;
}

function pointInRegion(m: Vec3, w: BoundingRegion): boolean {
  if (w.xMin !== undefined && m[0] < w.xMin) return false;
  if (w.xMax !== undefined && m[0] > w.xMax) return false;
  if (w.yMin !== undefined && m[1] < w.yMin) return false;
  if (w.yMax !== undefined && m[1] > w.yMax) return false;
  if (w.zMin !== undefined && m[2] < w.zMin) return false;
  if (w.zMax !== undefined && m[2] > w.zMax) return false;
  return true;
}

function dihedralMatches(shape: { faces: Face[] }, e: Edge, query: NormalizedEdgeQuery): boolean {
  const wantsConvexity = query.convex !== undefined || query.concave !== undefined;
  const dihedral = computeDihedral(shape, e, { convexity: wantsConvexity });
  if (dihedral === null) return !wantsConvexity;
  if (query.convex === true && dihedral.convex !== true) return false;
  if (query.convex === false && dihedral.convex !== false) return false;
  if (query.concave === true && dihedral.convex !== false) return false;
  if (query.concave === false && dihedral.convex !== true) return false;
  if (query.minAngle !== undefined && dihedral.angleDeg < query.minAngle) return false;
  if (query.maxAngle !== undefined && dihedral.angleDeg > query.maxAngle) return false;
  return true;
}

/** Result of {@link computeDihedral}. `convex` is null when convexity was
 *  not requested or could not be decided (e.g. a seam edge). Normals are
 *  unit vectors (OCCT's raw surface normal carries the parametric scale —
 *  a radius-10 cylinder reports |n| = 10). */
export interface EdgeDihedral {
  angleDeg: number;
  convex: boolean | null;
  normalA: Vec3;
  normalB: Vec3;
}

function unit(v: Vec3): Vec3 | null {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len > 1e-12 ? [v[0] / len, v[1] / len, v[2] / len] : null;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Edge → adjacent faces of one shape, built in a single pass. */
interface EdgeFaceIndex {
  /** OCCT edge hash → entries (the hash is orientation-independent). */
  readonly byHash: Map<number, { edge: unknown; faces: Face[] }[]>;
}

const HASH_UPPER = 2147483647;

/** Cached per replicad shape wrapper: a query over every edge used to rescan
 *  every face's edges per edge (and re-materialise every Face / Edge wrapper
 *  each time), which made a 144-hole plate's { convex: true } take ~35 s. */
const edgeFaceIndexCache = new WeakMap<object, EdgeFaceIndex>();

type WrappedShape = { HashCode(upper: number): number; IsSame(other: unknown): boolean };

function edgeFaceIndexOf(shape: { faces: Face[] }): EdgeFaceIndex {
  const hit = edgeFaceIndexCache.get(shape);
  if (hit) return hit;
  const byHash = new Map<number, { edge: unknown; faces: Face[] }[]>();
  // Using face.edges (rather than face.outerWire().edges) avoids creating
  // intermediate Wire wrappers whose disposal can invalidate the parent face.
  for (const face of shape.faces) {
    const faceEdges = (face as unknown as { edges?: Edge[] }).edges ?? [];
    for (const faceEdge of faceEdges) {
      const wrapped = (faceEdge as unknown as { wrapped: WrappedShape }).wrapped;
      const hash = wrapped.HashCode(HASH_UPPER);
      let bucket = byHash.get(hash);
      if (!bucket) {
        bucket = [];
        byHash.set(hash, bucket);
      }
      let entry = bucket.find((x) => (x.edge as WrappedShape).IsSame(wrapped));
      if (!entry) {
        entry = { edge: wrapped, faces: [] };
        bucket.push(entry);
      }
      if (!entry.faces.includes(face)) entry.faces.push(face);
    }
  }
  const index = { byHash };
  edgeFaceIndexCache.set(shape, index);
  return index;
}

/** The (up to two) faces whose boundary contains `edge`. */
function adjacentFacesOf(shape: { faces: Face[] }, edge: Edge): Face[] {
  const wrapped = (edge as unknown as { wrapped?: WrappedShape }).wrapped;
  if (wrapped && typeof wrapped.HashCode === 'function') {
    const bucket = edgeFaceIndexOf(shape).byHash.get(wrapped.HashCode(HASH_UPPER)) ?? [];
    const entry = bucket.find((x) => (x.edge as WrappedShape).IsSame(wrapped));
    if (entry) return entry.faces.slice(0, 2);
  }
  // An edge from another wrapper (not a sub-shape of this one): geometric match.
  const adjacent: Face[] = [];
  for (const face of shape.faces) {
    const faceEdges = (face as unknown as { edges?: Edge[] }).edges ?? [];
    if (faceEdges.some(we => isSameEdge(we, edge))) {
      adjacent.push(face);
      if (adjacent.length === 2) break;
    }
  }
  return adjacent;
}

/** A point ON the edge at mid-parameter. The chord midpoint used by the
 *  position filters is off-curve for arcs and coincides with the seam start
 *  point on full circles, where `normalAt` throws. */
function edgeInteriorPoint(edge: Edge): Vec3 {
  try {
    return vec(edge.pointAt(0.5));
  } catch {
    return edgeMidpoint(edge);
  }
}

function unitNormalAt(face: Face, p: Vec3): Vec3 | null {
  try {
    // Pass a [x, y, z] tuple: replicad's point coercion reads a plain
    // { x, y, z } object as the ORIGIN, which is how the old dihedral code
    // evaluated every normal at (0,0,0).
    const n = face.normalAt(p);
    return unit([n.x, n.y, n.z]);
  } catch {
    // OCCT/replicad throws non-Error C++ Standard_Failure (raw WASM pointer)
    // when normalAt hits a parametric singularity. Treat as undetermined.
    return null;
  }
}

/** Distance from a point to a (trimmed) face, via BRepExtrema. */
function distanceToFace(face: Face, p: Vec3): number {
  const v = makeVertex(p);
  try {
    return measureDistanceBetween(face, v);
  } finally {
    (v as unknown as { delete?: () => void }).delete?.();
  }
}

/**
 * Convexity of the edge between faces A and B (outward normals nA, nB):
 * step off the edge INTO face A along the in-surface normal to the edge,
 * then ask which side of face B's tangent plane that step lands on. Convex
 * iff the step goes below B's plane (dot(step, nB) < 0). The in-face side is
 * picked by measuring which of ±step actually lies on the trimmed face A, so
 * holed / non-convex faces (a pocket rim on a plate top) are classified
 * correctly — the old centroid heuristic got those backwards.
 */
function convexityOf(faceA: Face, edge: Edge, p: Vec3, nA: Vec3, nB: Vec3): boolean | null {
  let t: Vec3 | null;
  try {
    const tv = edge.tangentAt(0.5);
    t = unit([tv.x, tv.y, tv.z]);
  } catch {
    t = null;
  }
  if (!t) return null;
  const side = unit(cross(nA, t));
  if (!side) return null;
  let len = 1;
  try { len = edge.length; } catch { /* keep default */ }
  const eps = Math.min(Math.max(len * 1e-3, 1e-4), 1e-2);
  const plus: Vec3 = [p[0] + side[0] * eps, p[1] + side[1] * eps, p[2] + side[2] * eps];
  const minus: Vec3 = [p[0] - side[0] * eps, p[1] - side[1] * eps, p[2] - side[2] * eps];
  // One distance query when the +side step is off the face (the common
  // case for half the edges); the second only to tell a seam from a rim.
  let inward: Vec3;
  try {
    const onFace = eps * 0.25;
    if (distanceToFace(faceA, plus) > onFace) {
      inward = [-side[0], -side[1], -side[2]];
    } else if (distanceToFace(faceA, minus) > onFace) {
      inward = side;
    } else {
      return null; // both sides on the face: a seam — undecidable here
    }
  } catch {
    return null;
  }
  const d = dot3(inward, nB);
  if (Math.abs(d) < 1e-9) return null; // tangent (G1) — neither convex nor concave
  return d < 0;
}

/**
 * Compute dihedral angle for an edge (between its two adjacent faces).
 * Returns null if the edge is a boundary (single adjacent face) or the
 * normals can't be evaluated. `opts.convexity: false` skips the (costlier)
 * convexity classification and reports `convex: null`.
 */
function computeDihedral(
  shape: { faces: Face[] },
  edge: Edge,
  opts: { convexity?: boolean } = {},
): EdgeDihedral | null {
  const adjacent = adjacentFacesOf(shape, edge);
  if (adjacent.length < 2) return null;
  const p = edgeInteriorPoint(edge);
  const a = unitNormalAt(adjacent[0], p);
  const b = unitNormalAt(adjacent[1], p);
  if (!a || !b) return null;
  const cosAng = dot3(a, b);
  const angleDeg = (Math.acos(Math.max(-1, Math.min(1, cosAng))) * 180) / Math.PI;
  const convex = opts.convexity === false ? null : convexityOf(adjacent[0], edge, p, a, b);
  return { angleDeg: 180 - angleDeg, convex, normalA: a, normalB: b };
}

/** True when the edge bounds exactly one face — an open (sheet / shell)
 *  boundary. A seam edge (one face on both sides, e.g. the vertical seam of
 *  a cylinder; OCCT lists it once per face) is NOT a boundary. */
export function isBoundaryEdge(shape: { faces: Face[] }, edge: Edge): boolean {
  const adjacent = adjacentFacesOf(shape, edge);
  if (adjacent.length !== 1) return adjacent.length === 0;
  try {
    const oc = getOC() as unknown as {
      BRep_Tool: { IsClosed_2(e: unknown, f: unknown): boolean };
    };
    const faceEdge = ((adjacent[0] as unknown as { edges?: Edge[] }).edges ?? [])
      .find((we) => isSameEdge(we, edge));
    const e = (faceEdge ?? edge) as unknown as { wrapped: unknown };
    const f = adjacent[0] as unknown as { wrapped: unknown };
    return !oc.BRep_Tool.IsClosed_2(e.wrapped, f.wrapped);
  } catch {
    return true;
  }
}

/**
 * Geometric edge identity check via endpoint comparison.
 *
 * Two edges are considered the same if their endpoints match (in either
 * orientation) and their mid-parameter points match, within an absolute
 * tolerance of 1e-6. This is mm-scale
 * (1e-6 mm = 1 nanometer) — appropriate for all kernelCAD work today,
 * which operates exclusively in millimeters. Callers working at radically
 * different scales would need a parameterized tolerance.
 *
 * Used to identify "the same edge" across separate Replicad shape wrappers,
 * because Replicad allocates fresh Edge objects on each `.edges` access
 * (no stable identity between iterations).
 */
export function isSameEdge(a: Edge, b: Edge): boolean {
  const af = a.startPoint, al = a.endPoint;
  const bf = b.startPoint, bl = b.endPoint;
  const eq = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) =>
    Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6 && Math.abs(p.z - q.z) < 1e-6;
  if (!((eq(af, bf) && eq(al, bl)) || (eq(af, bl) && eq(al, bf)))) return false;
  // Shared endpoints are not enough: the two halves of a split circle (and
  // any closed edge vs another closed edge through the same vertex) share
  // both endpoints. Compare the mid-parameter point too — it is independent
  // of edge orientation.
  try {
    return eq(a.pointAt(0.5), b.pointAt(0.5));
  } catch {
    return true;
  }
}

/**
 * Public re-export of the dihedral helper for label resolvers that need
 * convexity information without going through the full toEdgeSegment shape.
 */
export function computeDihedralPublic(
  shape: { faces: Face[] },
  edge: Edge,
  opts: { convexity?: boolean } = {},
): EdgeDihedral | null {
  return computeDihedral(shape, edge, opts);
}

/** Unit outward normal of a face at its UV-centre (null if undefined). */
export function faceUnitNormal(f: Face): Vec3 | null {
  try {
    const n = f.normalAt();
    return unit([n.x, n.y, n.z]);
  } catch {
    return null;
  }
}

/**
 * Resolve a FaceQuery against an OcctBackend shape. AND-combined.
 *
 * Validated + normalised first (`normalizeFaceQuery`): unknown keys and
 * ill-typed values throw `feature.invalid-args`; axis letters, the EdgeQuery
 * spelling `parallel`, `{ min, max }` regions, and public surface names
 * (`'CYLINDER'` ≡ OCCT `'CYLINDRE'`) are resolved here.
 */
export function resolveFaceQuery(base: OcctBackend, rawQuery: FaceQuery): Face[] {
  const query = normalizeFaceQuery(rawQuery);
  const tol = query.tolerance ?? DEFAULT_POS_TOL;
  const shape = base.getReplicadShape();
  let faces: Face[] = (shape as unknown as { faces: Face[] }).faces;

  if (query.atZ !== undefined) {
    const z = query.atZ;
    faces = faces.filter(f => Math.abs(vec(f.center)[2] - z) <= tol);
  }
  if (query.atX !== undefined) {
    const x = query.atX;
    faces = faces.filter(f => Math.abs(vec(f.center)[0] - x) <= tol);
  }
  if (query.atY !== undefined) {
    const y = query.atY;
    faces = faces.filter(f => Math.abs(vec(f.center)[1] - y) <= tol);
  }
  if (query.parallelTo) {
    const target = query.parallelTo;
    faces = faces.filter(f => {
      const n = faceUnitNormal(f);
      return n !== null && isParallel(n, target, 10);
    });
  }
  if (query.inPlane) {
    const target = query.inPlane;
    faces = faces.filter(f => {
      const n = faceUnitNormal(f);
      return n !== null && isParallel(n, target, 10);
    });
  }
  if (query.ofSurfaceType) {
    const wanted = query.ofSurfaceType;
    faces = faces.filter(f => canonicalSurfaceType((f as unknown as { geomType?: string }).geomType) === wanted);
  }
  if (query.containsPoint) {
    // Distance to the TRIMMED face, within the position tolerance. (This
    // used to call uvCoordinates with an {x,y,z} object, which replicad reads
    // as the origin — so every face "contained" every point.)
    const p = query.containsPoint;
    faces = faces.filter(f => {
      try {
        return distanceToFace(f, p) <= tol;
      } catch {
        return false;
      }
    });
  }
  if (query.near) {
    const p = query.near;
    faces.sort((a, b) => distance(vec(a.center), p) - distance(vec(b.center), p));
  }

  // v0.2-finish additions ------------------------------------------------
  if (query.byNormal !== undefined) {
    const axisVec = unit(query.byNormal) ?? query.byNormal;
    // byNormal uses a fixed cosine threshold (0.01 ≈ 8°) rather than honoring
    // query.tolerance because the latter is documented as a position tolerance
    // in millimetres (default 1.0 — see top of FaceQuery type), not a unit-vector
    // threshold. Conflating units would let `tolerance: 1.0` mean "accept any
    // front-hemisphere face" (dot > 0).
    const normalTol = 0.01;
    faces = faces.filter(f => {
      const n = faceUnitNormal(f);
      return n !== null && dot3(n, axisVec) > 1 - normalTol;
    });
  }
  if (query.minArea !== undefined) {
    const min = query.minArea;
    faces = faces.filter(f => measureArea(f) >= min);
  }
  if (query.maxArea !== undefined) {
    const max = query.maxArea;
    faces = faces.filter(f => measureArea(f) <= max);
  }
  if (query.boundingBoxIn !== undefined) {
    const r = query.boundingBoxIn;
    faces = faces.filter(f => {
      const [minP, maxP] = f.boundingBox.bounds;
      if (r.xMin !== undefined && minP[0] < r.xMin) return false;
      if (r.xMax !== undefined && maxP[0] > r.xMax) return false;
      if (r.yMin !== undefined && minP[1] < r.yMin) return false;
      if (r.yMax !== undefined && maxP[1] > r.yMax) return false;
      if (r.zMin !== undefined && minP[2] < r.zMin) return false;
      if (r.zMax !== undefined && maxP[2] > r.zMax) return false;
      return true;
    });
  }

  return faces;
}

/**
 * Circle geometry of a CIRCLE edge: centre, unit axis, and radius (mm).
 *
 * Read off three points sampled at t = 0, 1/3, 2/3 of the edge's parametric
 * domain and solved as the triangle circumcircle. Exact for circular geometry
 * (any three distinct points on a circle determine it), and it needs no OCCT
 * symbol beyond the `pointAt` replicad already exposes. The axis follows the
 * curve's parametrisation (right-hand rule).
 *
 * Returns undefined for every non-CIRCLE curve type — an approximate radius
 * for a spline or a line would be a lie the selector algebra would then sort
 * on. Absent is honest; wrong is not.
 */
function circleGeometry(edge: Edge): { center: Vec3; axis: Vec3; radius: number } | undefined {
  if ((edge as unknown as { geomType?: string }).geomType !== 'CIRCLE') return undefined;
  try {
    const a = vec(edge.pointAt(0));
    const b = vec(edge.pointAt(1 / 3));
    const c = vec(edge.pointAt(2 / 3));
    const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const w = cross(u, v);
    const w2 = dot3(w, w);
    if (w2 < 1e-24) return undefined; // collinear samples — degenerate
    // Circumcentre: a + ((|u|² v − |v|² u) × w) / (2 |w|²).
    const uu = dot3(u, u);
    const vv = dot3(v, v);
    const k = cross([uu * v[0] - vv * u[0], uu * v[1] - vv * u[1], uu * v[2] - vv * u[2]], w);
    const center: Vec3 = [a[0] + k[0] / (2 * w2), a[1] + k[1] / (2 * w2), a[2] + k[2] / (2 * w2)];
    const radius = distance(center, a);
    const axis = unit(w);
    if (!axis || !Number.isFinite(radius)) return undefined;
    return { center, axis, radius };
  } catch {
    // Same defensive posture as computeDihedral: replicad/OCCT throws raw
    // Standard_Failure pointers on degenerate curves.
    return undefined;
  }
}

/**
 * Convert an Edge to an EdgeSegment (the agent-facing summary).
 * The `id` is a stable index within this lowering — derived from edge order.
 *
 * Circles additionally carry `center`, `axis` and `radius`, and report the
 * axis as `direction` (a chord direction is zero on a full circle and
 * meaningless on an arc). `boundary` is true only when the edge bounds a
 * single face — an edge whose dihedral is merely undeterminable (a seam) is
 * not a boundary.
 */
export function toEdgeSegment(edge: Edge, index: number, shape: { faces: Face[] }): EdgeSegment {
  const dihedral = computeDihedral(shape, edge);
  const circle = circleGeometry(edge);
  const curveType = (edge as unknown as { geomType?: string }).geomType ?? 'UNKNOWN';
  return {
    id: `e${index}`,
    midpoint: edgeMidpoint(edge),
    direction: circle ? circle.axis : edgeDirection(edge),
    length: edge.length ?? 0,
    curveType,
    ...(circle ? { radius: circle.radius, center: circle.center, axis: circle.axis } : {}),
    convex: dihedral?.convex ?? null,
    dihedralAngleDeg: dihedral?.angleDeg ?? null,
    normalA: dihedral?.normalA ?? null,
    normalB: dihedral?.normalB ?? null,
    boundary: dihedral !== null ? false : isBoundaryEdge(shape, edge),
  };
}

export function selectEdges(base: OcctBackend, query: EdgeQuery = {}): EdgeSegment[] {
  const shape = base.getReplicadShape();
  const allEdges: Edge[] = (shape as unknown as { edges: Edge[] }).edges;
  const matched = resolveEdgeQuery(base, query);
  return matched.map(e => {
    // Replicad's `.edges` getter materializes new Edge wrappers per access, so
    // `indexOf` won't find a match by reference. Resolve by geometric identity
    // (endpoint coincidence) against `allEdges` — this matches how the lowerer
    // resolves segment IDs back to Edge instances on the next lowering.
    let idx = allEdges.indexOf(e);
    if (idx === -1) {
      idx = allEdges.findIndex(other => isSameEdge(other, e));
    }
    return toEdgeSegment(e, idx, shape as unknown as { faces: Face[] });
  });
}

export function selectEdge(base: OcctBackend, query: EdgeQuery): EdgeSegment {
  const matches = selectEdges(base, query);
  if (matches.length === 0) {
    throw new KernelError(
      'feature.selection.no-match',
      'selectEdge: no edges matched query (zero results)',
    );
  }
  // When `near` is provided, treat it as a disambiguator: pick the closest
  // match rather than throwing. Otherwise, multiple matches are ambiguous.
  if (matches.length > 1) {
    if (query.near !== undefined) return matches[0];
    throw new KernelError(
      'feature.selection.ambiguous',
      `selectEdge: ambiguous query — ${matches.length} edges matched`,
    );
  }
  return matches[0];
}
