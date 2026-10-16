// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/inProcess/voxelize.ts
//
// Solid -> regular brick grid, from the shape's own surface triangulation.
//
// The grid spans the bounding box exactly (per-axis spacing = extent / n), so
// every bounding-box face of the part lies ON a node plane and a face held at
// "minX" gets a full plane of nodes. A brick is solid when its centre is
// inside the part, decided by casting one ray per (x, y) column along +Z and
// filling between successive crossings (even-odd rule). Columns are cast
// through the cell centres, nudged by a sub-micron offset so a ray never runs
// exactly along a mesh edge of an axis-aligned part.

export interface TriangleSoup {
  /** xyz triples. */
  positions: ArrayLike<number>;
  /** Vertex-index triples. */
  indices: ArrayLike<number>;
}

export interface VoxelGrid {
  origin: [number, number, number];
  /** Brick size per axis, mm. */
  h: [number, number, number];
  /** Brick count per axis. */
  n: [number, number, number];
  /** 1 where the brick is solid, indexed i + nx * (j + ny * k). */
  solid: Uint8Array;
  solidCount: number;
}

export interface GridSpec {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
  /** Target brick edge, mm (the per-axis spacing is the nearest that tiles the extent). */
  size: number;
}

/** Bricks per axis for a target size: at least 2 along every axis. */
export function gridCounts(spec: GridSpec): [number, number, number] {
  const n = [0, 1, 2].map(a => Math.max(2, Math.round((spec.max[a] - spec.min[a]) / spec.size)));
  return [n[0], n[1], n[2]];
}

/** Z crossings of the vertical line (x, y) with every triangle, sorted. */
function columnCrossings(
  soup: TriangleSoup,
  tris: readonly number[],
  x: number,
  y: number,
): number[] {
  const P = soup.positions;
  const I = soup.indices;
  const zs: number[] = [];
  for (const t of tris) {
    const a = 3 * I[3 * t];
    const b = 3 * I[3 * t + 1];
    const c = 3 * I[3 * t + 2];
    const ax = P[a], ay = P[a + 1], bx = P[b], by = P[b + 1], cx = P[c], cy = P[c + 1];
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(det) < 1e-18) continue; // edge-on to the ray
    const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det;
    const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det;
    const l3 = 1 - l1 - l2;
    if (l1 < 0 || l2 < 0 || l3 < 0) continue;
    zs.push(l1 * P[a + 2] + l2 * P[b + 2] + l3 * P[c + 2]);
  }
  zs.sort((p, q) => p - q);
  // A ray through a shared edge hits both triangles: collapse near-duplicates.
  return zs.filter((z, i) => i === 0 || z - zs[i - 1] > 1e-9);
}

/** Triangles binned by the (i, j) columns their XY bounding box overlaps. */
function binTriangles(soup: TriangleSoup, grid: Pick<VoxelGrid, 'origin' | 'h' | 'n'>): number[][] {
  const [nx, ny] = grid.n;
  const bins: number[][] = Array.from({ length: nx * ny }, () => []);
  const P = soup.positions;
  const I = soup.indices;
  const triCount = I.length / 3;
  const cell = (v: number, axis: 0 | 1, nAxis: number): number =>
    Math.min(nAxis - 1, Math.max(0, Math.floor((v - grid.origin[axis]) / grid.h[axis])));
  for (let t = 0; t < triCount; t++) {
    const xs = [P[3 * I[3 * t]], P[3 * I[3 * t + 1]], P[3 * I[3 * t + 2]]];
    const ys = [P[3 * I[3 * t] + 1], P[3 * I[3 * t + 1] + 1], P[3 * I[3 * t + 2] + 1]];
    const i0 = cell(Math.min(...xs), 0, nx), i1 = cell(Math.max(...xs), 0, nx);
    const j0 = cell(Math.min(...ys), 1, ny), j1 = cell(Math.max(...ys), 1, ny);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) bins[i + nx * j].push(t);
  }
  return bins;
}

/** Mark the bricks of one column whose centre lies between an odd/even pair
 *  of crossings. Returns how many were marked. */
function fillColumn(grid: VoxelGrid, i: number, j: number, zs: readonly number[]): number {
  const [nx, ny, nz] = grid.n;
  let marked = 0;
  for (let p = 0; p + 1 < zs.length; p += 2) {
    for (let k = 0; k < nz; k++) {
      const zc = grid.origin[2] + (k + 0.5) * grid.h[2];
      if (zc > zs[p] && zc < zs[p + 1]) {
        grid.solid[i + nx * (j + ny * k)] = 1;
        marked++;
      }
    }
  }
  return marked;
}

/** Voxelize a closed triangle surface on the grid described by `spec`. */
export function voxelize(soup: TriangleSoup, spec: GridSpec): VoxelGrid {
  const n = gridCounts(spec);
  const h: [number, number, number] = [0, 1, 2].map(a => (spec.max[a] - spec.min[a]) / n[a]) as [number, number, number];
  const grid: VoxelGrid = {
    origin: [spec.min[0], spec.min[1], spec.min[2]],
    h,
    n,
    solid: new Uint8Array(n[0] * n[1] * n[2]),
    solidCount: 0,
  };
  const bins = binTriangles(soup, grid);
  const nudge = 1.37e-7 * Math.max(h[0], h[1]);
  for (let j = 0; j < n[1]; j++) {
    for (let i = 0; i < n[0]; i++) {
      const x = grid.origin[0] + (i + 0.5) * h[0] + nudge;
      const y = grid.origin[1] + (j + 0.5) * h[1] + 0.61 * nudge;
      const zs = columnCrossings(soup, bins[i + n[0] * j], x, y);
      grid.solidCount += fillColumn(grid, i, j, zs);
    }
  }
  return grid;
}

/**
 * Keep only the largest FACE-connected cluster of solid bricks; returns how
 * many bricks were dropped.
 *
 * Two bricks that share only an edge or a corner are a hinge, not a joint: a
 * staircase voxelization of a thin curved wall produces such chains, and each
 * one is a zero-energy mechanism that leaves the stiffness matrix singular
 * (the iterative solve then diverges instead of converging). Islands that
 * touch the main body only along edges are dropped for the same reason.
 */
export function keepLargestFaceConnected(grid: VoxelGrid): number {
  const [nx, ny, nz] = grid.n;
  const label = new Int32Array(grid.solid.length).fill(-1);
  const sizes: number[] = [];
  const steps = [1, -1, nx, -nx, nx * ny, -nx * ny];
  const inBounds = (idx: number, s: number): boolean => {
    const i = idx % nx, j = Math.floor(idx / nx) % ny, k = Math.floor(idx / (nx * ny));
    return !((s === 1 && i === nx - 1) || (s === -1 && i === 0) || (s === nx && j === ny - 1) ||
      (s === -nx && j === 0) || (s === nx * ny && k === nz - 1) || (s === -nx * ny && k === 0));
  };
  for (let start = 0; start < grid.solid.length; start++) {
    if (grid.solid[start] !== 1 || label[start] >= 0) continue;
    const id = sizes.length;
    let size = 0;
    const stack = [start];
    label[start] = id;
    while (stack.length > 0) {
      const c = stack.pop() as number;
      size++;
      for (const s of steps) {
        const nb = c + s;
        if (!inBounds(c, s) || grid.solid[nb] !== 1 || label[nb] >= 0) continue;
        label[nb] = id;
        stack.push(nb);
      }
    }
    sizes.push(size);
  }
  if (sizes.length <= 1) return 0;
  const keep = sizes.indexOf(Math.max(...sizes));
  let dropped = 0;
  for (let idx = 0; idx < grid.solid.length; idx++) {
    if (grid.solid[idx] === 1 && label[idx] !== keep) { grid.solid[idx] = 0; dropped++; }
  }
  grid.solidCount -= dropped;
  return dropped;
}
