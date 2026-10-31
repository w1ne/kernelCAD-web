// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Point queries against a part's cached analysis mesh: "is this point inside
// the closed mesh" (ray parity) and "is any triangle within `reach` mm".
//
// The tendon-body check used to answer both with exact OCCT work per sample
// point (clone + transform the body, a probe-sphere boolean, then
// BRepExtrema). A 30-part tendon hand ran ~10k of those per evaluate (~10
// minutes). The mesh answers the same questions in microseconds; callers fall
// back to the exact OCCT probe whenever the point is near the surface (within
// the mesh deflection of the threshold) or the mesh is not closed, so verdicts
// do not move.

type V3 = readonly [number, number, number];

/** Cells per axis of the 2D ray grids and the 3D proximity grid (upper bound). */
const MAX_CELLS = 64;

interface Grid2 {
  readonly axisU: number;
  readonly axisV: number;
  readonly min: readonly [number, number];
  readonly cell: number;
  readonly nu: number;
  readonly nv: number;
  readonly cells: readonly (readonly number[] | undefined)[];
}

interface Grid3 {
  readonly min: V3;
  readonly cell: number;
  readonly n: readonly [number, number, number];
  readonly reach: number;
  readonly cells: Map<number, number[]>;
}

export interface MeshPointIndex {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  /** False when some edge is not shared by an even number of triangles. */
  readonly closed: boolean;
  readonly rays: readonly Grid2[];
  readonly near: Grid3;
}

function triBounds(p: Float32Array, idx: Uint32Array, t: number): [V3, V3] {
  const a = idx[3 * t] * 3, b = idx[3 * t + 1] * 3, c = idx[3 * t + 2] * 3;
  return [
    [Math.min(p[a], p[b], p[c]), Math.min(p[a + 1], p[b + 1], p[c + 1]), Math.min(p[a + 2], p[b + 2], p[c + 2])],
    [Math.max(p[a], p[b], p[c]), Math.max(p[a + 1], p[b + 1], p[c + 1]), Math.max(p[a + 2], p[b + 2], p[c + 2])],
  ];
}

/** Every edge shared by an even number of triangles (positions welded at 1 µm). */
function isClosed(p: Float32Array, idx: Uint32Array): boolean {
  const key = (i: number): string =>
    `${Math.round(p[3 * i] * 1e3)},${Math.round(p[3 * i + 1] * 1e3)},${Math.round(p[3 * i + 2] * 1e3)}`;
  const counts = new Map<string, number>();
  for (let t = 0; t < idx.length; t += 3) {
    const k = [key(idx[t]), key(idx[t + 1]), key(idx[t + 2])];
    for (let e = 0; e < 3; e++) {
      const a = k[e], b = k[(e + 1) % 3];
      if (a === b) continue;
      const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
      counts.set(edge, (counts.get(edge) ?? 0) + 1);
    }
  }
  for (const n of counts.values()) if (n % 2 !== 0) return false;
  return counts.size > 0;
}

function buildGrid2(p: Float32Array, idx: Uint32Array, axisU: number, axisV: number, lo: V3, hi: V3): Grid2 {
  const span = Math.max(hi[axisU] - lo[axisU], hi[axisV] - lo[axisV], 1e-6);
  const cell = span / MAX_CELLS;
  const nu = Math.max(1, Math.ceil((hi[axisU] - lo[axisU]) / cell) + 1);
  const nv = Math.max(1, Math.ceil((hi[axisV] - lo[axisV]) / cell) + 1);
  const cells: (number[] | undefined)[] = new Array(nu * nv);
  for (let t = 0; t < idx.length / 3; t++) {
    const [bmin, bmax] = triBounds(p, idx, t);
    const u0 = Math.floor((bmin[axisU] - lo[axisU]) / cell), u1 = Math.floor((bmax[axisU] - lo[axisU]) / cell);
    const v0 = Math.floor((bmin[axisV] - lo[axisV]) / cell), v1 = Math.floor((bmax[axisV] - lo[axisV]) / cell);
    for (let u = u0; u <= u1; u++) {
      for (let v = v0; v <= v1; v++) (cells[u * nv + v] ??= []).push(t);
    }
  }
  return { axisU, axisV, min: [lo[axisU], lo[axisV]], cell, nu, nv, cells };
}

function buildGrid3(p: Float32Array, idx: Uint32Array, lo: V3, hi: V3, reach: number): Grid3 {
  const span = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], 1e-6) + 2 * reach;
  const cell = Math.max(span / MAX_CELLS, reach);
  const min: V3 = [lo[0] - reach, lo[1] - reach, lo[2] - reach];
  const n: [number, number, number] = [0, 1, 2].map((a) =>
    Math.max(1, Math.ceil((hi[a] + reach - min[a]) / cell) + 1)) as [number, number, number];
  const cells = new Map<number, number[]>();
  for (let t = 0; t < idx.length / 3; t++) {
    const [bmin, bmax] = triBounds(p, idx, t);
    const c0 = [0, 1, 2].map((a) => Math.floor((bmin[a] - reach - min[a]) / cell));
    const c1 = [0, 1, 2].map((a) => Math.floor((bmax[a] + reach - min[a]) / cell));
    for (let i = c0[0]; i <= c1[0]; i++) {
      for (let j = c0[1]; j <= c1[1]; j++) {
        for (let k = c0[2]; k <= c1[2]; k++) {
          const key = (i * n[1] + j) * n[2] + k;
          let list = cells.get(key);
          if (list === undefined) cells.set(key, (list = []));
          list.push(t);
        }
      }
    }
  }
  return { min, cell, n, reach, cells };
}

/**
 * Index a triangle mesh for point queries. `reach` is the largest distance
 * `anyTriangleWithin` will be asked about.
 */
export function buildMeshPointIndex(positions: Float32Array, indices: Uint32Array, reach: number): MeshPointIndex {
  const lo: [number, number, number] = [Infinity, Infinity, Infinity];
  const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], positions[i + a]);
      hi[a] = Math.max(hi[a], positions[i + a]);
    }
  }
  return {
    positions,
    indices,
    closed: isClosed(positions, indices),
    rays: [buildGrid2(positions, indices, 1, 2, lo, hi), buildGrid2(positions, indices, 2, 0, lo, hi), buildGrid2(positions, indices, 0, 1, lo, hi)],
    near: buildGrid3(positions, indices, lo, hi, reach),
  };
}

/** Crossings of the ray from `q` along +axis (axis = the one not in the grid). */
/**
 * Sideways offset (mm) of the ray's foot. Axis rays from round coordinates
 * land exactly on triangle edges (a box face's diagonal) and count twice; an
 * irrational-looking micrometre offset makes such hits measure-zero. Points
 * this close to the surface never reach the mesh answer (callers send them to
 * the exact probe).
 */
const FOOT_JITTER: readonly [number, number] = [1.3719e-6, 2.7183e-6];

function crossings(m: MeshPointIndex, g: Grid2, q: V3): number {
  const axis = 3 - g.axisU - g.axisV;
  const qu = q[g.axisU] + FOOT_JITTER[0], qv = q[g.axisV] + FOOT_JITTER[1];
  const u = Math.floor((qu - g.min[0]) / g.cell);
  const v = Math.floor((qv - g.min[1]) / g.cell);
  if (u < 0 || v < 0 || u >= g.nu || v >= g.nv) return 0;
  const list = g.cells[u * g.nv + v];
  if (list === undefined) return 0;
  const p = m.positions, idx = m.indices;
  let count = 0;
  for (const t of list) {
    const a = idx[3 * t] * 3, b = idx[3 * t + 1] * 3, c = idx[3 * t + 2] * 3;
    const au = p[a + g.axisU] - qu, av = p[a + g.axisV] - qv;
    const bu = p[b + g.axisU] - qu, bv = p[b + g.axisV] - qv;
    const cu = p[c + g.axisU] - qu, cv = p[c + g.axisV] - qv;
    // Signed areas of the projected triangle against the ray's foot (origin).
    const w0 = bu * cv - bv * cu;
    const w1 = cu * av - cv * au;
    const w2 = au * bv - av * bu;
    const sum = w0 + w1 + w2;
    if (sum === 0) continue; // edge-on triangle
    if (!((w0 > 0 && w1 > 0 && w2 > 0) || (w0 < 0 && w1 < 0 && w2 < 0))) continue;
    const hit = (w0 * p[a + axis] + w1 * p[b + axis] + w2 * p[c + axis]) / sum;
    if (hit > q[axis]) count++;
  }
  return count;
}

/**
 * Ray-parity inside test, majority of three axis rays (a ray grazing an edge
 * or vertex can miscount; three independent axes outvote one such ray).
 * Meaningful only when `m.closed`.
 */
export function pointInsideMesh(m: MeshPointIndex, q: V3): boolean {
  let votes = 0;
  for (const g of m.rays) if (crossings(m, g, q) % 2 === 1) votes++;
  return votes >= 2;
}

type P3 = readonly [number, number, number];

function vertex(p: Float32Array, i: number): P3 {
  return [p[i], p[i + 1], p[i + 2]];
}
function sub(a: P3, b: P3): P3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a: P3, b: P3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: P3, b: P3): P3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Squared distance from `q` to segment `ab`. */
function segmentDistanceSq(a: P3, b: P3, q: P3): number {
  const ab = sub(b, a);
  const len = dot(ab, ab);
  const u = len === 0 ? 0 : Math.min(1, Math.max(0, dot(sub(q, a), ab) / len));
  const d = sub(q, [a[0] + u * ab[0], a[1] + u * ab[1], a[2] + u * ab[2]]);
  return dot(d, d);
}

/**
 * Squared distance from `q` to triangle `abc`: the plane distance when `q`
 * projects inside the triangle, otherwise the nearest of its three edges.
 */
function pointTriangleDistanceSq(p: Float32Array, ia: number, ib: number, ic: number, q: P3): number {
  const a = vertex(p, ia), b = vertex(p, ib), c = vertex(p, ic);
  const n = cross(sub(b, a), sub(c, a));
  const nn = dot(n, n);
  if (nn > 0) {
    const inside = dot(cross(sub(b, a), sub(q, a)), n) >= 0 &&
      dot(cross(sub(c, b), sub(q, b)), n) >= 0 &&
      dot(cross(sub(a, c), sub(q, c)), n) >= 0;
    if (inside) {
      const h = dot(sub(q, a), n);
      return (h * h) / nn;
    }
  }
  return Math.min(segmentDistanceSq(a, b, q), segmentDistanceSq(b, c, q), segmentDistanceSq(c, a, q));
}

/** True when some triangle lies within `distance` (≤ the index's reach) of `q`. */
export function anyTriangleWithin(m: MeshPointIndex, q: V3, distance: number): boolean {
  const g = m.near;
  const i = Math.floor((q[0] - g.min[0]) / g.cell);
  const j = Math.floor((q[1] - g.min[1]) / g.cell);
  const k = Math.floor((q[2] - g.min[2]) / g.cell);
  if (i < 0 || j < 0 || k < 0 || i >= g.n[0] || j >= g.n[1] || k >= g.n[2]) return false;
  const list = g.cells.get((i * g.n[1] + j) * g.n[2] + k);
  if (list === undefined) return false;
  const limit = distance * distance;
  const p = m.positions, idx = m.indices;
  for (const t of list) {
    if (pointTriangleDistanceSq(p, idx[3 * t] * 3, idx[3 * t + 1] * 3, idx[3 * t + 2] * 3, q) <= limit) return true;
  }
  return false;
}
