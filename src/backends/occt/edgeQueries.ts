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
import { OcctBackend } from './occtBackend';
import { KernelError } from '../../intent/kernelError';

export type Vec3 = [number, number, number];

export type BoundingRegion = {
  xMin?: number; xMax?: number;
  yMin?: number; yMax?: number;
  zMin?: number; zMax?: number;
};

export type EdgeQuery = {
  atZ?: number;
  atX?: number;
  atY?: number;
  /**
   * Sort matching edges by distance to this point — closest first.
   * NOTE: this is a SORT, not a FILTER. `near` alone returns all edges
   * (sorted); combine with `within`, `tolerance`, or other keys to filter.
   * `selectEdge` uses `near` to pick a single result from multiple matches.
   */
  near?: Vec3;
  within?: BoundingRegion;
  parallel?: Vec3;
  perpendicular?: Vec3;
  convex?: boolean;
  concave?: boolean;
  minAngle?: number;     // dihedral, degrees
  maxAngle?: number;
  ofCurveType?: 'LINE' | 'CIRCLE' | 'BSPLINE';
  tolerance?: number;     // default 1.0
  angleTolerance?: number; // default 10 (degrees)
};

export type FaceQuery = {
  atZ?: number;
  atX?: number;
  atY?: number;
  parallelTo?: 'XY' | 'YZ' | 'XZ' | Vec3;
  inPlane?: 'XY' | 'YZ' | 'XZ';
  ofSurfaceType?: 'PLANE' | 'CYLINDER' | 'SPHERE' | 'CONE' | 'TORUS' | 'BSPLINE';
  containsPoint?: Vec3;
  near?: Vec3;
  tolerance?: number;
};

export type EdgeSegment = {
  id: string;
  midpoint: Vec3;
  direction: Vec3;
  length: number;
  curveType: string;
  convex: boolean | null;
  dihedralAngleDeg: number | null;
  normalA: Vec3 | null;
  normalB: Vec3 | null;
  boundary: boolean;
};

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
  return len > 0 ? [dx / len, dy / len, dz / len] : [0, 0, 0];
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
 */
export function resolveEdgeQuery(base: OcctBackend, query: EdgeQuery): Edge[] {
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
    edges = edges.filter(e => {
      const m = edgeMidpoint(e);
      if (w.xMin !== undefined && m[0] < w.xMin) return false;
      if (w.xMax !== undefined && m[0] > w.xMax) return false;
      if (w.yMin !== undefined && m[1] < w.yMin) return false;
      if (w.yMax !== undefined && m[1] > w.yMax) return false;
      if (w.zMin !== undefined && m[2] < w.zMin) return false;
      if (w.zMax !== undefined && m[2] > w.zMax) return false;
      return true;
    });
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
    edges = edges.filter(e => {
      const ct = (e as unknown as { geomType?: string }).geomType;
      return ct === query.ofCurveType;
    });
  }
  if (query.near) {
    const p = query.near;
    edges.sort((a, b) => distance(edgeMidpoint(a), p) - distance(edgeMidpoint(b), p));
  }

  // Convexity / dihedral filtering — kernel doesn't natively expose; compute on the fly.
  if (query.convex !== undefined || query.concave !== undefined ||
      query.minAngle !== undefined || query.maxAngle !== undefined) {
    edges = edges.filter(e => {
      const dihedral = computeDihedral(shape as unknown as { faces: Face[] }, e);
      if (dihedral === null) return query.convex === undefined && query.concave === undefined;
      if (query.convex === true && dihedral.convex !== true) return false;
      if (query.convex === false && dihedral.convex !== false) return false;
      if (query.concave === true && dihedral.convex !== false) return false;
      if (query.concave === false && dihedral.convex !== true) return false;
      if (query.minAngle !== undefined && dihedral.angleDeg < query.minAngle) return false;
      if (query.maxAngle !== undefined && dihedral.angleDeg > query.maxAngle) return false;
      return true;
    });
  }

  return edges;
}

/**
 * Compute dihedral angle for an edge (between its two adjacent faces).
 * Returns { angleDeg, convex } or null if edge is a boundary (single adjacent face)
 * or adjacency can't be determined.
 */
function computeDihedral(
  shape: { faces: Face[] },
  edge: Edge,
): { angleDeg: number; convex: boolean; normalA: Vec3; normalB: Vec3 } | null {
  // Find faces that contain this edge by walking each face's edge list.
  // Using face.edges (rather than face.outerWire().edges) avoids creating
  // intermediate Wire wrappers whose disposal can invalidate the parent face.
  const adjacent: Face[] = [];
  for (const face of shape.faces) {
    const faceEdges = (face as unknown as { edges?: Edge[] }).edges ?? [];
    if (faceEdges.some(we => isSameEdge(we, edge))) {
      adjacent.push(face);
      if (adjacent.length === 2) break;
    }
  }
  if (adjacent.length < 2) return null;
  const mid = edgeMidpoint(edge);
  const midPoint = { x: mid[0], y: mid[1], z: mid[2] } as unknown as Parameters<Face['normalAt']>[0];
  const nA = adjacent[0].normalAt(midPoint);
  const nB = adjacent[1].normalAt(midPoint);
  const a: Vec3 = [nA.x, nA.y, nA.z];
  const b: Vec3 = [nB.x, nB.y, nB.z];
  const cosAng = a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const angleDeg = (Math.acos(Math.max(-1, Math.min(1, cosAng))) * 180) / Math.PI;
  // Convexity test (orientation-independent): for a closed solid with outward
  // face normals, an edge is convex iff the average normal (nA + nB) points
  // away from the face centroids (i.e., outward from the solid). Compare the
  // direction (mid - faceCentroid) against (nA + nB).
  const cA: Vec3 = [adjacent[0].center.x, adjacent[0].center.y, adjacent[0].center.z];
  const cB: Vec3 = [adjacent[1].center.x, adjacent[1].center.y, adjacent[1].center.z];
  const centroid: Vec3 = [(cA[0] + cB[0]) / 2, (cA[1] + cB[1]) / 2, (cA[2] + cB[2]) / 2];
  const outward: Vec3 = [mid[0] - centroid[0], mid[1] - centroid[1], mid[2] - centroid[2]];
  const sumN: Vec3 = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sign = sumN[0]*outward[0] + sumN[1]*outward[1] + sumN[2]*outward[2];
  return { angleDeg: 180 - angleDeg, convex: sign >= 0, normalA: a, normalB: b };
}

function isSameEdge(a: Edge, b: Edge): boolean {
  // Heuristic: edges are the same if both endpoints match within 1e-6.
  const af = a.startPoint, al = a.endPoint;
  const bf = b.startPoint, bl = b.endPoint;
  const eq = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) =>
    Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6 && Math.abs(p.z - q.z) < 1e-6;
  return (eq(af, bf) && eq(al, bl)) || (eq(af, bl) && eq(al, bf));
}

/**
 * Public re-export of the dihedral helper for label resolvers that need
 * convexity information without going through the full toEdgeSegment shape.
 */
export function computeDihedralPublic(shape: { faces: Face[] }, edge: Edge): { angleDeg: number; convex: boolean; normalA: Vec3; normalB: Vec3 } | null {
  return computeDihedral(shape, edge);
}

/**
 * Resolve a FaceQuery against an OcctBackend shape. AND-combined.
 */
export function resolveFaceQuery(base: OcctBackend, query: FaceQuery): Face[] {
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
    const target: Vec3 = typeof query.parallelTo === 'string'
      ? planeNormal(query.parallelTo)
      : query.parallelTo;
    faces = faces.filter(f => {
      const n = f.normalAt();
      return isParallel([n.x, n.y, n.z], target, 10);
    });
  }
  if (query.inPlane) {
    const target = planeNormal(query.inPlane);
    const angleTol = 10; // degrees
    faces = faces.filter(f => {
      const n = f.normalAt();
      return isParallel([n.x, n.y, n.z], target, angleTol);
    });
  }
  if (query.ofSurfaceType) {
    faces = faces.filter(f => (f as unknown as { geomType?: string }).geomType === query.ofSurfaceType);
  }
  if (query.containsPoint) {
    const p = query.containsPoint;
    faces = faces.filter(f => {
      try {
        f.uvCoordinates({ x: p[0], y: p[1], z: p[2] } as unknown as Parameters<Face['uvCoordinates']>[0]);
        return true;
      } catch {
        return false;
      }
    });
  }
  if (query.near) {
    const p = query.near;
    faces.sort((a, b) => distance(vec(a.center), p) - distance(vec(b.center), p));
  }

  return faces;
}

function planeNormal(name: 'XY' | 'YZ' | 'XZ'): Vec3 {
  if (name === 'XY') return [0, 0, 1];
  if (name === 'YZ') return [1, 0, 0];
  return [0, 1, 0];
}

/**
 * Convert an Edge to an EdgeSegment (the agent-facing summary).
 * The `id` is a stable index within this lowering — derived from edge order.
 */
export function toEdgeSegment(edge: Edge, index: number, shape: { faces: Face[] }): EdgeSegment {
  const dihedral = computeDihedral(shape, edge);
  return {
    id: `e${index}`,
    midpoint: edgeMidpoint(edge),
    direction: edgeDirection(edge),
    length: edge.length ?? 0,
    curveType: (edge as unknown as { geomType?: string }).geomType ?? 'UNKNOWN',
    convex: dihedral?.convex ?? null,
    dihedralAngleDeg: dihedral?.angleDeg ?? null,
    normalA: dihedral?.normalA ?? null,
    normalB: dihedral?.normalB ?? null,
    boundary: dihedral === null,
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
      'feature.edge-feature.no-edges-match',
      'selectEdge: no edges matched query (zero results)',
    );
  }
  // When `near` is provided, treat it as a disambiguator: pick the closest
  // match rather than throwing. Otherwise, multiple matches are ambiguous.
  if (matches.length > 1) {
    if (query.near !== undefined) return matches[0];
    throw new KernelError(
      'feature.edge-feature.ambiguous-selection',
      `selectEdge: ambiguous query — ${matches.length} edges matched`,
    );
  }
  return matches[0];
}
