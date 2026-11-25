// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingOccluder.ts
//
// Screen-space depth test for the triangle-mesh drawing projection: which
// projected point lies behind a triangle. Kept apart from
// drawingMeshProjection.ts so the sweep, the seams and the depth test can be
// read and ratcheted separately.

/** Steeper than this (screen area over true area) and a triangle is edge-on. */
const MIN_PROJECTED_AREA_RATIO = 1e-4;

/** True when the triangle at view offsets a, b, c covers screen area. */
export function facesViewer(view: Float64Array, a: number, b: number, c: number): boolean {
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
 *
 * Each cell lists its triangles nearest-first by their deepest vertex, and a
 * query skips whole cells and cell tails whose triangles cannot lie in front
 * of the point. Without that, a modelled thread (80k triangles over 6 x 16 mm)
 * spent ten seconds per view testing every triangle within the reach window.
 */
export class OccluderGrid {
  private readonly cellStart: Int32Array;
  private readonly cellTris: Int32Array;
  private readonly cellMaxW: Float64Array;
  private readonly triMinU: Float64Array;
  private readonly triMaxU: Float64Array;
  private readonly triMinV: Float64Array;
  private readonly triMaxV: Float64Array;
  private readonly triMaxW: Float64Array;
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
    const triMinU = new Float64Array(nTri);
    const triMaxU = new Float64Array(nTri);
    const triMinV = new Float64Array(nTri);
    const triMaxV = new Float64Array(nTri);
    const triMaxW = new Float64Array(nTri);
    let lx = Infinity;
    let ly = Infinity;
    let hx = -Infinity;
    let hy = -Infinity;
    for (let t = 0; t < nTri; t += 1) {
      const a = triangles[t * 3] * 3;
      const b = triangles[t * 3 + 1] * 3;
      const c = triangles[t * 3 + 2] * 3;
      const u0 = Math.min(view[a], view[b], view[c]);
      const u1 = Math.max(view[a], view[b], view[c]);
      const v0 = Math.min(view[a + 1], view[b + 1], view[c + 1]);
      const v1 = Math.max(view[a + 1], view[b + 1], view[c + 1]);
      triMinU[t] = u0;
      triMaxU[t] = u1;
      triMinV[t] = v0;
      triMaxV[t] = v1;
      // Triangles seen (nearly) edge-on cover no area and hide nothing; their
      // interpolated depth is also ill-conditioned (a top face seen from the
      // side would "hide" its own front edge).
      if (!facesViewer(view, a, b, c)) {
        triMaxW[t] = -Infinity;
        continue;
      }
      triMaxW[t] = Math.max(view[a + 2], view[b + 2], view[c + 2]);
      if (u0 < lx) lx = u0;
      if (u1 > hx) hx = u1;
      if (v0 < ly) ly = v0;
      if (v1 > hy) hy = v1;
    }
    this.triMinU = triMinU;
    this.triMaxU = triMaxU;
    this.triMinV = triMinV;
    this.triMaxV = triMaxV;
    this.triMaxW = triMaxW;
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
      if (triMaxW[t] === -Infinity) return;
      const i0 = this.col(triMinU[t]);
      const i1 = this.col(triMaxU[t]);
      const j0 = this.row(triMinV[t]);
      const j1 = this.row(triMaxV[t]);
      for (let j = j0; j <= j1; j += 1) for (let i = i0; i <= i1; i += 1) fn(j * this.nx + i);
    };
    for (let t = 0; t < nTri; t += 1) span(t, c => { counts[c + 1] += 1; });
    for (let c = 1; c < counts.length; c += 1) counts[c] += counts[c - 1];
    this.cellStart = counts;
    this.cellTris = new Int32Array(counts[counts.length - 1]);
    const fill = counts.slice(0, counts.length - 1);
    for (let t = 0; t < nTri; t += 1) span(t, c => { this.cellTris[fill[c]++] = t; });
    // Nearest-first per cell, so hiddenIn can stop at the first triangle that
    // cannot reach in front of the query point.
    const nCells = counts.length - 1;
    const cellMaxW = new Float64Array(nCells);
    for (let c = 0; c < nCells; c += 1) {
      const start = counts[c];
      const end = counts[c + 1];
      if (start === end) {
        cellMaxW[c] = -Infinity;
        continue;
      }
      const slice = this.cellTris.subarray(start, end);
      slice.sort((x, y) => triMaxW[y] - triMaxW[x]);
      cellMaxW[c] = triMaxW[slice[0]];
    }
    this.cellMaxW = cellMaxW;
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
    const threshold = w + eps;
    // A triangle cannot reach in front of the point from behind its deepest
    // vertex, so whole cells and cell tails are skipped on the same test.
    if (this.cellMaxW[c] <= threshold) return false;
    const end = this.cellStart[c + 1];
    for (let k = this.cellStart[c]; k < end; k += 1) {
      const t = this.cellTris[k];
      if (this.triMaxW[t] <= threshold) break;
      if (this.cover(t, u, v, threshold, reach, own1, own2)) return true;
    }
    return false;
  }

  /** True when triangle `t` covers (u, v) at a depth beyond `threshold`. */
  private cover(
    t: number, u: number, v: number, threshold: number, reach: number, own1: number, own2: number,
  ): boolean {
    if (u < this.triMinU[t] - reach || u > this.triMaxU[t] + reach) return false;
    if (v < this.triMinV[t] - reach || v > this.triMaxV[t] + reach) return false;
    const view = this.view;
    const tris = this.triangles;
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
      if (reach <= 0 || this.triangleFace[t] === own1 || this.triangleFace[t] === own2) return false;
      const near = nearestOnTriangle(u - ax, v - ay, e1x, e1y, e2x, e2y);
      if (near.distance > reach) return false;
      s = near.s;
      r = near.r;
    }
    const depth = view[a + 2] + s * (view[b + 2] - view[a + 2]) + r * (view[p + 2] - view[a + 2]);
    return depth > threshold;
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
