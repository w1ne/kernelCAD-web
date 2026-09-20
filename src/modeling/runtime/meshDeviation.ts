// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/meshDeviation.ts
//
// Symmetric point-sampled surface deviation between two meshed solids —
// the "how far did the skin move" number that a volume delta cannot give.
//
// A pure volume delta is sign-ambiguous about WHERE material moved: a boss
// that grew 2 mm taller and a pocket that got 2 mm deeper can report the
// same |ΔV|. Deviation answers the other half: the largest distance any
// point on A's surface had to travel to reach B's surface.
//
// Definition: the two-sided discrete Hausdorff distance over mesh SAMPLE
// POINTS — max over sampled points of A of the exact point-to-triangle
// distance to B's triangle soup, and symmetrically B→A.
//
// Sample points are the mesh vertices PLUS every triangle centroid. Vertices
// alone are not enough and the failure is not hypothetical: gate a through-
// cutout off a plate and every vertex of the removed pocket wall still sits
// on the plate's top or bottom plane, so a vertex-only reading returns 0.00
// mm for a change that removed 1296 mm³. Centroids sit in the middle of those
// walls, where the surfaces genuinely differ. Vertices still earn their place
// — OCCT tessellation puts them exactly on the feature edges that carry a
// dimensional change, so a moved rim is caught by construction.
//
// Reuse: meshes come from `OcctBackend.getMesh()` — the same tessellation
// the exact-bbox and plausibility checks already consume, so the numbers
// are consistent with the rest of the analysis surface.

import type { RuntimeMesh } from '../../kernel/backends/runtimeMesh';

/** Sample cap per side, applied independently to the vertex list and to the
 *  centroid list. Beyond it the list is strided uniformly — a deterministic
 *  subsample, never a random one, so the reported deviation is reproducible
 *  across runs. */
export const MAX_SAMPLES_PER_SIDE = 4000;

export interface MeshDeviationResult {
  /** Two-sided discrete Hausdorff distance in mm. */
  maxDeviationMm: number;
  /** Mean of the sampled one-sided distances (A→B and B→A pooled), mm. */
  meanDeviationMm: number;
  /** Root-mean-square of the same pooled distances, mm. */
  rmsDeviationMm: number;
  /** Points actually sampled (vertices + triangle centroids, both sides). */
  samples: number;
  /** True when either list on either side was strided down to the cap. */
  subsampled: boolean;
}

/** First half of the Ericson region cascade (Real-Time Collision Detection
 *  §5.1.5): vertex A, vertex B, then edge AB. Returns `undefined` when the
 *  point is in none of those regions, so the caller continues with the
 *  C/AC/BC cascade. Pure arithmetic, allocation-free. */
function closestBeforeVertexCSq(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number | undefined {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;

  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;

  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    const qx = ax + abx * v - px, qy = ay + aby * v - py, qz = az + abz * v - pz;
    return qx * qx + qy * qy + qz * qz;
  }
  return undefined;
}

/** Second half of the Ericson region cascade: vertex C, edge AC, edge BC,
 *  then the face interior. Recomputes the d1–d4 projections the first half
 *  also derived — same pure arithmetic on the same inputs, so the region
 *  tests see bit-identical values. */
function closestFromVertexCSq(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  const vc = d1 * d4 - d3 * d2;

  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    const qx = ax + acx * w - px, qy = ay + acy * w - py, qz = az + acz * w - pz;
    return qx * qx + qy * qy + qz * qz;
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    const qx = bx + (cx - bx) * w - px;
    const qy = by + (cy - by) * w - py;
    const qz = bz + (cz - bz) * w - pz;
    return qx * qx + qy * qy + qz * qz;
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  const qx = ax + abx * v + acx * w - px;
  const qy = ay + aby * v + acy * w - py;
  const qz = az + abz * v + acz * w - pz;
  return qx * qx + qy * qy + qz * qz;
}

/** Squared distance from point p to triangle (a, b, c). Standard
 *  Ericson (Real-Time Collision Detection §5.1.5) barycentric region test —
 *  branchy but exact and allocation-free. */
export function pointTriangleDistanceSq(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const beforeVertexC = closestBeforeVertexCSq(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz);
  if (beforeVertexC !== undefined) return beforeVertexC;
  return closestFromVertexCSq(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz);
}

interface TriangleSoup {
  /** Flat [ax,ay,az, bx,by,bz, cx,cy,cz] per triangle. */
  readonly verts: Float64Array;
  /** Per-triangle AABB [minx,miny,minz,maxx,maxy,maxz] for the early-out. */
  readonly bounds: Float64Array;
  readonly count: number;
}

function toSoup(mesh: RuntimeMesh): TriangleSoup {
  const triCount = Math.floor(mesh.indices.length / 3);
  const verts = new Float64Array(triCount * 9);
  const bounds = new Float64Array(triCount * 6);
  for (let t = 0; t < triCount; t++) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let k = 0; k < 3; k++) {
      const vi = mesh.indices[t * 3 + k] * 3;
      const x = mesh.positions[vi], y = mesh.positions[vi + 1], z = mesh.positions[vi + 2];
      verts[t * 9 + k * 3] = x;
      verts[t * 9 + k * 3 + 1] = y;
      verts[t * 9 + k * 3 + 2] = z;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    bounds[t * 6] = minX; bounds[t * 6 + 1] = minY; bounds[t * 6 + 2] = minZ;
    bounds[t * 6 + 3] = maxX; bounds[t * 6 + 4] = maxY; bounds[t * 6 + 5] = maxZ;
  }
  return { verts, bounds, count: triCount };
}

/** Squared distance from a point to an AABB — 0 when inside. Used to skip
 *  triangles that cannot beat the running best. */
function pointAabbDistanceSq(
  px: number, py: number, pz: number,
  b: Float64Array, i: number,
): number {
  const dx = px < b[i] ? b[i] - px : px > b[i + 3] ? px - b[i + 3] : 0;
  const dy = py < b[i + 1] ? b[i + 1] - py : py > b[i + 4] ? py - b[i + 4] : 0;
  const dz = pz < b[i + 2] ? b[i + 2] - pz : pz > b[i + 5] ? pz - b[i + 5] : 0;
  return dx * dx + dy * dy + dz * dz;
}

/** Deterministic stride so a dense mesh is subsampled reproducibly. */
function strideFor(vertexCount: number): number {
  return vertexCount <= MAX_SAMPLES_PER_SIDE
    ? 1
    : Math.ceil(vertexCount / MAX_SAMPLES_PER_SIDE);
}

/** Every point sampled on one side: mesh vertices then triangle centroids,
 *  each list strided independently down to the cap. */
function samplePoints(from: RuntimeMesh, soup: TriangleSoup): { pts: Float64Array; subsampled: boolean } {
  const vertexCount = Math.floor(from.positions.length / 3);
  const vStride = strideFor(vertexCount);
  const cStride = strideFor(soup.count);
  const vTaken = vertexCount === 0 ? 0 : Math.ceil(vertexCount / vStride);
  const cTaken = soup.count === 0 ? 0 : Math.ceil(soup.count / cStride);
  const pts = new Float64Array((vTaken + cTaken) * 3);
  let n = 0;
  for (let v = 0; v < vertexCount; v += vStride) {
    pts[n++] = from.positions[v * 3];
    pts[n++] = from.positions[v * 3 + 1];
    pts[n++] = from.positions[v * 3 + 2];
  }
  const THIRD = 1 / 3;
  for (let t = 0; t < soup.count; t += cStride) {
    const o = t * 9;
    pts[n++] = (soup.verts[o] + soup.verts[o + 3] + soup.verts[o + 6]) * THIRD;
    pts[n++] = (soup.verts[o + 1] + soup.verts[o + 4] + soup.verts[o + 7]) * THIRD;
    pts[n++] = (soup.verts[o + 2] + soup.verts[o + 5] + soup.verts[o + 8]) * THIRD;
  }
  return { pts, subsampled: vStride > 1 || cStride > 1 };
}

/**
 * Uniform grid of triangle AABBs for exact nearest-triangle queries: cells are
 * searched in growing Chebyshev rings and the search stops once no unvisited
 * ring can hold anything closer than the best distance found. Same answer as
 * scanning every triangle, without the O(samples × triangles) cost on dense
 * meshes.
 */
class TriangleGrid {
  readonly cells: Int32Array[];
  readonly min: [number, number, number];
  readonly cell: number;
  readonly dims: [number, number, number];
  readonly soup: TriangleSoup;
  private readonly stamp: Int32Array;
  private tick = 0;

  constructor(soup: TriangleSoup, lo: [number, number, number], hi: [number, number, number]) {
    this.soup = soup;
    const ext = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    const diag = Math.hypot(ext[0], ext[1], ext[2]) || 1;
    const vol = Math.max(ext[0], diag / 256) * Math.max(ext[1], diag / 256) * Math.max(ext[2], diag / 256);
    this.cell = Math.max(diag / 256, 1.5 * Math.cbrt(vol / Math.max(1, soup.count)));
    this.min = lo;
    this.dims = [0, 1, 2].map((k) => Math.min(256, Math.max(1, Math.ceil(ext[k] / this.cell) + 1))) as [number, number, number];
    const lists: number[][] = Array.from({ length: this.dims[0] * this.dims[1] * this.dims[2] }, () => []);
    const b = soup.bounds;
    for (let t = 0; t < soup.count; t++) {
      const a0 = this.index(b[t * 6], 0), a1 = this.index(b[t * 6 + 3], 0);
      const b0 = this.index(b[t * 6 + 1], 1), b1 = this.index(b[t * 6 + 4], 1);
      const c0 = this.index(b[t * 6 + 2], 2), c1 = this.index(b[t * 6 + 5], 2);
      for (let i = a0; i <= a1; i++) {
        for (let j = b0; j <= b1; j++) {
          for (let k = c0; k <= c1; k++) lists[(k * this.dims[1] + j) * this.dims[0] + i].push(t);
        }
      }
    }
    this.cells = lists.map((l) => Int32Array.from(l));
    this.stamp = new Int32Array(soup.count);
  }

  private index(v: number, axis: 0 | 1 | 2): number {
    return Math.max(0, Math.min(this.dims[axis] - 1, Math.floor((v - this.min[axis]) / this.cell)));
  }

  private scanCell(
    px: number, py: number, pz: number,
    i: number, j: number, k: number,
    ci: number, cj: number, ck: number,
    ring: number, tick: number, bestSq: number,
  ): number {
    if (Math.max(Math.abs(i - ci), Math.abs(j - cj), Math.abs(k - ck)) !== ring) return bestSq;
    const soup = this.soup;
    const list = this.cells[(k * this.dims[1] + j) * this.dims[0] + i];
    for (let n = 0; n < list.length; n++) {
      const t = list[n];
      if (this.stamp[t] === tick) continue;
      this.stamp[t] = tick;
      if (pointAabbDistanceSq(px, py, pz, soup.bounds, t * 6) >= bestSq) continue;
      const o = t * 9;
      const dSq = pointTriangleDistanceSq(
        px, py, pz,
        soup.verts[o], soup.verts[o + 1], soup.verts[o + 2],
        soup.verts[o + 3], soup.verts[o + 4], soup.verts[o + 5],
        soup.verts[o + 6], soup.verts[o + 7], soup.verts[o + 8],
      );
      if (dSq < bestSq) bestSq = dSq;
    }
    return bestSq;
  }

  nearestSq(px: number, py: number, pz: number): number {
    const ci = this.index(px, 0), cj = this.index(py, 1), ck = this.index(pz, 2);
    const tick = ++this.tick;
    let bestSq = Infinity;
    const maxRing = Math.max(this.dims[0], this.dims[1], this.dims[2]);
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let i = ci - ring; i <= ci + ring; i++) {
        if (i < 0 || i >= this.dims[0]) continue;
        for (let j = cj - ring; j <= cj + ring; j++) {
          if (j < 0 || j >= this.dims[1]) continue;
          for (let k = ck - ring; k <= ck + ring; k++) {
            if (k < 0 || k >= this.dims[2]) continue;
            bestSq = this.scanCell(px, py, pz, i, j, k, ci, cj, ck, ring, tick, bestSq);
          }
        }
      }
      // Everything outside this ring is at least ring × cell away (the query
      // point is clamped into the grid, which spans both meshes).
      const reach = ring * this.cell;
      if (bestSq <= reach * reach) break;
    }
    return bestSq;
  }
}

function boundsOf(soups: TriangleSoup[]): { lo: [number, number, number]; hi: [number, number, number] } {
  const lo: [number, number, number] = [Infinity, Infinity, Infinity];
  const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const s of soups) {
    for (let t = 0; t < s.count; t++) {
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], s.bounds[t * 6 + k]);
        hi[k] = Math.max(hi[k], s.bounds[t * 6 + 3 + k]);
      }
    }
  }
  return { lo, hi };
}

function oneSided(
  from: RuntimeMesh,
  fromSoup: TriangleSoup,
  soup: TriangleSoup,
  grid: TriangleGrid,
): { max: number; sum: number; sumSq: number; samples: number; subsampled: boolean } {
  const { pts, subsampled } = samplePoints(from, fromSoup);
  const pointCount = pts.length / 3;
  let max = 0;
  let sum = 0;
  let sumSq = 0;
  let samples = 0;
  void soup;
  for (let i = 0; i < pointCount; i++) {
    const px = pts[i * 3];
    const py = pts[i * 3 + 1];
    const pz = pts[i * 3 + 2];
    const bestSq = grid.nearestSq(px, py, pz);
    if (bestSq !== Infinity) {
      const d = Math.sqrt(bestSq);
      if (d > max) max = d;
      sum += d;
      sumSq += bestSq;
      samples++;
    }
  }
  return { max, sum, sumSq, samples, subsampled };
}

/**
 * Two-sided discrete Hausdorff distance between two meshed solids, in mm.
 *
 * Returns 0/0/0 when either mesh has no triangles (an empty boolean result,
 * for instance) — the caller reports the emptiness through the volume
 * fields, not through a deviation of Infinity.
 */
export function meshDeviation(a: RuntimeMesh, b: RuntimeMesh): MeshDeviationResult {
  if (a.indices.length === 0 || b.indices.length === 0) {
    return { maxDeviationMm: 0, meanDeviationMm: 0, rmsDeviationMm: 0, samples: 0, subsampled: false };
  }
  const soupA = toSoup(a);
  const soupB = toSoup(b);
  const { lo, hi } = boundsOf([soupA, soupB]);
  const ab = oneSided(a, soupA, soupB, new TriangleGrid(soupB, lo, hi));
  const ba = oneSided(b, soupB, soupA, new TriangleGrid(soupA, lo, hi));
  const samples = ab.samples + ba.samples;
  return {
    maxDeviationMm: Math.max(ab.max, ba.max),
    meanDeviationMm: samples === 0 ? 0 : (ab.sum + ba.sum) / samples,
    rmsDeviationMm: samples === 0 ? 0 : Math.sqrt((ab.sumSq + ba.sumSq) / samples),
    samples,
    subsampled: ab.subsampled || ba.subsampled,
  };
}
