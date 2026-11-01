// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/bodyDistance.ts
//
// Signed distance from a closed triangle mesh (the tessellated host body),
// sampled on a regular grid. Negative = inside.
//
//   - sign: ray parity along +X per (y, z) grid row; the row is nudged by an
//     irrational fraction of the spacing so it never runs exactly through a
//     mesh vertex or edge of an axis-aligned body.
//   - magnitude, near the surface: exact point-triangle distance for every
//     grid point within `band` of a triangle (each triangle splats into the
//     points of its band-padded bounding box; points farther than `band`
//     from the triangle's plane are skipped).
//   - magnitude, deeper inside (only when `far` is requested): an exact
//     Euclidean distance transform to the nearest OUTSIDE grid point
//     (Felzenszwalb-Huttenlocher), which is the true distance to within half
//     a grid step. Used for grading fields, never for the outer surface.

import type { GridFrame } from './grid';

export interface BodyMesh {
  /** xyz triples, mm. */
  readonly vertices: ArrayLike<number>;
  /** Vertex index triples. */
  readonly triangles: ArrayLike<number>;
}

export interface BodyDistanceOptions {
  /** Exact distance is computed within this distance of the surface, mm. */
  band: number;
  /** Also fill distances beyond the band (distance transform). */
  far?: boolean;
}

const ROW_NUDGE_Y = 0.000_137_2;
const ROW_NUDGE_Z = 0.000_291_7;

/** Inside flags (1 = inside) by +X ray parity on every (j, k) row. */
export function insideByParity(mesh: BodyMesh, g: GridFrame): Uint8Array {
  const { nx, ny, nz, origin, h } = g;
  const rows: (number[] | undefined)[] = new Array(ny * nz);
  const V = mesh.vertices, T = mesh.triangles;
  for (let t = 0; t < T.length; t += 3) {
    const a = 3 * T[t], b = 3 * T[t + 1], c = 3 * T[t + 2];
    const ay = V[a + 1], az = V[a + 2], by = V[b + 1], bz = V[b + 2], cy = V[c + 1], cz = V[c + 2];
    const j0 = Math.max(0, Math.ceil((Math.min(ay, by, cy) - origin[1]) / h - ROW_NUDGE_Y));
    const j1 = Math.min(ny - 1, Math.floor((Math.max(ay, by, cy) - origin[1]) / h - ROW_NUDGE_Y));
    const k0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - origin[2]) / h - ROW_NUDGE_Z));
    const k1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - origin[2]) / h - ROW_NUDGE_Z));
    const det = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    if (det === 0) continue;
    for (let k = k0; k <= k1; k++) {
      const z = origin[2] + (k + ROW_NUDGE_Z) * h;
      for (let j = j0; j <= j1; j++) {
        const y = origin[1] + (j + ROW_NUDGE_Y) * h;
        const u = ((y - ay) * (cz - az) - (z - az) * (cy - ay)) / det;
        const v = ((by - ay) * (z - az) - (bz - az) * (y - ay)) / det;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const x = V[a] + u * (V[b] - V[a]) + v * (V[c] - V[a]);
        const r = j + ny * k;
        (rows[r] ??= []).push(x);
      }
    }
  }
  const inside = new Uint8Array(nx * ny * nz);
  for (let r = 0; r < rows.length; r++) {
    const xs = rows[r];
    if (!xs || xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    fillRowParity(inside, xs, r * nx, g);
  }
  return inside;
}

function fillRowParity(inside: Uint8Array, xs: number[], rowBase: number, g: GridFrame): void {
  let n = 0;
  for (let i = 0; i < g.nx; i++) {
    const x = g.origin[0] + i * g.h;
    while (n < xs.length && xs[n] < x) n++;
    if (n & 1) inside[rowBase + i] = 1;
  }
}

/** Squared distance from p to triangle (a, b, c) (Ericson, RTCD 5.1.5). */
export function pointTriangleDistSq(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;
  return interiorOrEdgeDistSq(apx, apy, apz, abx, aby, abz, acx, acy, acz, d1, d2, d3, d4, d5, d6);
}

function interiorOrEdgeDistSq(
  apx: number, apy: number, apz: number,
  abx: number, aby: number, abz: number,
  acx: number, acy: number, acz: number,
  d1: number, d2: number, d3: number, d4: number, d5: number, d6: number,
): number {
  let v: number, w: number;
  const vc = d1 * d4 - d3 * d2;
  const vb = d5 * d2 - d1 * d6;
  const va = d3 * d6 - d5 * d4;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { v = d1 / (d1 - d3); w = 0; }
  else if (vb <= 0 && d2 >= 0 && d6 <= 0) { v = 0; w = d2 / (d2 - d6); }
  else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); v = 1 - w; }
  else { const den = 1 / (va + vb + vc); v = vb * den; w = vc * den; }
  const qx = abx * v + acx * w - apx, qy = aby * v + acy * w - apy, qz = abz * v + acz * w - apz;
  return qx * qx + qy * qy + qz * qz;
}

/** Unsigned distance to the mesh, exact within `band`, `band` elsewhere. */
export function bandDistance(mesh: BodyMesh, g: GridFrame, band: number): Float32Array {
  const { nx, ny, nz, origin, h } = g;
  const dist = new Float32Array(nx * ny * nz).fill(band);
  const V = mesh.vertices, T = mesh.triangles;
  const lo = (v: number, axis: number): number => Math.max(0, Math.ceil((v - band - origin[axis]) / h));
  const hi = (v: number, axis: number, n: number): number => Math.min(n - 1, Math.floor((v + band - origin[axis]) / h));
  for (let t = 0; t < T.length; t += 3) {
    const a = 3 * T[t], b = 3 * T[t + 1], c = 3 * T[t + 2];
    const tri = [V[a], V[a + 1], V[a + 2], V[b], V[b + 1], V[b + 2], V[c], V[c + 1], V[c + 2]];
    const nrm = planeOf(tri);
    if (!nrm) continue;
    const i0 = lo(Math.min(tri[0], tri[3], tri[6]), 0), i1 = hi(Math.max(tri[0], tri[3], tri[6]), 0, nx);
    const j0 = lo(Math.min(tri[1], tri[4], tri[7]), 1), j1 = hi(Math.max(tri[1], tri[4], tri[7]), 1, ny);
    const k0 = lo(Math.min(tri[2], tri[5], tri[8]), 2), k1 = hi(Math.max(tri[2], tri[5], tri[8]), 2, nz);
    for (let k = k0; k <= k1; k++) {
      const z = origin[2] + k * h;
      for (let j = j0; j <= j1; j++) {
        const y = origin[1] + j * h;
        splatRow(dist, tri, nrm, i0, i1, y, z, (j + ny * k) * nx, g);
      }
    }
  }
  return dist;
}

function planeOf(tri: number[]): [number, number, number, number] | undefined {
  const ux = tri[3] - tri[0], uy = tri[4] - tri[1], uz = tri[5] - tri[2];
  const vx = tri[6] - tri[0], vy = tri[7] - tri[1], vz = tri[8] - tri[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (len === 0) return undefined;
  return [nx / len, ny / len, nz / len, -(nx * tri[0] + ny * tri[1] + nz * tri[2]) / len];
}

function splatRow(
  dist: Float32Array, tri: number[], nrm: [number, number, number, number],
  i0: number, i1: number, y: number, z: number, rowBase: number, g: GridFrame,
): void {
  for (let i = i0; i <= i1; i++) {
    const x = g.origin[0] + i * g.h;
    const cur = dist[rowBase + i];
    const plane = nrm[0] * x + nrm[1] * y + nrm[2] * z + nrm[3];
    if (plane * plane >= cur * cur) continue;
    const d2 = pointTriangleDistSq(x, y, z, tri[0], tri[1], tri[2], tri[3], tri[4], tri[5], tri[6], tri[7], tri[8]);
    if (d2 < cur * cur) dist[rowBase + i] = Math.sqrt(d2);
  }
}

/** 1-D squared distance transform (Felzenszwalb & Huttenlocher 2012), in
 *  place over a strided line of `n` samples. */
function edt1d(f: Float64Array, start: number, stride: number, n: number, tmp: Float64Array, v: Int32Array, zb: Float64Array): void {
  for (let q = 0; q < n; q++) tmp[q] = f[start + q * stride];
  let k = 0;
  v[0] = 0; zb[0] = -Infinity; zb[1] = Infinity;
  for (let q = 1; q < n; q++) {
    if (tmp[q] === Infinity) continue;
    if (tmp[v[k]] === Infinity) { v[k] = q; continue; }
    let s = ((tmp[q] + q * q) - (tmp[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= zb[k]) {
      k--;
      s = ((tmp[q] + q * q) - (tmp[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++; v[k] = q; zb[k] = s; zb[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (zb[k + 1] < q) k++;
    const d = q - v[k];
    f[start + q * stride] = tmp[v[k]] === Infinity ? Infinity : d * d + tmp[v[k]];
  }
}

/** Grid-step distance from every point to the nearest outside point. */
function insideDepth(inside: Uint8Array, g: GridFrame): Float64Array {
  const { nx, ny, nz } = g;
  const f = new Float64Array(nx * ny * nz);
  for (let i = 0; i < f.length; i++) f[i] = inside[i] ? Infinity : 0;
  const m = Math.max(nx, ny, nz);
  const tmp = new Float64Array(m), v = new Int32Array(m), zb = new Float64Array(m + 1);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) edt1d(f, nx * (j + ny * k), 1, nx, tmp, v, zb);
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) edt1d(f, i + nx * ny * k, nx, ny, tmp, v, zb);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) edt1d(f, i + nx * j, nx * ny, nz, tmp, v, zb);
  return f;
}

/** Signed distance to `mesh` at every grid point (negative inside). */
export function bodySignedDistance(mesh: BodyMesh, g: GridFrame, opts: BodyDistanceOptions): Float32Array {
  const inside = insideByParity(mesh, g);
  const dist = bandDistance(mesh, g, opts.band);
  const depth = opts.far ? insideDepth(inside, g) : undefined;
  for (let i = 0; i < dist.length; i++) {
    let d = dist[i];
    if (depth && inside[i] && d >= opts.band) d = Math.max(opts.band, (Math.sqrt(depth[i]) - 0.5) * g.h);
    dist[i] = inside[i] ? -d : d;
  }
  return dist;
}

/** Barycentric (s, w) of the closest point on triangle t to p — the point
 *  is t0 + s (t1 - t0) + w (t2 - t0) (Ericson, RTCD 5.1.5). */
function closestBary(p: readonly number[], t: readonly number[], out: number[]): void {
  const abx = t[3] - t[0], aby = t[4] - t[1], abz = t[5] - t[2];
  const acx = t[6] - t[0], acy = t[7] - t[1], acz = t[8] - t[2];
  const d1 = abx * (p[0] - t[0]) + aby * (p[1] - t[1]) + abz * (p[2] - t[2]);
  const d2 = acx * (p[0] - t[0]) + acy * (p[1] - t[1]) + acz * (p[2] - t[2]);
  const d3 = abx * (p[0] - t[3]) + aby * (p[1] - t[4]) + abz * (p[2] - t[5]);
  const d4 = acx * (p[0] - t[3]) + acy * (p[1] - t[4]) + acz * (p[2] - t[5]);
  const d5 = abx * (p[0] - t[6]) + aby * (p[1] - t[7]) + abz * (p[2] - t[8]);
  const d6 = acx * (p[0] - t[6]) + acy * (p[1] - t[7]) + acz * (p[2] - t[8]);
  out[0] = 0; out[1] = 0;
  if (d1 <= 0 && d2 <= 0) return;
  if (d3 >= 0 && d4 <= d3) { out[0] = 1; return; }
  if (d6 >= 0 && d5 <= d6) { out[1] = 1; return; }
  edgeOrFaceBary(d1, d2, d3, d4, d5, d6, out);
}

function edgeOrFaceBary(d1: number, d2: number, d3: number, d4: number, d5: number, d6: number, out: number[]): void {
  const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { out[0] = d1 / (d1 - d3); return; }
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { out[1] = d2 / (d2 - d6); return; }
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    out[0] = 1 - w; out[1] = w;
    return;
  }
  const den = 1 / (va + vb + vc);
  out[0] = vb * den; out[1] = vc * den;
}

/** Triangles bucketed on a uniform hash grid of cell `size`, each inserted
 *  into every bucket its bounding box (padded by `pad`) touches. */
function bucketTriangles(mesh: BodyMesh, size: number, pad: number): Map<number, number[]> {
  const V = mesh.vertices, T = mesh.triangles;
  const buckets = new Map<number, number[]>();
  for (let t = 0; t < T.length; t += 3) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let e = 0; e < 3; e++) {
      for (let a = 0; a < 3; a++) {
        const v = V[3 * T[t + e] + a];
        lo[a] = Math.min(lo[a], v); hi[a] = Math.max(hi[a], v);
      }
    }
    const [i0, j0, k0] = lo.map((v) => Math.floor((v - pad) / size));
    const [i1, j1, k1] = hi.map((v) => Math.floor((v + pad) / size));
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const key = hashCell(i, j, k);
      const list = buckets.get(key);
      if (list) list.push(t); else buckets.set(key, [t]);
    }
  }
  return buckets;
}

/** Bucket key; wraps every 1024 cells, which only merges far-apart buckets
 *  (extra candidates, never a missed one). */
function hashCell(i: number, j: number, k: number): number {
  return ((i & 1023) << 20) | ((j & 1023) << 10) | (k & 1023);
}

/** Move every vertex within `maxDist` of the mesh onto its closest point
 *  (sharpens edges and hole rims that grid interpolation rounds off). */
export function snapToMesh(positions: Float32Array, mesh: BodyMesh, maxDist: number): void {
  const size = Math.max(maxDist * 2, 1e-3);
  const buckets = bucketTriangles(mesh, size, maxDist);
  const V = mesh.vertices, T = mesh.triangles;
  const tri = new Array<number>(9), p = [0, 0, 0], q = [0, 0, 0], best = [0, 0, 0], bw = [0, 0];
  for (let v = 0; v < positions.length; v += 3) {
    p[0] = positions[v]; p[1] = positions[v + 1]; p[2] = positions[v + 2];
    const list = buckets.get(hashCell(Math.floor(p[0] / size), Math.floor(p[1] / size), Math.floor(p[2] / size)));
    if (!list) continue;
    let bestD = maxDist * maxDist;
    let found = false;
    for (const t of list) {
      for (let e = 0; e < 3; e++) for (let a = 0; a < 3; a++) tri[3 * e + a] = V[3 * T[t + e] + a];
      closestBary(p, tri, bw);
      for (let a = 0; a < 3; a++) q[a] = tri[a] + bw[0] * (tri[3 + a] - tri[a]) + bw[1] * (tri[6 + a] - tri[a]);
      const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2;
      if (d < bestD) { bestD = d; best[0] = q[0]; best[1] = q[1]; best[2] = q[2]; found = true; }
    }
    if (found) { positions[v] = best[0]; positions[v + 1] = best[1]; positions[v + 2] = best[2]; }
  }
}
