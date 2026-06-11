// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/voxelGrid.ts
//
// W3 Task 6 — voxel rasterization + grid primitives for the void/channel
// topology check (voidTopology.ts). Three exports:
//
//   - voxelize(): binary solid grid over the part bbox, filled by X-column
//     ray parity against the export-grade mesh (TriangleBvh.allHits);
//   - edt2(): exact squared Euclidean distance transform (separable
//     Felzenszwalb–Huttenlocher, one O(n) lower-envelope pass per axis);
//   - components(): BFS connected-component labeling at 6- or
//     26-connectivity, returning per-component voxel count, bbox and seed.
//
// Rasterization (voxelize):
//   - The grid covers the part bbox dilated by CLOSING_RADIUS_MM + 2 voxels
//     per side, so the morphological closing in voidTopology.ts (radius
//     CLOSING_RADIUS_MM) can never clip against the grid boundary and the
//     outside-air flood always has a connected boundary shell.
//   - voxelMm = max(targetMm, cbrt(dilatedBboxVolume / maxVoxels)). The
//     clamp is a budget target, not a hard cap: the padding is recomputed
//     once with the clamped voxel size, which can push the final count
//     slightly above maxVoxels (bounded by the padding growth).
//   - Fill is ONE allHits ray per (y, z) column along +x (≤ ny·nz rays, not
//     per-voxel). Hits arrive ascending; they are deduplicated by t within
//     1e-9 (the pointInside convention — every triangle incident to a
//     pierced shared edge/vertex reports the same crossing) and consecutive
//     pairs become inside spans. A column left with an ODD crossing count
//     is cracked (non-watertight patch or a residual tangential graze): its
//     unpaired tail hit is dropped and `crackedColumns` is incremented so
//     callers can judge the rasterization's trustworthiness.
//
// Sub-voxel column offset (review-mandated): axis-aligned parity rays
// against axis-aligned CAD geometry are prone to tangential edge/vertex
// grazing — a ray running exactly inside a face plane, or along a
// tessellation silhouette edge, flips parity. Each column is therefore
// offset from the voxel center by a DETERMINISTIC irrational sub-voxel
// fraction, different per axis (y: (√2−1)/2 ≈ 0.207 voxel, z: (√3−1)/2 ≈
// 0.366 voxel), so no column can lie in a rational-coordinate lattice
// plane of the geometry. Irrational fractions were chosen over a plain
// half-voxel because a half-voxel offset can still land on a geometry
// plane for unlucky bbox/voxel-size combinations; no randomness is used —
// identical input yields the identical grid. The voxel's occupancy is
// therefore SAMPLED at its offset column position, not its exact center: a
// sub-voxel bias well below the 0.4 mm default resolution.

import type { Vec3 } from '../../../shared/intent/types';
import type { TriangleBvh, DfmMesh } from './meshBvh';

/** Morphological closing radius (mm) used by voidTopology.ts; the voxel
 *  grid is padded by this plus 2 voxels so the closing never clips. Seals
 *  channel mouths up to ~2× this diameter (≈ 16 mm). */
export const CLOSING_RADIUS_MM = 8;

/** Deterministic sub-voxel column offsets (fraction of a voxel, see module
 *  header). Exported for samplePoint consumers/tests. */
export const COLUMN_OFFSET_Y = 0.5 * (Math.SQRT2 - 1);
export const COLUMN_OFFSET_Z = 0.5 * (Math.sqrt(3) - 1);

/** Dedup window for coincident ray hits — same convention as
 *  TriangleBvh.pointInside. */
const PARITY_T_EPS = 1e-9;

/** "No feature voxel reachable" distance for edt2 — large enough to exceed
 *  any squared radius compared against, small enough to stay finite through
 *  the envelope arithmetic. */
const EDT_INF = 1e20;

export interface GridDims {
  nx: number;
  ny: number;
  nz: number;
}

export interface VoxelGrid extends GridDims {
  /** Edge length of one voxel (mm). */
  voxelMm: number;
  /** Grid min corner (mm, mesh frame). See samplePoint() for the mapping
   *  from voxel indices to the sampled position. */
  origin: [number, number, number];
  /** nx·ny·nz occupancy bytes, 1 = solid. Linear index x + nx·(y + ny·z). */
  solid: Uint8Array;
  /** Columns whose deduplicated crossing count was odd (unpaired tail hit
   *  dropped). Non-zero means the rasterization hit non-watertight or
   *  grazing geometry and downstream counts may be off near those columns. */
  crackedColumns: number;
}

/** The position (mm) at which voxel (i, j, k) was sampled: the voxel center
 *  plus the deterministic sub-voxel column offsets on y and z. */
export function samplePoint(grid: VoxelGrid, i: number, j: number, k: number): [number, number, number] {
  return [
    grid.origin[0] + (i + 0.5) * grid.voxelMm,
    grid.origin[1] + (j + 0.5 + COLUMN_OFFSET_Y) * grid.voxelMm,
    grid.origin[2] + (k + 0.5 + COLUMN_OFFSET_Z) * grid.voxelMm,
  ];
}

/**
 * Rasterize a watertight export-grade mesh into a binary voxel grid by
 * X-column ray parity. `bvh` MUST have been built from `mesh` (same caveat
 * as checkMinWall). See the module header for the grid extent, voxel-size
 * clamp, column-offset and cracked-column semantics.
 */
export function voxelize(
  mesh: DfmMesh,
  bvh: TriangleBvh,
  targetMm = 0.4,
  maxVoxels = 2_000_000,
): VoxelGrid {
  // Part bbox over the mesh vertices (export meshes have no orphan verts).
  const { vertices } = mesh;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let v = 0; v < vertices.length; v += 3) {
    const x = vertices[v], y = vertices[v + 1], z = vertices[v + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  if (!(minX <= maxX)) {
    // Empty mesh: a single all-air voxel keeps every consumer well-defined.
    return {
      nx: 1, ny: 1, nz: 1, voxelMm: targetMm,
      origin: [0, 0, 0], solid: new Uint8Array(1), crackedColumns: 0,
    };
  }

  // Voxel size from the dilated bbox volume; one refinement pass with the
  // clamped size (padding depends on voxelMm, voxelMm on the padded volume).
  let voxelMm = targetMm;
  for (let pass = 0; pass < 2; pass++) {
    const pad = CLOSING_RADIUS_MM + 2 * voxelMm;
    const vol = (maxX - minX + 2 * pad) * (maxY - minY + 2 * pad) * (maxZ - minZ + 2 * pad);
    voxelMm = Math.max(targetMm, Math.cbrt(vol / maxVoxels));
  }
  const pad = CLOSING_RADIUS_MM + 2 * voxelMm;
  const ox = minX - pad, oy = minY - pad, oz = minZ - pad;
  const nx = Math.ceil((maxX - minX + 2 * pad) / voxelMm);
  const ny = Math.ceil((maxY - minY + 2 * pad) / voxelMm);
  const nz = Math.ceil((maxZ - minZ + 2 * pad) / voxelMm);

  const solid = new Uint8Array(nx * ny * nz);
  let crackedColumns = 0;

  const rayOx = ox - voxelMm; // strictly outside the grid, dir = +x
  const dir: Vec3 = [1, 0, 0];
  for (let k = 0; k < nz; k++) {
    const z = oz + (k + 0.5 + COLUMN_OFFSET_Z) * voxelMm;
    for (let j = 0; j < ny; j++) {
      const y = oy + (j + 0.5 + COLUMN_OFFSET_Y) * voxelMm;
      const hits = bvh.allHits([rayOx, y, z], dir, 0);
      if (hits.length === 0) continue;

      // Dedup coincident crossings (ascending t from allHits).
      const xs: number[] = [];
      let lastT = -Infinity;
      for (const h of hits) {
        if (h.t - lastT > PARITY_T_EPS) xs.push(rayOx + h.t);
        lastT = h.t;
      }
      if (xs.length & 1) {
        xs.pop(); // drop the unpaired tail crossing
        crackedColumns++;
      }

      const base = nx * (j + ny * k);
      for (let p = 0; p + 1 < xs.length; p += 2) {
        // Voxels whose center x lies strictly inside the span (x0, x1).
        const i0 = Math.max(0, Math.floor((xs[p] - ox) / voxelMm - 0.5) + 1);
        const i1 = Math.min(nx - 1, Math.ceil((xs[p + 1] - ox) / voxelMm - 0.5) - 1);
        for (let i = i0; i <= i1; i++) solid[base + i] = 1;
      }
    }
  }

  return { nx, ny, nz, voxelMm, origin: [ox, oy, oz], solid, crackedColumns };
}

/**
 * Exact squared Euclidean distance transform: for every voxel, the squared
 * distance IN VOXEL UNITS to the nearest mask ≠ 0 voxel (≥ 1e18 when the
 * mask is empty along every reachable path — compare, don't trust the exact
 * magnitude). Separable Felzenszwalb–Huttenlocher lower-envelope scan, one
 * O(n) pass per axis (3 total). Multiply by voxelMm² for mm².
 */
export function edt2(mask: Uint8Array, dims: GridDims): Float64Array {
  const { nx, ny, nz } = dims;
  const n = nx * ny * nz;
  const dist = new Float64Array(n);
  for (let idx = 0; idx < n; idx++) dist[idx] = mask[idx] ? 0 : EDT_INF;

  const maxDim = Math.max(nx, ny, nz);
  const f = new Float64Array(maxDim);
  const d = new Float64Array(maxDim);
  const v = new Int32Array(maxDim);
  const zEnv = new Float64Array(maxDim + 1);

  // Pass along x (stride 1), then y (stride nx), then z (stride nx·ny).
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      const base = nx * (j + ny * k);
      for (let i = 0; i < nx; i++) f[i] = dist[base + i];
      edt1d(f, nx, d, v, zEnv);
      for (let i = 0; i < nx; i++) dist[base + i] = d[i];
    }
  }
  for (let k = 0; k < nz; k++) {
    for (let i = 0; i < nx; i++) {
      const base = i + nx * ny * k;
      for (let j = 0; j < ny; j++) f[j] = dist[base + j * nx];
      edt1d(f, ny, d, v, zEnv);
      for (let j = 0; j < ny; j++) dist[base + j * nx] = d[j];
    }
  }
  const sliceStride = nx * ny;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const base = i + nx * j;
      for (let k = 0; k < nz; k++) f[k] = dist[base + k * sliceStride];
      edt1d(f, nz, d, v, zEnv);
      for (let k = 0; k < nz; k++) dist[base + k * sliceStride] = d[k];
    }
  }
  return dist;
}

/** 1-D squared-distance lower envelope (Felzenszwalb–Huttenlocher §3):
 *  d[q] = min_p ((q − p)² + f[p]). `v` holds parabola apexes, `zEnv` their
 *  envelope boundaries. EDT_INF inputs stay finite, so the intersection
 *  arithmetic never produces NaN (1e20 − 1e20 = 0 exactly in IEEE754). */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, zEnv: Float64Array): void {
  let k = 0;
  v[0] = 0;
  zEnv[0] = -Infinity;
  zEnv[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= zEnv[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    zEnv[k] = s;
    zEnv[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (zEnv[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

export interface VoxelComponent {
  voxelCount: number;
  /** Inclusive voxel-index bounds [minX, minY, minZ, maxX, maxY, maxZ]. */
  bbox: [number, number, number, number, number, number];
  /** Linear index of the first-discovered voxel (scan order — the
   *  component's lowest z, then y, then x; deterministic). */
  seed: number;
}

export interface ComponentLabeling {
  /** Per-voxel component id, −1 outside the mask. */
  labels: Int32Array;
  /** Components in discovery (scan) order. */
  components: VoxelComponent[];
}

/**
 * BFS connected-component labeling of `mask ≠ 0` voxels. Connectivity 6 =
 * face neighbors only; 26 = face + edge + corner neighbors. Iterative with
 * a preallocated ring queue — no recursion, O(n) total.
 */
export function components(mask: Uint8Array, dims: GridDims, connectivity: 6 | 26): ComponentLabeling {
  const { nx, ny, nz } = dims;
  const n = nx * ny * nz;
  const labels = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  const comps: VoxelComponent[] = [];

  for (let seedIdx = 0; seedIdx < n; seedIdx++) {
    if (!mask[seedIdx] || labels[seedIdx] !== -1) continue;
    const id = comps.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = seedIdx;
    labels[seedIdx] = id;
    let count = 0;
    let bx0 = nx, by0 = ny, bz0 = nz, bx1 = -1, by1 = -1, bz1 = -1;

    while (head < tail) {
      const idx = queue[head++];
      count++;
      const i = idx % nx;
      const rest = (idx / nx) | 0;
      const j = rest % ny;
      const k = (rest / ny) | 0;
      if (i < bx0) bx0 = i; if (i > bx1) bx1 = i;
      if (j < by0) by0 = j; if (j > by1) by1 = j;
      if (k < bz0) bz0 = k; if (k > bz1) bz1 = k;

      if (connectivity === 6) {
        if (i > 0 && mask[idx - 1] && labels[idx - 1] === -1) { labels[idx - 1] = id; queue[tail++] = idx - 1; }
        if (i + 1 < nx && mask[idx + 1] && labels[idx + 1] === -1) { labels[idx + 1] = id; queue[tail++] = idx + 1; }
        if (j > 0 && mask[idx - nx] && labels[idx - nx] === -1) { labels[idx - nx] = id; queue[tail++] = idx - nx; }
        if (j + 1 < ny && mask[idx + nx] && labels[idx + nx] === -1) { labels[idx + nx] = id; queue[tail++] = idx + nx; }
        const down = idx - nx * ny;
        const up = idx + nx * ny;
        if (k > 0 && mask[down] && labels[down] === -1) { labels[down] = id; queue[tail++] = down; }
        if (k + 1 < nz && mask[up] && labels[up] === -1) { labels[up] = id; queue[tail++] = up; }
      } else {
        for (let dk = -1; dk <= 1; dk++) {
          const kk = k + dk;
          if (kk < 0 || kk >= nz) continue;
          for (let dj = -1; dj <= 1; dj++) {
            const jj = j + dj;
            if (jj < 0 || jj >= ny) continue;
            for (let di = -1; di <= 1; di++) {
              if (di === 0 && dj === 0 && dk === 0) continue;
              const ii = i + di;
              if (ii < 0 || ii >= nx) continue;
              const nIdx = ii + nx * (jj + ny * kk);
              if (mask[nIdx] && labels[nIdx] === -1) {
                labels[nIdx] = id;
                queue[tail++] = nIdx;
              }
            }
          }
        }
      }
    }

    comps.push({
      voxelCount: count,
      bbox: [bx0, by0, bz0, bx1, by1, bz1],
      seed: seedIdx,
    });
  }

  return { labels, components: comps };
}
