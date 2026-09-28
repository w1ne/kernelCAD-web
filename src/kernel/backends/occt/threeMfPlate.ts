// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/threeMfPlate.ts
//
// Print-bed layout for the 3MF writer: pure mesh math, no OCCT handles.
//
//   - `orientLargestFlatFaceDown` rotates a triangle mesh so its largest
//     planar face that the whole part can rest on (a support plane: no
//     vertex lies beyond it) faces -Z.
//   - `dropToPlateOrigin` re-centres a mesh on its XY bbox centre and puts
//     its lowest point on Z=0, so a 3MF build item transform alone places it.
//   - `packFootprints` is a shelf bin-packer over XY footprints, centred on
//     the bed. It never overlaps footprints (a `spacingMm` gap between
//     them); parts that do not fit the bed still get a non-overlapping slot
//     beyond it, and the result says so.

import type { MeshData } from './exportStlBinary';

export interface Bounds3 {
  min: [number, number, number];
  max: [number, number, number];
}

export function meshBounds(mesh: MeshData): Bounds3 {
  const v = mesh.vertices;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < v.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const c = v[i + a];
      if (c < min[a]) min[a] = c;
      if (c > max[a]) max[a] = c;
    }
  }
  return { min, max };
}

/** Translate every vertex by `(dx, dy, dz)`; returns a new mesh. */
export function translateMesh(mesh: MeshData, dx: number, dy: number, dz: number): MeshData {
  const src = mesh.vertices;
  const out = new Array<number>(src.length);
  for (let i = 0; i < src.length; i += 3) {
    out[i] = src[i] + dx;
    out[i + 1] = src[i + 1] + dy;
    out[i + 2] = src[i + 2] + dz;
  }
  return { vertices: out, triangles: mesh.triangles };
}

/** Re-centre on the XY bbox centre and rest the lowest point on Z=0. */
export function dropToPlateOrigin(mesh: MeshData): MeshData {
  const b = meshBounds(mesh);
  return translateMesh(
    mesh,
    -(b.min[0] + b.max[0]) / 2,
    -(b.min[1] + b.max[1]) / 2,
    -b.min[2],
  );
}

// Planar-cluster keys: normals quantised to 1e-4, plane offsets to 1e-3 mm.
const NORMAL_Q = 1e4;
const OFFSET_Q = 1e3;
/** A support plane may have vertices up to this far beyond it (mm). */
const SUPPORT_TOL_MM = 1e-3;
/** Only the largest clusters are tested for support (each test is O(V)). */
const MAX_CANDIDATES = 64;

interface PlaneCluster {
  n: [number, number, number];
  offset: number;
  area: number;
}

/**
 * Rotate `mesh` so the largest planar face it can rest on points down (-Z).
 * A candidate face qualifies only when it is a support plane: no vertex lies
 * beyond it along its outward normal (so a cup's inner floor never wins over
 * its base). Keeps the current orientation when the current bottom is
 * already as large as the best candidate. Returns the input unchanged when
 * the mesh has no planar support face (e.g. a sphere).
 */
export function orientLargestFlatFaceDown(mesh: MeshData): MeshData {
  const clusters = planarClusters(mesh);
  if (clusters.length === 0) return mesh;
  clusters.sort((a, b) => b.area - a.area);

  const v = mesh.vertices;
  let best: PlaneCluster | undefined;
  for (const c of clusters.slice(0, MAX_CANDIDATES)) {
    if (isSupportPlane(v, c)) {
      best = c;
      break;
    }
  }
  if (best === undefined) return mesh;

  const current = clusters.find(
    (c) => c.n[2] < -1 + 1e-6 && isSupportPlane(v, c),
  );
  if (current !== undefined && current.area >= best.area * (1 - 1e-9)) return mesh;

  const r = rotationTaking(best.n, [0, 0, -1]);
  const out = new Array<number>(v.length);
  for (let i = 0; i < v.length; i += 3) {
    const x = v[i], y = v[i + 1], z = v[i + 2];
    out[i] = r[0] * x + r[1] * y + r[2] * z;
    out[i + 1] = r[3] * x + r[4] * y + r[5] * z;
    out[i + 2] = r[6] * x + r[7] * y + r[8] * z;
  }
  return { vertices: out, triangles: mesh.triangles };
}

function planarClusters(mesh: MeshData): PlaneCluster[] {
  const v = mesh.vertices;
  const t = mesh.triangles;
  const byKey = new Map<string, PlaneCluster>();
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i] * 3, b = t[i + 1] * 3, c = t[i + 2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
    const wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    const cx = uy * wz - uz * wy;
    const cy = uz * wx - ux * wz;
    const cz = ux * wy - uy * wx;
    const len = Math.hypot(cx, cy, cz);
    if (len === 0) continue;
    const n: [number, number, number] = [cx / len, cy / len, cz / len];
    const offset = n[0] * v[a] + n[1] * v[a + 1] + n[2] * v[a + 2];
    const key = [
      Math.round(n[0] * NORMAL_Q), Math.round(n[1] * NORMAL_Q), Math.round(n[2] * NORMAL_Q),
      Math.round(offset * OFFSET_Q),
    ].join(',');
    const hit = byKey.get(key);
    if (hit) hit.area += len / 2;
    else byKey.set(key, { n, offset, area: len / 2 });
  }
  return [...byKey.values()];
}

function isSupportPlane(v: ArrayLike<number>, c: PlaneCluster): boolean {
  const limit = c.offset + SUPPORT_TOL_MM;
  for (let i = 0; i < v.length; i += 3) {
    if (c.n[0] * v[i] + c.n[1] * v[i + 1] + c.n[2] * v[i + 2] > limit) return false;
  }
  return true;
}

/** Row-major 3x3 rotation taking unit vector `from` onto unit vector `to`. */
function rotationTaking(
  from: [number, number, number],
  to: [number, number, number],
): number[] {
  const [fx, fy, fz] = from;
  const [tx, ty, tz] = to;
  const cos = fx * tx + fy * ty + fz * tz;
  if (cos > 1 - 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  if (cos < -1 + 1e-12) {
    // Opposite vectors: half-turn about any axis perpendicular to `from`.
    const ax = Math.abs(fx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let kx = fy * ax[2] - fz * ax[1];
    let ky = fz * ax[0] - fx * ax[2];
    let kz = fx * ax[1] - fy * ax[0];
    const kl = Math.hypot(kx, ky, kz);
    kx /= kl; ky /= kl; kz /= kl;
    return [
      2 * kx * kx - 1, 2 * kx * ky, 2 * kx * kz,
      2 * ky * kx, 2 * ky * ky - 1, 2 * ky * kz,
      2 * kz * kx, 2 * kz * ky, 2 * kz * kz - 1,
    ];
  }
  // Rodrigues: R = I + [k]x + [k]x^2 / (1 + cos), k = from x to.
  const kx = fy * tz - fz * ty;
  const ky = fz * tx - fx * tz;
  const kz = fx * ty - fy * tx;
  const f = 1 / (1 + cos);
  return [
    cos + kx * kx * f, kx * ky * f - kz, kx * kz * f + ky,
    ky * kx * f + kz, cos + ky * ky * f, ky * kz * f - kx,
    kz * kx * f - ky, kz * ky * f + kx, cos + kz * kz * f,
  ];
}

export interface Footprint {
  /** X extent (mm). */
  w: number;
  /** Y extent (mm). */
  d: number;
}

export interface PackResult {
  /** Footprint CENTRE per input index, in bed coordinates (mm). */
  centers: Array<[number, number]>;
  /** Whether every footprint lies within the bed rectangle. */
  fitsBed: boolean;
}

/**
 * Shelf-pack footprints on a `bedX` x `bedY` bed with at least `spacingMm`
 * between neighbours, then centre the whole layout on the bed. Rows fill
 * along +X up to the bed width; tallest (largest Y) footprints go first so
 * rows stay tight. Deterministic for a given input.
 */
export function packFootprints(
  items: readonly Footprint[],
  bedX: number,
  bedY: number,
  spacingMm: number,
): PackResult {
  const order = items.map((_, i) => i).sort((a, b) => items[b].d - items[a].d || a - b);
  const corner = new Array<[number, number]>(items.length);
  let rowX = 0;
  let rowY = 0;
  let rowDepth = 0;
  let layoutW = 0;
  for (const i of order) {
    const { w, d } = items[i];
    if (rowX > 0 && rowX + w > bedX) {
      rowY += rowDepth + spacingMm;
      rowX = 0;
      rowDepth = 0;
    }
    corner[i] = [rowX, rowY];
    rowX += w + spacingMm;
    rowDepth = Math.max(rowDepth, d);
    layoutW = Math.max(layoutW, rowX - spacingMm);
  }
  const layoutD = rowY + rowDepth;
  const ox = (bedX - layoutW) / 2;
  const oy = (bedY - layoutD) / 2;
  const centers = items.map((it, i): [number, number] => [
    ox + corner[i][0] + it.w / 2,
    oy + corner[i][1] + it.d / 2,
  ]);
  return { centers, fitsBed: layoutW <= bedX && layoutD <= bedY };
}
