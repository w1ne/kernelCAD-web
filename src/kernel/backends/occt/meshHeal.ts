// src/kernel/backends/occt/meshHeal.ts
//
// Mesh-level crack healing + watertight verification for export meshes.
//
// Defect model (validated on the spice-carousel regression corpus):
// OCCT's per-face tessellation read-back can leave T-junction cracks at
// tangent junctions — a boundary vertex of one face lies in the interior of
// a boundary edge of the neighbor — and faces the whole-shape mesher fails
// to triangulate at all. After the position-key weld in meshShapeForExport,
// those cracks show up as mesh edges whose triangle-use count != 2
// (count 1 = open edge, count 3 = an edge one side subdivided and the other
// didn't). stitchCracks splits the owning triangle at the offending vertex
// and iterates to a fixpoint; verifyWatertight reports what remains.

import type { MeshData } from './exportStlBinary';

export interface EditableMesh {
  vertices: number[];
  triangles: number[];
}

export interface CrackCluster {
  /** Centroid (xyz, model units) of the cluster's crack-edge midpoints. */
  center: [number, number, number];
  /** Number of crack edges in this cluster. */
  edgeCount: number;
}

export interface WatertightReport {
  ok: boolean;
  /** Count of mesh edges not shared by exactly two triangles. */
  openEdgeCount: number;
  /** Up to 5 largest crack clusters (connected components over shared vertices). */
  clusters: CrackCluster[];
}

interface CrackEdge {
  count: number;
  tris: number[];
  u: number;
  v: number;
}

function collectCrackEdges(triangles: ArrayLike<number>): Map<string, CrackEdge> {
  const edges = new Map<string, CrackEdge>();
  const triCount = Math.floor(triangles.length / 3);
  for (let t = 0; t < triCount; t++) {
    const a = triangles[t * 3];
    const b = triangles[t * 3 + 1];
    const c = triangles[t * 3 + 2];
    for (const [u, v] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const key = u < v ? `${u}|${v}` : `${v}|${u}`;
      let e = edges.get(key);
      if (!e) {
        e = { count: 0, tris: [], u, v };
        edges.set(key, e);
      }
      e.count++;
      e.tris.push(t);
    }
  }
  for (const [key, e] of edges) if (e.count === 2) edges.delete(key);
  return edges;
}

/**
 * O(n) edge-adjacency watertight check with a structured report.
 * Same predicate as assertWatertight (every undirected edge shared by
 * exactly two triangles) plus open-edge count and crack-cluster locations.
 */
export function verifyWatertight(mesh: MeshData): WatertightReport {
  const cracks = collectCrackEdges(mesh.triangles);
  if (cracks.size === 0) return { ok: true, openEdgeCount: 0, clusters: [] };
  // Cluster crack edges by shared vertices (union-find).
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let r = x;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(Math.max(ra, rb), Math.min(ra, rb));
  };
  for (const e of cracks.values()) {
    if (!parent.has(e.u)) parent.set(e.u, e.u);
    if (!parent.has(e.v)) parent.set(e.v, e.v);
    union(e.u, e.v);
  }
  const acc = new Map<number, { sx: number; sy: number; sz: number; n: number }>();
  const V = mesh.vertices;
  for (const e of cracks.values()) {
    const root = find(e.u);
    let a = acc.get(root);
    if (!a) {
      a = { sx: 0, sy: 0, sz: 0, n: 0 };
      acc.set(root, a);
    }
    a.sx += (V[e.u * 3] + V[e.v * 3]) / 2;
    a.sy += (V[e.u * 3 + 1] + V[e.v * 3 + 1]) / 2;
    a.sz += (V[e.u * 3 + 2] + V[e.v * 3 + 2]) / 2;
    a.n++;
  }
  const clusters: CrackCluster[] = [...acc.values()]
    .sort((x, y) => y.n - x.n)
    .slice(0, 5)
    .map(a => ({
      center: [a.sx / a.n, a.sy / a.n, a.sz / a.n] as [number, number, number],
      edgeCount: a.n,
    }));
  return { ok: false, openEdgeCount: cracks.size, clusters };
}

function distPointSegInterior(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
): number {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const len2 = abx * abx + aby * aby + abz * abz;
  const t = len2 === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby + (pz - az) * abz) / len2;
  if (t <= 1e-9 || t >= 1 - 1e-9) return Infinity; // endpoints handled by the weld, not the stitch
  const qx = ax + t * abx, qy = ay + t * aby, qz = az + t * abz;
  return Math.hypot(px - qx, py - qy, pz - qz);
}

/**
 * T-junction crack stitch. For every crack edge (use-count != 2), find a
 * crack vertex lying on the edge's interior within `tol` and split ONE
 * triangle using the edge at that vertex; repeat to fixpoint. Mutates
 * `mesh.triangles` in place (append + rewrite). Returns total splits.
 *
 * tol = 0.05 mm: above the relative-deflection chord error of the export
 * mesher on the regression corpus, well below feature size.
 */
export function stitchCracks(mesh: EditableMesh, tol = 0.05, maxPasses = 100): number {
  let total = 0;
  for (let pass = 0; pass < maxPasses; pass++) {
    const cracks = collectCrackEdges(mesh.triangles);
    if (cracks.size === 0) return total;
    const crackVerts = new Set<number>();
    for (const e of cracks.values()) {
      crackVerts.add(e.u);
      crackVerts.add(e.v);
    }
    const pool = [...crackVerts];
    const V = mesh.vertices;
    const splitTris = new Set<number>();
    let splits = 0;
    for (const e of cracks.values()) {
      const { u, v } = e;
      const ax = V[u * 3], ay = V[u * 3 + 1], az = V[u * 3 + 2];
      const bx = V[v * 3], by = V[v * 3 + 1], bz = V[v * 3 + 2];
      let best = -1;
      let bestD = tol;
      for (const w of pool) {
        if (w === u || w === v) continue;
        const d = distPointSegInterior(V[w * 3], V[w * 3 + 1], V[w * 3 + 2], ax, ay, az, bx, by, bz);
        if (d < bestD) {
          bestD = d;
          best = w;
        }
      }
      if (best < 0) continue;
      const tri = e.tris.find(t =>
        !splitTris.has(t) &&
        mesh.triangles[t * 3] !== best &&
        mesh.triangles[t * 3 + 1] !== best &&
        mesh.triangles[t * 3 + 2] !== best,
      );
      if (tri === undefined) continue;
      const i0 = mesh.triangles[tri * 3];
      const i1 = mesh.triangles[tri * 3 + 1];
      const i2 = mesh.triangles[tri * 3 + 2];
      const x = [i0, i1, i2].find(c => c !== u && c !== v);
      if (x === undefined) continue;
      // Preserve winding: the original triangle is a rotation of (u,v,x) or (v,u,x).
      const isUV = (i0 === u && i1 === v) || (i1 === u && i2 === v) || (i2 === u && i0 === v);
      if (isUV) {
        mesh.triangles[tri * 3] = u;
        mesh.triangles[tri * 3 + 1] = best;
        mesh.triangles[tri * 3 + 2] = x;
        mesh.triangles.push(best, v, x);
      } else {
        mesh.triangles[tri * 3] = v;
        mesh.triangles[tri * 3 + 1] = best;
        mesh.triangles[tri * 3 + 2] = x;
        mesh.triangles.push(best, u, x);
      }
      splitTris.add(tri);
      splits++;
    }
    total += splits;
    if (splits === 0) return total;
  }
  return total;
}

/** Remove triangles with a repeated vertex index (welding artifacts). */
export function dropDegenerateTriangles(triangles: number[]): number[] {
  const clean: number[] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
    if (a !== b && b !== c && c !== a) clean.push(a, b, c);
  }
  return clean;
}
