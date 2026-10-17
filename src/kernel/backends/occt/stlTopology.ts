// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/stlTopology.ts
//
// Fast path for STL import: weld the triangle soup into shared topology in
// JavaScript and build the shell with shared vertices and edges directly.
//
// WHY
// ---
// The general path (`StlAPI_Reader`, then `BRepBuilderAPI_Sewing`) builds one
// face per triangle with its own three edges, finds each face's plane with
// `BRepLib_FindSurface`, and then sews every edge pair back together. That is
// ~0.5 ms per triangle; the 13 meshes of the SO-100 arm (kernelcad.com hero)
// took 57 s of an 89 s build, so its publish-time animation bake ran past its
// 120 s budget. Most real STL files are already a clean closed 2-manifold whose
// shared corners are bit-identical, so the topology can be read straight off
// the vertex indices.
//
// WHEN IT APPLIES
// ---------------
// Only when the welded mesh is a consistently oriented 2-manifold: every edge
// is used by exactly two triangles, once in each direction, and every triangle
// makes a face. Anything else (open boundaries, non-manifold or flipped edges,
// sliver triangles) returns null and the caller falls back to the sewing path,
// which repairs orientation and splits T-junctions. So the fast path never
// changes WHAT a mesh imports as; the caller still runs the same MakeSolid +
// BRepCheck_Analyzer validity check on the result.

import { getOC } from 'replicad';

/** Flat triangle soup: 9 numbers (three xyz corners) per triangle. */
export type TriangleSoup = Float64Array;

const BINARY_HEADER_BYTES = 84;
const BINARY_TRIANGLE_BYTES = 50;

/**
 * Read an STL payload's triangle corners. Binary is detected the same way as
 * `countStlTriangles` (the file length matches the binary layout); otherwise
 * ASCII `vertex x y z` lines are read. Returns null when the ASCII payload is
 * not a whole number of triangles.
 */
export function readStlTriangles(bytes: Uint8Array): TriangleSoup | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength >= BINARY_HEADER_BYTES) {
    const n = view.getUint32(80, true);
    if (bytes.byteLength === BINARY_HEADER_BYTES + n * BINARY_TRIANGLE_BYTES) {
      const out = new Float64Array(n * 9);
      for (let t = 0; t < n; t += 1) {
        // Skip the 12-byte facet normal: winding defines orientation.
        const base = BINARY_HEADER_BYTES + t * BINARY_TRIANGLE_BYTES + 12;
        for (let k = 0; k < 9; k += 1) out[t * 9 + k] = view.getFloat32(base + k * 4, true);
      }
      return out;
    }
  }
  const text = new TextDecoder().decode(bytes);
  const values: number[] = [];
  const re = /\bvertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    values.push(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  if (values.length === 0 || values.length % 9 !== 0) return null;
  return Float64Array.from(values);
}

export interface WeldedMesh {
  /** Unique corner positions, xyz per point. */
  points: Float64Array;
  /** Point indices, three per kept triangle, in file winding order. */
  triangles: Uint32Array;
}

/**
 * Merge corners closer than `tolerance` into one point and drop triangles
 * that collapse onto a repeated corner (`StlAPI_Reader` drops those too).
 * Returns null on a non-finite coordinate.
 */
export function weldTriangles(soup: TriangleSoup, tolerance: number): WeldedMesh | null {
  const cell = tolerance > 0 ? tolerance : Number.MIN_VALUE;
  const exact = new Map<string, number>();
  const grid = new Map<string, number[]>();
  const points: number[] = [];

  const find = (x: number, y: number, z: number): number => {
    const key = `${x},${y},${z}`;
    const hit = exact.get(key);
    if (hit !== undefined) return hit;
    const gx = Math.floor(x / cell);
    const gy = Math.floor(y / cell);
    const gz = Math.floor(z / cell);
    if (tolerance > 0) {
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            const bucket = grid.get(`${gx + dx},${gy + dy},${gz + dz}`);
            if (!bucket) continue;
            for (const id of bucket) {
              const d = Math.hypot(points[id * 3] - x, points[id * 3 + 1] - y, points[id * 3 + 2] - z);
              if (d <= tolerance) {
                exact.set(key, id);
                return id;
              }
            }
          }
        }
      }
    }
    const id = points.length / 3;
    points.push(x, y, z);
    exact.set(key, id);
    const cellKey = `${gx},${gy},${gz}`;
    const bucket = grid.get(cellKey);
    if (bucket) bucket.push(id);
    else grid.set(cellKey, [id]);
    return id;
  };

  const triangles: number[] = [];
  for (let t = 0; t < soup.length; t += 9) {
    const ids: number[] = [];
    for (let k = 0; k < 9; k += 3) {
      const x = soup[t + k];
      const y = soup[t + k + 1];
      const z = soup[t + k + 2];
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
      ids.push(find(x, y, z));
    }
    const [a, b, c] = ids;
    if (a === b || b === c || a === c) continue;
    triangles.push(a, b, c);
  }
  return { points: Float64Array.from(points), triangles: Uint32Array.from(triangles) };
}

export interface ManifoldTopology {
  /** Unique undirected edges as point-index pairs (low, high). */
  edges: Array<[number, number]>;
  /** Per triangle, its three edge indices (a-b, b-c, c-a). */
  triangleEdges: Uint32Array;
  /** Connected component per triangle (0-based, in first-seen order). */
  component: Uint32Array;
  componentCount: number;
}

/**
 * Edge table of a welded mesh when it is a closed, consistently oriented
 * 2-manifold (each edge used exactly twice, once in each direction), else null.
 */
export function manifoldTopology(mesh: WeldedMesh): ManifoldTopology | null {
  const { triangles } = mesh;
  const nTri = triangles.length / 3;
  if (nTri === 0) return null;
  const edgeIndex = new Map<string, number>();
  const edges: Array<[number, number]> = [];
  const forward: number[] = [];
  const backward: number[] = [];
  const firstTriangle: number[] = [];
  const triangleEdges = new Uint32Array(nTri * 3);

  // Union-find over triangles through shared edges.
  const parent = new Uint32Array(nTri);
  for (let i = 0; i < nTri; i += 1) parent[i] = i;
  const root = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r];
    while (parent[i] !== r) {
      const next = parent[i];
      parent[i] = r;
      i = next;
    }
    return r;
  };

  for (let t = 0; t < nTri; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      const p = triangles[t * 3 + k];
      const q = triangles[t * 3 + ((k + 1) % 3)];
      const lo = p < q ? p : q;
      const hi = p < q ? q : p;
      const key = `${lo}_${hi}`;
      let e = edgeIndex.get(key);
      if (e === undefined) {
        e = edges.length;
        edgeIndex.set(key, e);
        edges.push([lo, hi]);
        forward.push(0);
        backward.push(0);
        firstTriangle.push(t);
      } else {
        parent[root(t)] = root(firstTriangle[e]);
      }
      if (p === lo) forward[e] += 1;
      else backward[e] += 1;
      triangleEdges[t * 3 + k] = e;
    }
  }
  for (let e = 0; e < edges.length; e += 1) {
    if (forward[e] !== 1 || backward[e] !== 1) return null;
  }

  const component = new Uint32Array(nTri);
  const ids = new Map<number, number>();
  for (let t = 0; t < nTri; t += 1) {
    const r = root(t);
    let c = ids.get(r);
    if (c === undefined) {
      c = ids.size;
      ids.set(r, c);
    }
    component[t] = c;
  }
  return { edges, triangleEdges, component, componentCount: ids.size };
}

export interface BuiltStlTopology {
  /** One TopoDS_Shell per connected component. */
  shells: unknown[];
}

/**
 * Build one shell per connected component with shared vertices and edges.
 * Returns null (after freeing everything) when OCCT cannot make a triangle's
 * wire or planar face, e.g. a sliver whose corners are nearly collinear.
 */
export function buildManifoldShells(mesh: WeldedMesh, topo: ManifoldTopology): BuiltStlTopology | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const { points, triangles } = mesh;
  const owned: Array<{ delete?: () => void }> = [];
  const free = (o: { delete?: () => void } | undefined | null) => o?.delete?.();

  const vertices = new Map<number, unknown>();
  const vertex = (i: number): unknown => {
    let v = vertices.get(i);
    if (v === undefined) {
      const p = new oc.gp_Pnt_3(points[i * 3], points[i * 3 + 1], points[i * 3 + 2]);
      const mv = new oc.BRepBuilderAPI_MakeVertex(p);
      v = mv.Vertex();
      free(mv);
      free(p);
      vertices.set(i, v);
      owned.push(v as { delete?: () => void });
    }
    return v;
  };

  const edgeShapes: unknown[] = new Array(topo.edges.length);
  const edge = (e: number): unknown | null => {
    let s = edgeShapes[e];
    if (s === undefined) {
      const [a, b] = topo.edges[e];
      const me = new oc.BRepBuilderAPI_MakeEdge_2(vertex(a), vertex(b));
      s = me.IsDone() ? me.Edge() : null;
      free(me);
      edgeShapes[e] = s;
      if (s) owned.push(s as { delete?: () => void });
    }
    return s;
  };

  const builder = new oc.TopoDS_Builder();
  const shells: unknown[] = [];
  for (let c = 0; c < topo.componentCount; c += 1) {
    const shell = new oc.TopoDS_Shell();
    builder.MakeShell(shell);
    shells.push(shell);
  }

  let ok = true;
  const nTri = triangles.length / 3;
  for (let t = 0; t < nTri && ok; t += 1) {
    const a = triangles[t * 3];
    const b = triangles[t * 3 + 1];
    const c = triangles[t * 3 + 2];
    const e1 = edge(topo.triangleEdges[t * 3]);
    const e2 = edge(topo.triangleEdges[t * 3 + 1]);
    const e3 = edge(topo.triangleEdges[t * 3 + 2]);
    if (!e1 || !e2 || !e3) {
      ok = false;
      break;
    }
    const ux = points[b * 3] - points[a * 3];
    const uy = points[b * 3 + 1] - points[a * 3 + 1];
    const uz = points[b * 3 + 2] - points[a * 3 + 2];
    const vx = points[c * 3] - points[a * 3];
    const vy = points[c * 3 + 1] - points[a * 3 + 1];
    const vz = points[c * 3 + 2] - points[a * 3 + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (!(len > 0)) {
      ok = false;
      break;
    }
    const mw = new oc.BRepBuilderAPI_MakeWire_4(e1, e2, e3);
    if (!mw.IsDone()) {
      free(mw);
      ok = false;
      break;
    }
    const wire = mw.Wire();
    free(mw);
    // Plane normal from the winding, so the face is FORWARD with the
    // triangle's outward normal and the wire runs counter-clockwise on it.
    const origin = new oc.gp_Pnt_3(points[a * 3], points[a * 3 + 1], points[a * 3 + 2]);
    const dir = new oc.gp_Dir_4(nx / len, ny / len, nz / len);
    const plane = new oc.gp_Pln_3(origin, dir);
    const mf = new oc.BRepBuilderAPI_MakeFace_16(plane, wire, true);
    if (mf.IsDone()) {
      const face = mf.Face();
      builder.Add(shells[topo.component[t]], face);
      free(face);
    } else {
      ok = false;
    }
    free(mf);
    free(plane);
    free(dir);
    free(origin);
    free(wire);
  }
  free(builder);
  // The shells hold their own references to every vertex and edge.
  for (const o of owned) free(o);
  if (!ok) {
    for (const s of shells) free(s as { delete?: () => void });
    return null;
  }
  // Every edge is shared by two faces, so each shell is closed. Sewing sets
  // the same flag, which MakeSolid and BRepClass3d read.
  for (const s of shells) (s as { Closed_2: (closed: boolean) => void }).Closed_2(true);
  return { shells };
}
