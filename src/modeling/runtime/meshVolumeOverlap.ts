// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/meshVolumeOverlap.ts
//
// Voxel overlap integral for two world-space triangle meshes. Extracted from
// restPoseContact so the generic mesh-pair engine can use it without a module
// cycle (restPoseContact imports that engine for mesh-involving rest pairs).

import type { WorldMesh } from './restAnalysisMesh';

/** Voxel edge bounds (mm) and the grid size cap per pair. */
const MIN_CELL_MM = 0.25;
const MAX_CELLS_PER_PAIR = 96 * 96 * 96;

/**
 * For axis `k`, cast one ray per grid column (the other two axes) and mark
 * which grid points along it have odd crossing parity. `votes[idx]` is
 * incremented for each inside verdict.
 */
type RayGrid = {
  readonly u: 0 | 1 | 2;
  readonly v: 0 | 1 | 2;
  readonly k: 0 | 1 | 2;
  readonly nu: number;
  readonly nv: number;
  readonly origin: [number, number, number];
  readonly cell: number;
  // A tiny irrational nudge keeps rays off shared edges and vertices.
  readonly ju: number;
  readonly jv: number;
};

function cellRange(lo: number, hi: number, origin: number, jitter: number, cell: number, n: number): [number, number] {
  return [
    Math.max(0, Math.ceil((lo - origin - jitter) / cell - 0.5)),
    Math.min(n - 1, Math.floor((hi - origin - jitter) / cell - 0.5)),
  ];
}

// Finds where the axis-k rays through the grid columns cross one triangle.
// Without `depth` it counts the crossings of each column in `cursor`; with
// `depth` it stores each crossing at its column's `cursor` and advances it.
function rasterTriangle(
  g: RayGrid,
  P: Float64Array,
  a: number,
  b: number,
  c: number,
  cursor: Uint32Array,
  depth?: Float64Array,
): void {
  const { u, v, k } = g;
  const au = P[a + u], av = P[a + v], ak = P[a + k];
  const bu = P[b + u], bv = P[b + v], bk = P[b + k];
  const cu = P[c + u], cv = P[c + v], ck = P[c + k];
  const [i0, i1] = cellRange(Math.min(au, bu, cu), Math.max(au, bu, cu), g.origin[u], g.ju, g.cell, g.nu);
  const [j0, j1] = cellRange(Math.min(av, bv, cv), Math.max(av, bv, cv), g.origin[v], g.jv, g.cell, g.nv);
  if (i0 > i1 || j0 > j1) return;
  const det = (bu - au) * (cv - av) - (cu - au) * (bv - av);
  if (Math.abs(det) < 1e-12) return;
  for (let i = i0; i <= i1; i++) {
    const pu = g.origin[u] + (i + 0.5) * g.cell + g.ju;
    for (let j = j0; j <= j1; j++) {
      const pv = g.origin[v] + (j + 0.5) * g.cell + g.jv;
      const w1 = ((bu - pu) * (cv - pv) - (cu - pu) * (bv - pv)) / det;
      const w2 = ((cu - pu) * (av - pv) - (au - pu) * (cv - pv)) / det;
      const w3 = 1 - w1 - w2;
      if (w1 < 0 || w2 < 0 || w3 < 0) continue;
      const column = i * g.nv + j;
      if (depth === undefined) cursor[column]++;
      else depth[cursor[column]++] = w1 * ak + w2 * bk + w3 * ck;
    }
  }
}

// Sorts depth[from..to) ascending in place. A ray has a few crossings, so
// most ranges take the insertion sort and allocate nothing.
function sortRange(depth: Float64Array, from: number, to: number): void {
  if (to - from > 24) {
    depth.subarray(from, to).sort();
    return;
  }
  for (let i = from + 1; i < to; i++) {
    const x = depth[i];
    let j = i - 1;
    for (; j >= from && depth[j] > x; j--) depth[j + 1] = depth[j];
    depth[j + 1] = x;
  }
}

// Walks one ray, crossings depth[from..to): every cell centre after an odd
// number of crossings is inside; it gets a vote and, when asked, its
// inside-interval bounds.
function voteColumn(
  depth: Float64Array,
  from: number,
  to: number,
  base: number,
  strideK: number,
  nk: number,
  originK: number,
  cell: number,
  votes: Uint8Array,
  bounds?: { lo: Float32Array; hi: Float32Array },
): void {
  sortRange(depth, from, to);
  let h = from;
  for (let s = 0; s < nk; s++) {
    const pk = originK + (s + 0.5) * cell;
    while (h < to && depth[h] < pk) h++;
    if (((h - from) & 1) === 0) continue;
    const idx = base + s * strideK;
    votes[idx]++;
    if (bounds !== undefined) {
      bounds.lo[idx] = depth[h - 1];
      bounds.hi[idx] = h < to ? depth[h] : Infinity;
    }
  }
}

function castAxis(
  mesh: WorldMesh,
  k: 0 | 1 | 2,
  origin: [number, number, number],
  cell: number,
  dims: [number, number, number],
  votes: Uint8Array,
  bounds?: { lo: Float32Array; hi: Float32Array },
): void {
  const u = ((k + 1) % 3) as 0 | 1 | 2;
  const v = ((k + 2) % 3) as 0 | 1 | 2;
  const g: RayGrid = { u, v, k, nu: dims[u], nv: dims[v], origin, cell, ju: cell * 0.00137, jv: cell * 0.00211 };
  const columns = g.nu * g.nv;
  const I = mesh.indices;
  // Two passes over the triangles: count the crossings of each column, then
  // store them in one flat array, column c at depth[start[c]..start[c + 1]).
  // A list per column costs about 200 bytes each on a wide grid.
  const cursor = new Uint32Array(columns);
  for (let t = 0; t < I.length; t += 3) {
    rasterTriangle(g, mesh.positions, 3 * I[t], 3 * I[t + 1], 3 * I[t + 2], cursor);
  }
  const start = new Uint32Array(columns + 1);
  for (let c = 0; c < columns; c++) start[c + 1] = start[c] + cursor[c];
  cursor.set(start.subarray(0, columns));
  const depth = new Float64Array(start[columns]);
  for (let t = 0; t < I.length; t += 3) {
    rasterTriangle(g, mesh.positions, 3 * I[t], 3 * I[t + 1], 3 * I[t + 2], cursor, depth);
  }
  const stride: [number, number, number] = [dims[1] * dims[2], dims[2], 1];
  for (let i = 0; i < g.nu; i++) {
    for (let j = 0; j < g.nv; j++) {
      const c = i * g.nv + j;
      if (start[c] === start[c + 1]) continue;
      voteColumn(depth, start[c], start[c + 1], i * stride[u] + j * stride[v], stride[k], dims[k], origin[k], cell, votes, bounds);
    }
  }
}

// Local thickness of the shared region at each grid point: along each
// axis the exact overlap of the two inside-intervals through it (from the
// ray hits, not the voxels), minimum over the three axes. A thin contact
// sliver (thread flank, tooth flank, coincident tessellated faces) is thin
// along the axis closest to its normal however long it is.
function sharedThickness(
  a: WorldMesh,
  b: WorldMesh,
  lo: [number, number, number],
  cell: number,
  dims: [number, number, number],
  votesA: Uint8Array,
  votesB: Uint8Array,
): Float32Array {
  const total = votesA.length;
  const thick = new Float32Array(total).fill(Infinity);
  const bA = { lo: new Float32Array(total), hi: new Float32Array(total) };
  const bB = { lo: new Float32Array(total), hi: new Float32Array(total) };
  for (const k of [0, 1, 2] as const) {
    bA.lo.fill(NaN); bB.lo.fill(NaN);
    castAxis(a, k, lo, cell, dims, votesA, bA);
    castAxis(b, k, lo, cell, dims, votesB, bB);
    for (let idx = 0; idx < total; idx++) {
      if (Number.isNaN(bA.lo[idx]) || Number.isNaN(bB.lo[idx])) continue;
      const t = Math.min(bA.hi[idx], bB.hi[idx]) - Math.max(bA.lo[idx], bB.lo[idx]);
      if (t < thick[idx]) thick[idx] = t;
    }
  }
  return thick;
}

// Counts grid points inside both meshes (2-of-3 votes each), their deepest
// thickness and their centroid.
function tallyShared(
  votesA: Uint8Array,
  votesB: Uint8Array,
  thick: Float32Array,
  dims: [number, number, number],
  lo: [number, number, number],
  cell: number,
): { count: number; depth: number; at: [number, number, number] } {
  let count = 0;
  let depth = 0;
  const sum = [0, 0, 0];
  const plane = dims[1] * dims[2];
  for (let idx = 0; idx < votesA.length; idx++) {
    if (votesA[idx] < 2 || votesB[idx] < 2) continue;
    count++;
    if (Number.isFinite(thick[idx]) && thick[idx] > depth) depth = thick[idx];
    sum[0] += Math.floor(idx / plane);
    sum[1] += Math.floor(idx / dims[2]) % dims[1];
    sum[2] += idx % dims[2];
  }
  const at: [number, number, number] = count === 0
    ? lo
    : [0, 1, 2].map((k) => lo[k] + (sum[k] / count + 0.5) * cell) as [number, number, number];
  return { count, depth, at };
}

// Cubic cell and grid size for an AABB overlap. An axis thinner than the
// cell still takes one cell, so on a slab (two wide faces in contact) the
// volume-based cell leaves far more columns than the cap; grow the cell
// until the grid fits.
function overlapGrid(ext: [number, number, number]): { cell: number; dims: [number, number, number] } {
  let cell = Math.max(MIN_CELL_MM, Math.cbrt((ext[0] * ext[1] * ext[2]) / MAX_CELLS_PER_PAIR));
  for (;;) {
    const dims = ext.map((e) => Math.max(1, Math.ceil(e / cell))) as [number, number, number];
    const total = dims[0] * dims[1] * dims[2];
    if (total <= MAX_CELLS_PER_PAIR) return { cell, dims };
    cell *= Math.max(1.01, Math.cbrt(total / MAX_CELLS_PER_PAIR));
  }
}

/** Shared volume of two closed (or nearly closed) world meshes, in mm³. */
export function meshOverlapVolume(
  a: WorldMesh,
  b: WorldMesh,
): { volumeMm3: number; thicknessMm: number; at: [number, number, number]; cellMm: number } {
  const lo: [number, number, number] = [0, 0, 0];
  const ext: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    lo[k] = Math.max(a.min[k], b.min[k]);
    ext[k] = Math.min(a.max[k], b.max[k]) - lo[k];
    if (ext[k] <= 0) return { volumeMm3: 0, thicknessMm: 0, at: lo, cellMm: 0 };
  }
  const { cell, dims } = overlapGrid(ext);
  // An axis thinner than the cell has one layer of grid points: put it on
  // the mid-plane of the overlap (half a cell in can be outside it) and
  // count the real extent, not a full cell, towards the volume.
  const thin = dims.map((n, k) => n === 1 && ext[k] < cell);
  const origin = lo.map((v, k) => (thin[k] ? v + (ext[k] - cell) / 2 : v)) as [number, number, number];
  const pointVolume = ext.reduce((v, e, k) => v * (thin[k] ? e : cell), 1);
  const total = dims[0] * dims[1] * dims[2];
  const votesA = new Uint8Array(total);
  const votesB = new Uint8Array(total);
  const thick = sharedThickness(a, b, origin, cell, dims, votesA, votesB);
  const { count, depth, at } = tallyShared(votesA, votesB, thick, dims, origin, cell);
  return { volumeMm3: count * pointVolume, thicknessMm: depth, at, cellMm: cell };
}
