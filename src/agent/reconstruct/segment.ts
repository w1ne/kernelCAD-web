// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/segment.ts
//
// Segment a cleaned mesh into planar regions, cylindrical regions, and
// whatever fits neither (freeform).
//
// Planes grow by POINT-PLANE DISTANCE rather than by normal agreement, so
// they absorb the long sliver triangles CAD tessellators fan towards hole
// rims even when vertex noise tilts those slivers' normals. That same rule
// would let a planar region creep a few facets along a finely tessellated
// cylinder, so a region only survives when a real share of its boundary is a
// sharp crease (a genuine face is bounded by edges; a facet strip on a bore
// is bounded by its smooth neighbours) or when it is large outright.
//
// The distance tolerance adapts to the mesh: a first loose pass measures the
// RMS residual of the accepted planes (≈ 0 for an exported CAD mesh, ≈ the
// noise amplitude for a scan), and the final pass runs at the larger of the
// floor and 4× that noise.

import {
  cross3,
  dot3,
  fitCircle2D,
  normalize3,
  symmetricEigen3,
  type V3,
} from './geom';
import type { IndexedMesh } from './meshClean';

export interface PlaneRegion {
  kind: 'plane';
  id: number;
  tris: number[];
  /** Outward unit normal. */
  normal: V3;
  /** n · p for points p on the plane. */
  offset: number;
  area: number;
  centroid: V3;
  rms: number;
  sharpBoundaryFraction: number;
}

export interface CylinderRegion {
  kind: 'cylinder';
  id: number;
  tris: number[];
  /** Unit axis direction (sign arbitrary). */
  axis: V3;
  /** Point on the axis at parameter t = 0 (t = dot(p, axis)). */
  origin: V3;
  radius: number;
  tMin: number;
  tMax: number;
  /** Angular span actually covered by surface, radians (2π for a full bore). */
  coverageRad: number;
  /** Normals point towards the axis — a hole wall, not a boss. */
  concave: boolean;
  rms: number;
  area: number;
}

export interface FreeformRegion {
  kind: 'freeform';
  id: number;
  tris: number[];
  area: number;
  centroid: V3;
  bbox: { min: V3; max: V3 };
}

export interface Segmentation {
  planes: PlaneRegion[];
  cylinders: CylinderRegion[];
  freeform: FreeformRegion[];
  /** Plane/cylinder distance tolerance actually used (mm). */
  toleranceMm: number;
  /** Estimated surface noise: area-weighted RMS residual of the planes (mm). */
  noiseMm: number;
  totalArea: number;
  /** Plane id owning each triangle, −1 when none. */
  planeOf: Int32Array;
  /** Cylinder id owning each triangle, −1 when none. */
  cylinderOf: Int32Array;
}

export interface SegmentOptions {
  /** Floor for the point-plane / point-cylinder tolerance, mm. */
  toleranceFloorMm?: number;
}

const SHARP_COS = Math.cos((30 * Math.PI) / 180);
const COMPONENT_SPLIT_COS = Math.cos((50 * Math.PI) / 180);

export function segmentMesh(mesh: IndexedMesh, opts: SegmentOptions = {}): Segmentation {
  const diag = Math.hypot(
    mesh.bbox.max[0] - mesh.bbox.min[0],
    mesh.bbox.max[1] - mesh.bbox.min[1],
    mesh.bbox.max[2] - mesh.bbox.min[2],
  );
  const floor = opts.toleranceFloorMm ?? Math.max(0.02, 2.5e-4 * diag);
  const totalArea = mesh.areas.reduce((s, a) => s + a, 0);

  const loose = growPlanes(mesh, Math.max(floor * 2.5, 0.05), totalArea);
  let wSum = 0;
  let rSum = 0;
  // Only regions bounded almost entirely by creases are trusted as noise
  // probes: a loose tolerance can let a facet strip on a large-radius
  // cylinder pass as a small plane, and its sagitta is not noise.
  for (const p of loose.filter((q) => q.sharpBoundaryFraction >= 0.75)) {
    wSum += p.area;
    rSum += p.area * p.rms * p.rms;
  }
  const noise = wSum > 0 ? Math.sqrt(rSum / wSum) : 0;
  const tol = Math.max(floor, 4 * noise);
  const planes = growPlanes(mesh, tol, totalArea);

  const assigned = new Int8Array(mesh.areas.length);
  for (const p of planes) for (const t of p.tris) assigned[t] = 1;

  const { cylinders, freeform } = fitRemaining(mesh, assigned, tol, diag);
  absorbPlaneStrips(mesh, planes, cylinders, tol, totalArea);
  planes.forEach((p, i) => (p.id = i));
  cylinders.forEach((c, i) => (c.id = i));
  freeform.forEach((f, i) => (f.id = i));
  const planeOf = new Int32Array(mesh.areas.length).fill(-1);
  const cylinderOf = new Int32Array(mesh.areas.length).fill(-1);
  for (const p of planes) for (const t of p.tris) planeOf[t] = p.id;
  for (const c of cylinders) for (const t of c.tris) cylinderOf[t] = c.id;
  return { planes, cylinders, freeform, toleranceMm: tol, noiseMm: noise, totalArea, planeOf, cylinderOf };
}

/** A small plane whose every vertex lies on an adjacent fitted cylinder is a
 *  facet strip of that cylinder, not a face: fold it back in. */
function absorbPlaneStrips(
  mesh: IndexedMesh,
  planes: PlaneRegion[],
  cylinders: CylinderRegion[],
  tol: number,
  totalArea: number,
): void {
  if (cylinders.length === 0) return;
  const cylOf = new Int32Array(mesh.areas.length).fill(-1);
  cylinders.forEach((c, i) => c.tris.forEach((t) => (cylOf[t] = i)));
  for (let i = planes.length - 1; i >= 0; i--) {
    const p = planes[i];
    if (p.area >= 0.02 * totalArea) continue;
    const touching = new Set<number>();
    for (const t of p.tris) {
      for (let k = 0; k < 3; k++) {
        const nb = mesh.neighbors[t * 3 + k];
        if (nb >= 0 && cylOf[nb] >= 0) touching.add(cylOf[nb]);
      }
    }
    for (const ci of touching) {
      const c = cylinders[ci];
      let onSurface = true;
      for (const t of p.tris) {
        for (let k = 0; k < 3 && onSurface; k++) {
          const v = vertex(mesh, mesh.triangles[t * 3 + k]);
          const along = dot3([v[0] - c.origin[0], v[1] - c.origin[1], v[2] - c.origin[2]], c.axis);
          const rx = v[0] - c.origin[0] - c.axis[0] * along;
          const ry = v[1] - c.origin[1] - c.axis[1] * along;
          const rz = v[2] - c.origin[2] - c.axis[2] * along;
          if (Math.abs(Math.hypot(rx, ry, rz) - c.radius) > tol) onSurface = false;
        }
        if (!onSurface) break;
      }
      if (!onSurface) continue;
      const merged = fitCylinder(mesh, c.tris.concat(p.tris), Infinity, Infinity) ?? fitCylinder(mesh, c.tris.concat(p.tris), Infinity, Infinity, c.axis);
      if (!merged) continue;
      cylinders[ci] = merged;
      merged.tris.forEach((t) => (cylOf[t] = ci));
      planes.splice(i, 1);
      break;
    }
  }
}

function vertex(mesh: IndexedMesh, v: number): V3 {
  return [mesh.positions[v * 3], mesh.positions[v * 3 + 1], mesh.positions[v * 3 + 2]];
}

function triNormal(mesh: IndexedMesh, t: number): V3 {
  return [mesh.normals[t * 3], mesh.normals[t * 3 + 1], mesh.normals[t * 3 + 2]];
}

function edgeLength(mesh: IndexedMesh, t: number, k: number): number {
  const a = mesh.triangles[t * 3 + k] * 3;
  const b = mesh.triangles[t * 3 + ((k + 1) % 3)] * 3;
  const p = mesh.positions;
  return Math.hypot(p[a] - p[b], p[a + 1] - p[b + 1], p[a + 2] - p[b + 2]);
}

function growPlanes(mesh: IndexedMesh, tol: number, totalArea: number): PlaneRegion[] {
  const triCount = mesh.areas.length;
  const order = Array.from({ length: triCount }, (_, i) => i).sort((a, b) => mesh.areas[b] - mesh.areas[a]);
  const owner = new Int32Array(triCount).fill(-1);
  const tried = new Uint8Array(triCount);
  const planes: PlaneRegion[] = [];
  const minSeedArea = tol * tol;

  const withinPlane = (t: number, n: V3, d: number): boolean => {
    for (let k = 0; k < 3; k++) {
      const v = mesh.triangles[t * 3 + k] * 3;
      const dist = mesh.positions[v] * n[0] + mesh.positions[v + 1] * n[1] + mesh.positions[v + 2] * n[2] - d;
      if (Math.abs(dist) > tol) return false;
    }
    return true;
  };

  for (const seed of order) {
    if (owner[seed] >= 0 || tried[seed]) continue;
    tried[seed] = 1;
    if (mesh.areas[seed] < minSeedArea) break; // sorted: every later seed is smaller
    let n = triNormal(mesh, seed);
    let d = dot3(n, vertex(mesh, mesh.triangles[seed * 3]));
    let region: number[] = [];
    // Two growth rounds: grow from the seed plane, refit, regrow with the fit.
    for (let round = 0; round < 2; round++) {
      const inRegion = new Set<number>([seed]);
      const queue = [seed];
      region = [seed];
      while (queue.length > 0) {
        const t = queue.pop()!;
        for (let k = 0; k < 3; k++) {
          const nb = mesh.neighbors[t * 3 + k];
          if (nb < 0 || inRegion.has(nb) || owner[nb] >= 0) continue;
          const nbN = triNormal(mesh, nb);
          // Normal agreement is required only for triangles tall enough for
          // their normal to be trustworthy; slivers join on distance alone.
          const longest = Math.max(edgeLength(mesh, nb, 0), edgeLength(mesh, nb, 1), edgeLength(mesh, nb, 2));
          const altitude = longest > 0 ? (2 * mesh.areas[nb]) / longest : 0;
          if (altitude > 10 * tol && dot3(nbN, n) < Math.cos((20 * Math.PI) / 180)) continue;
          if (dot3(nbN, n) < 0) continue;
          if (!withinPlane(nb, n, d)) continue;
          inRegion.add(nb);
          region.push(nb);
          queue.push(nb);
        }
      }
      const fit = fitPlane(mesh, region);
      if (!fit) break;
      n = fit.normal;
      d = fit.offset;
    }
    const fit = fitPlane(mesh, region);
    if (!fit) continue;
    const area = region.reduce((s, t) => s + mesh.areas[t], 0);
    const regionSet = new Set(region);
    let boundary = 0;
    let sharp = 0;
    for (const t of region) {
      for (let k = 0; k < 3; k++) {
        const nb = mesh.neighbors[t * 3 + k];
        if (nb >= 0 && regionSet.has(nb)) continue;
        const len = edgeLength(mesh, t, k);
        boundary += len;
        if (nb < 0 || dot3(triNormal(mesh, t), triNormal(mesh, nb)) < SHARP_COS) sharp += len;
      }
    }
    const sharpBoundaryFraction = boundary > 0 ? sharp / boundary : 1;
    const big = area >= 0.02 * totalArea;
    if (!(big || (sharpBoundaryFraction >= 0.25 && area >= 25 * tol * tol))) continue;
    const id = planes.length;
    for (const t of region) owner[t] = id;
    planes.push({
      kind: 'plane',
      id,
      tris: region,
      normal: fit.normal,
      offset: fit.offset,
      area,
      centroid: fit.centroid,
      rms: fit.rms,
      sharpBoundaryFraction,
    });
  }
  return planes;
}

function fitPlane(mesh: IndexedMesh, tris: number[]): { normal: V3; offset: number; centroid: V3; rms: number } | null {
  let area = 0;
  const nSum: V3 = [0, 0, 0];
  const c: V3 = [0, 0, 0];
  for (const t of tris) {
    const a = mesh.areas[t];
    area += a;
    for (let k = 0; k < 3; k++) nSum[k] += mesh.normals[t * 3 + k] * a;
    for (let j = 0; j < 3; j++) {
      const v = mesh.triangles[t * 3 + j] * 3;
      for (let k = 0; k < 3; k++) c[k] += (mesh.positions[v + k] * a) / 3;
    }
  }
  if (area <= 0) return null;
  const normal = normalize3(nSum);
  if (normal[0] === 0 && normal[1] === 0 && normal[2] === 0) return null;
  const centroid: V3 = [c[0] / area, c[1] / area, c[2] / area];
  const offset = dot3(normal, centroid);
  let sq = 0;
  let cnt = 0;
  for (const t of tris) {
    for (let j = 0; j < 3; j++) {
      const v = mesh.triangles[t * 3 + j] * 3;
      const dist = mesh.positions[v] * normal[0] + mesh.positions[v + 1] * normal[1] + mesh.positions[v + 2] * normal[2] - offset;
      sq += dist * dist;
      cnt++;
    }
  }
  return { normal, offset, centroid, rms: Math.sqrt(sq / Math.max(1, cnt)) };
}

function fitRemaining(
  mesh: IndexedMesh,
  assigned: Int8Array,
  tol: number,
  diag: number,
): { cylinders: CylinderRegion[]; freeform: FreeformRegion[] } {
  const triCount = mesh.areas.length;
  const visited = new Uint8Array(triCount);
  const pieces: CylinderRegion[] = [];
  const freeform: FreeformRegion[] = [];
  for (let s = 0; s < triCount; s++) {
    if (assigned[s] || visited[s]) continue;
    const comp: number[] = [];
    const stack = [s];
    visited[s] = 1;
    while (stack.length > 0) {
      const t = stack.pop()!;
      comp.push(t);
      for (let k = 0; k < 3; k++) {
        const nb = mesh.neighbors[t * 3 + k];
        if (nb < 0 || assigned[nb] || visited[nb]) continue;
        if (dot3(triNormal(mesh, t), triNormal(mesh, nb)) < COMPONENT_SPLIT_COS) continue;
        visited[nb] = 1;
        stack.push(nb);
      }
    }
    const cyl = fitCylinder(mesh, comp, tol, diag);
    if (cyl) pieces.push(cyl);
    else freeform.push(freeformOf(mesh, comp));
  }
  return { cylinders: mergeCoaxial(mesh, pieces, tol), freeform };
}

function uniqueVertices(mesh: IndexedMesh, tris: number[]): number[] {
  const set = new Set<number>();
  for (const t of tris) for (let k = 0; k < 3; k++) set.add(mesh.triangles[t * 3 + k]);
  return [...set];
}

export function fitCylinder(
  mesh: IndexedMesh,
  tris: number[],
  tol: number,
  diag: number,
  forcedAxis?: V3,
): CylinderRegion | null {
  if (tris.length < 4) return null;
  const m = new Float64Array(9);
  let area = 0;
  for (const t of tris) {
    const a = mesh.areas[t];
    area += a;
    const n = triNormal(mesh, t);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 3 + j] += a * n[i] * n[j];
  }
  if (area <= 0) return null;
  const eig = symmetricEigen3(m);
  const candidates: V3[] = [];
  if (forcedAxis) candidates.push(forcedAxis);
  else if (eig.values[1] / Math.max(eig.values[2], 1e-300) >= 0.02) candidates.push(eig.vectors[0]);
  else {
    // Too little arc to pin the axis from normals alone: allow cardinal axes
    // the normals are genuinely perpendicular to.
    for (const ax of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as V3[]) {
      let s = 0;
      for (const t of tris) s += mesh.areas[t] * dot3(triNormal(mesh, t), ax) ** 2;
      if (s / area < 0.005) candidates.push(ax);
    }
  }
  const verts = uniqueVertices(mesh, tris);
  for (const axis of candidates) {
    const u = normalize3(Math.abs(axis[2]) < 0.9 ? cross3([0, 0, 1], axis) : cross3([1, 0, 0], axis));
    const w = cross3(axis, u);
    const xy = new Float64Array(verts.length * 2);
    let tMin = Infinity;
    let tMax = -Infinity;
    verts.forEach((v, i) => {
      const p = vertex(mesh, v);
      xy[i * 2] = dot3(p, u);
      xy[i * 2 + 1] = dot3(p, w);
      const t = dot3(p, axis);
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
    });
    const fit = fitCircle2D(xy);
    if (!fit || fit.r > diag * 2 || fit.rms > tol || fit.maxResidual > 3 * tol) continue;
    const angles = Array.from({ length: verts.length }, (_, i) => Math.atan2(xy[i * 2 + 1] - fit.cy, xy[i * 2] - fit.cx)).sort(
      (a, b) => a - b,
    );
    let maxGap = angles.length > 0 ? angles[0] + 2 * Math.PI - angles[angles.length - 1] : 2 * Math.PI;
    for (let i = 1; i < angles.length; i++) maxGap = Math.max(maxGap, angles[i] - angles[i - 1]);
    const origin: V3 = [
      u[0] * fit.cx + w[0] * fit.cy,
      u[1] * fit.cx + w[1] * fit.cy,
      u[2] * fit.cx + w[2] * fit.cy,
    ];
    let radialSign = 0;
    for (const t of tris) {
      const a = mesh.triangles[t * 3] * 3, b = mesh.triangles[t * 3 + 1] * 3, c = mesh.triangles[t * 3 + 2] * 3;
      const cen: V3 = [
        (mesh.positions[a] + mesh.positions[b] + mesh.positions[c]) / 3,
        (mesh.positions[a + 1] + mesh.positions[b + 1] + mesh.positions[c + 1]) / 3,
        (mesh.positions[a + 2] + mesh.positions[b + 2] + mesh.positions[c + 2]) / 3,
      ];
      const along = dot3(cen, axis);
      const radial: V3 = [cen[0] - origin[0] - axis[0] * along, cen[1] - origin[1] - axis[1] * along, cen[2] - origin[2] - axis[2] * along];
      radialSign += mesh.areas[t] * dot3(triNormal(mesh, t), radial);
    }
    return {
      kind: 'cylinder',
      id: 0,
      tris,
      axis,
      origin,
      radius: fit.r,
      tMin,
      tMax,
      coverageRad: 2 * Math.PI - maxGap,
      concave: radialSign < 0,
      rms: fit.rms,
      area,
    };
  }
  return null;
}

function freeformOf(mesh: IndexedMesh, tris: number[]): FreeformRegion {
  let area = 0;
  const c: V3 = [0, 0, 0];
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) {
    const a = mesh.areas[t];
    area += a;
    for (let j = 0; j < 3; j++) {
      const v = mesh.triangles[t * 3 + j] * 3;
      for (let k = 0; k < 3; k++) {
        const x = mesh.positions[v + k];
        c[k] += (x * a) / 3;
        if (x < min[k]) min[k] = x;
        if (x > max[k]) max[k] = x;
      }
    }
  }
  const centroid: V3 = area > 0 ? [c[0] / area, c[1] / area, c[2] / area] : [0, 0, 0];
  return { kind: 'freeform', id: 0, tris, area, centroid, bbox: { min, max } };
}

/** Merge cylinder pieces that share an axis line and radius — tessellators
 *  and vertex noise both split one bore into several smooth patches. */
function mergeCoaxial(mesh: IndexedMesh, pieces: CylinderRegion[], tol: number): CylinderRegion[] {
  const parent = pieces.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i], b = pieces[j];
      if (Math.abs(dot3(a.axis, b.axis)) < Math.cos((2 * Math.PI) / 180)) continue;
      if (Math.abs(a.radius - b.radius) > Math.max(2 * tol, 0.01 * a.radius)) continue;
      const along = dot3([b.origin[0] - a.origin[0], b.origin[1] - a.origin[1], b.origin[2] - a.origin[2]], a.axis);
      const off: V3 = [
        b.origin[0] - a.origin[0] - a.axis[0] * along,
        b.origin[1] - a.origin[1] - a.axis[1] * along,
        b.origin[2] - a.origin[2] - a.axis[2] * along,
      ];
      if (Math.hypot(off[0], off[1], off[2]) > Math.max(3 * tol, 0.02 * a.radius)) continue;
      const ra = find(i), rb = find(j);
      if (ra !== rb) parent[ra] = rb;
    }
  }
  const groups = new Map<number, CylinderRegion[]>();
  pieces.forEach((p, i) => {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(p);
    else groups.set(r, [p]);
  });
  const out: CylinderRegion[] = [];
  for (const g of groups.values()) {
    if (g.length === 1) {
      out.push(g[0]);
      continue;
    }
    const tris = g.flatMap((p) => p.tris);
    const merged = fitCylinderWithAxis(mesh, tris, g[0].axis);
    out.push(merged ?? g.reduce((best, p) => (p.area > best.area ? p : best)));
  }
  return out;
}

function fitCylinderWithAxis(mesh: IndexedMesh, tris: number[], axis: V3): CylinderRegion | null {
  // Re-derive axis/radius/extent/coverage on the union; fall back to the
  // pieces' shared axis when the union's normals still cannot pin one.
  return fitCylinder(mesh, tris, Infinity, Infinity) ?? fitCylinder(mesh, tris, Infinity, Infinity, axis);
}
