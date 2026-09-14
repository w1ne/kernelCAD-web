// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/fidelity.ts
//
// How faithful is a reconstruction to the mesh it came from? Two numbers that
// fail differently, so neither can be gamed alone:
//
//   - Volume IoU by column ray casting. A grid of parallel rays crosses both
//     meshes; along each ray the inside intervals come from the winding number
//     of the signed crossings (robust to a ray grazing a shared edge), and the
//     per-ray intersection / union lengths are exact in 1D. IoU = Σ∩ / Σ∪.
//   - Symmetric surface deviation (max + RMS) from `meshDeviation` — the
//     point-to-triangle distance core the geometry diff uses. A thin missing
//     rib barely moves IoU but shows up here; a slightly offset wall shows up
//     in both.

import { meshDeviation, pointTriangleDistanceSq, type MeshDeviationResult } from '../../modeling/runtime/meshDeviation';
import type { RuntimeMesh } from '../../kernel/backends/runtimeMesh';

export interface TriMesh {
  /** 3 per vertex. */
  positions: ArrayLike<number>;
  /** 3 per triangle, outward CCW. */
  indices: ArrayLike<number>;
}

export interface VolumeIoU {
  iou: number;
  volumeA: number;
  volumeB: number;
  intersection: number;
  rays: number;
}

interface Hit {
  t: number;
  w: number;
}

/** Column bins of triangles projected onto the plane ⟂ `axis` (0=x,1=y,2=z). */
class ColumnGrid {
  readonly cells: number[][];
  readonly mesh: TriMesh;
  readonly axis: 0 | 1 | 2;
  readonly nu: number;
  constructor(mesh: TriMesh, axis: 0 | 1 | 2, u0: number, v0: number, cell: number, nu: number, nv: number) {
    this.mesh = mesh;
    this.axis = axis;
    this.nu = nu;
    this.cells = Array.from({ length: nu * nv }, () => []);
    const [iu, iv] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
    const p = mesh.positions;
    const idx = mesh.indices;
    for (let t = 0; t < idx.length / 3; t++) {
      let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
      for (let k = 0; k < 3; k++) {
        const v = idx[t * 3 + k] * 3;
        minU = Math.min(minU, p[v + iu]);
        maxU = Math.max(maxU, p[v + iu]);
        minV = Math.min(minV, p[v + iv]);
        maxV = Math.max(maxV, p[v + iv]);
      }
      const a0 = Math.max(0, Math.floor((minU - u0) / cell));
      const a1 = Math.min(nu - 1, Math.floor((maxU - u0) / cell));
      const b0 = Math.max(0, Math.floor((minV - v0) / cell));
      const b1 = Math.min(nv - 1, Math.floor((maxV - v0) / cell));
      for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) this.cells[b * nu + a].push(t);
    }
  }

  /** Inside intervals along the ray through (u, v), as a flat [t0, t1, …] list. */
  intervals(u: number, v: number, a: number, b: number): number[] {
    const [iu, iv, iw] = this.axis === 0 ? [1, 2, 0] : this.axis === 1 ? [0, 2, 1] : [0, 1, 2];
    const p = this.mesh.positions;
    const idx = this.mesh.indices;
    const hits: Hit[] = [];
    for (const t of this.cells[b * this.nu + a]) {
      const i0 = idx[t * 3] * 3, i1 = idx[t * 3 + 1] * 3, i2 = idx[t * 3 + 2] * 3;
      const ax = p[i0 + iu], ay = p[i0 + iv], bx = p[i1 + iu], by = p[i1 + iv], cx = p[i2 + iu], cy = p[i2 + iv];
      const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
      if (Math.abs(area) < 1e-14) continue;
      const w0 = ((bx - u) * (cy - v) - (cx - u) * (by - v)) / area;
      const w1 = ((cx - u) * (ay - v) - (ax - u) * (cy - v)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const depth = w0 * p[i0 + iw] + w1 * p[i1 + iw] + w2 * p[i2 + iw];
      // Projected area sign = sign of the normal's component along the ray
      // (for a right-handed (u, v, w) basis). A ray travelling +w enters the
      // solid through a face whose outward normal points −w.
      const handed = this.axis === 1 ? -1 : 1;
      hits.push({ t: depth, w: area * handed < 0 ? 1 : -1 });
    }
    hits.sort((x, y) => x.t - y.t);
    const out: number[] = [];
    let winding = 0;
    let start = 0;
    for (const h of hits) {
      const before = winding;
      winding += h.w;
      if (before <= 0 && winding > 0) start = h.t;
      else if (before > 0 && winding <= 0) out.push(start, h.t);
    }
    return out;
  }
}

function intervalLength(iv: number[]): number {
  let s = 0;
  for (let i = 0; i < iv.length; i += 2) s += iv[i + 1] - iv[i];
  return s;
}

function intersectLength(a: number[], b: number[]): number {
  let i = 0;
  let j = 0;
  let s = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i], b[j]);
    const hi = Math.min(a[i + 1], b[j + 1]);
    if (hi > lo) s += hi - lo;
    if (a[i + 1] < b[j + 1]) i += 2;
    else j += 2;
  }
  return s;
}

function bounds(m: TriMesh): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], m.positions[i + k]);
      max[k] = Math.max(max[k], m.positions[i + k]);
    }
  }
  return { min, max };
}

/**
 * Volume IoU of two closed, outward-oriented meshes. `resolution` is the
 * number of ray columns along the longer side of the projected bounding box.
 */
export function volumeIoU(a: TriMesh, b: TriMesh, resolution = 192): VolumeIoU {
  const ba = bounds(a);
  const bb = bounds(b);
  const min = [0, 1, 2].map((k) => Math.min(ba.min[k], bb.min[k]));
  const max = [0, 1, 2].map((k) => Math.max(ba.max[k], bb.max[k]));
  const ext = [0, 1, 2].map((k) => max[k] - min[k]);
  // Cast along the axis with the largest projected area (fewest grazing walls
  // per unit volume is not guaranteed, but the column count is best spent
  // across the widest footprint).
  const axis = (ext[0] <= ext[1] && ext[0] <= ext[2] ? 0 : ext[1] <= ext[2] ? 1 : 2) as 0 | 1 | 2;
  const [iu, iv] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
  const cell = Math.max(ext[iu], ext[iv]) / resolution || 1;
  const nu = Math.max(1, Math.ceil(ext[iu] / cell));
  const nv = Math.max(1, Math.ceil(ext[iv] / cell));
  const ga = new ColumnGrid(a, axis, min[iu], min[iv], cell, nu, nv);
  const gb = new ColumnGrid(b, axis, min[iu], min[iv], cell, nu, nv);
  // Irrational in-cell offsets keep rays off tessellation-aligned edges.
  const fu = 0.5 + 0.1180339887;
  const fv = 0.5 - 0.0827949014;
  let va = 0, vb = 0, vi = 0;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const u = min[iu] + (i + fu) * cell;
      const v = min[iv] + (j + fv) * cell;
      const ia = ga.intervals(u, v, i, j);
      const ib = gb.intervals(u, v, i, j);
      va += intervalLength(ia);
      vb += intervalLength(ib);
      vi += intersectLength(ia, ib);
    }
  }
  const area = cell * cell;
  const union = va + vb - vi;
  return {
    iou: union > 0 ? vi / union : 1,
    volumeA: va * area,
    volumeB: vb * area,
    intersection: vi * area,
    rays: nu * nv,
  };
}

/** Point-in-solid by the winding number along a single +Z ray. */
export function pointInsideMesh(m: TriMesh, x: number, y: number, z: number): boolean {
  const p = m.positions;
  const idx = m.indices;
  let winding = 0;
  for (let t = 0; t < idx.length / 3; t++) {
    const i0 = idx[t * 3] * 3, i1 = idx[t * 3 + 1] * 3, i2 = idx[t * 3 + 2] * 3;
    const ax = p[i0], ay = p[i0 + 1], bx = p[i1], by = p[i1 + 1], cx = p[i2], cy = p[i2 + 1];
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (Math.abs(area) < 1e-14) continue;
    const w0 = ((bx - x) * (cy - y) - (cx - x) * (by - y)) / area;
    const w1 = ((cx - x) * (ay - y) - (ax - x) * (cy - y)) / area;
    const w2 = 1 - w0 - w1;
    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
    const depth = w0 * p[i0 + 2] + w1 * p[i1 + 2] + w2 * p[i2 + 2];
    if (depth <= z) continue;
    winding += area < 0 ? 1 : -1;
  }
  // Above an inside point the ray leaves the solid once more than it enters
  // (exit = outward normal +z = positive projected area = −1).
  return winding < 0;
}

export function surfaceDeviation(a: TriMesh, b: TriMesh): MeshDeviationResult {
  return meshDeviation(toRuntimeMesh(a), toRuntimeMesh(b));
}

function toRuntimeMesh(m: TriMesh): RuntimeMesh {
  return {
    positions: Float32Array.from(m.positions),
    normals: new Float32Array(0),
    indices: Uint32Array.from(m.indices),
  };
}

/**
 * Max distance from (up to `maxSamples`, strided) points to a triangle mesh.
 * Used to decide whether a region the feature vocabulary could not name is
 * nevertheless reproduced by the emitted script (a scan's noisy bore wall is;
 * a freeform bulge is not).
 */
export function maxDistanceToMesh(points: ArrayLike<number>, m: TriMesh, maxSamples = 256): number {
  const idx = m.indices;
  const p = m.positions;
  const triCount = idx.length / 3;
  const bounds = new Float64Array(triCount * 6);
  for (let t = 0; t < triCount; t++) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k] * 3;
      x0 = Math.min(x0, p[v]); x1 = Math.max(x1, p[v]);
      y0 = Math.min(y0, p[v + 1]); y1 = Math.max(y1, p[v + 1]);
      z0 = Math.min(z0, p[v + 2]); z1 = Math.max(z1, p[v + 2]);
    }
    bounds.set([x0, y0, z0, x1, y1, z1], t * 6);
  }
  const count = points.length / 3;
  const stride = Math.max(1, Math.ceil(count / maxSamples));
  let worst = 0;
  for (let i = 0; i < count; i += stride) {
    const px = points[i * 3], py = points[i * 3 + 1], pz = points[i * 3 + 2];
    let best = Infinity;
    for (let t = 0; t < triCount; t++) {
      const o = t * 6;
      const dx = px < bounds[o] ? bounds[o] - px : px > bounds[o + 3] ? px - bounds[o + 3] : 0;
      const dy = py < bounds[o + 1] ? bounds[o + 1] - py : py > bounds[o + 4] ? py - bounds[o + 4] : 0;
      const dz = pz < bounds[o + 2] ? bounds[o + 2] - pz : pz > bounds[o + 5] ? pz - bounds[o + 5] : 0;
      if (dx * dx + dy * dy + dz * dz >= best) continue;
      const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
      const d = pointTriangleDistanceSq(px, py, pz, p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2]);
      if (d < best) best = d;
    }
    if (best !== Infinity) worst = Math.max(worst, Math.sqrt(best));
  }
  return worst;
}

export type FidelityVerdict = 'faithful' | 'approximate' | 'failed';

export interface FidelityThresholds {
  minIoU: number;
  maxDeviationMm: number;
  approximateIoU: number;
}

export function classifyFidelity(
  m: { volumeIoU: number; maxDeviationMm: number },
  t: FidelityThresholds,
  watertight: boolean,
  unmatchedCount: number,
): FidelityVerdict {
  if (m.volumeIoU >= t.minIoU && m.maxDeviationMm <= t.maxDeviationMm && watertight && unmatchedCount === 0) {
    return 'faithful';
  }
  if (m.volumeIoU >= t.approximateIoU) return 'approximate';
  return 'failed';
}
