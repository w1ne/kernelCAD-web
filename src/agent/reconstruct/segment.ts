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
  /** 1.4826 × median absolute deviation of the vertex distances (mm). */
  robustSigma: number;
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

  const loose = growPlanes(mesh, Math.max(floor * 2.5, 0.05), totalArea, true);
  let wSum = 0;
  let rSum = 0;
  // Noise probes: regions bounded almost entirely by creases, measured by
  // their robust spread — a loose tolerance lets planes creep onto the first
  // facets of an adjacent round or large-radius cylinder, and that sagitta is
  // geometry, not noise.
  // A probe needs enough vertices for its spread to mean anything: a single
  // triangle is exactly planar whatever the noise.
  for (const p of loose.filter((q) => q.sharpBoundaryFraction >= 0.75 && q.tris.length >= 8)) {
    wSum += p.area;
    rSum += p.area * p.robustSigma * p.robustSigma;
  }
  const noise = wSum > 0 ? Math.sqrt(rSum / wSum) : 0;
  const tol = Math.max(floor, 4 * noise);
  const planes = growPlanes(mesh, tol, totalArea);

  // Small planes may be facet strips of a short or noisy bore (on a scan the
  // per-triangle normals are too noisy for the crease test to tell). Offer
  // them to the cylinder fit first: a smooth component that includes them and
  // fits a cylinder claims them; a genuine small face meets its neighbours at
  // a crease, never joins such a component, and stays a plane.
  const soft = new Set(planes.filter((p) => p.area < 0.02 * totalArea));
  const hardAssigned = new Int8Array(mesh.areas.length);
  for (const p of planes) if (!soft.has(p)) for (const t of p.tris) hardAssigned[t] = 1;
  const claimed = claimSoftStrips(mesh, hardAssigned, tol, diag);
  const consumed = new Set<number>();
  for (const c of claimed) for (const t of c.tris) consumed.add(t);
  for (let i = planes.length - 1; i >= 0; i--) {
    if (soft.has(planes[i]) && planes[i].tris.every((t) => consumed.has(t))) planes.splice(i, 1);
  }

  const assigned = new Int8Array(mesh.areas.length);
  for (const p of planes) for (const t of p.tris) assigned[t] = 1;
  for (const t of consumed) assigned[t] = 1;

  const fitted = fitRemaining(mesh, assigned, tol, diag);
  const { freeform } = fitted;
  const cylinders = adoptFragments(mesh, planes, mergeCoaxial(mesh, claimed.concat(fitted.cylinders), tol), freeform, tol, totalArea);
  planes.forEach((p, i) => (p.id = i));
  cylinders.forEach((c, i) => (c.id = i));
  freeform.forEach((f, i) => (f.id = i));
  const planeOf = new Int32Array(mesh.areas.length).fill(-1);
  const cylinderOf = new Int32Array(mesh.areas.length).fill(-1);
  for (const p of planes) for (const t of p.tris) planeOf[t] = p.id;
  for (const c of cylinders) for (const t of c.tris) cylinderOf[t] = c.id;
  return { planes, cylinders, freeform, toleranceMm: tol, noiseMm: noise, totalArea, planeOf, cylinderOf };
}

/**
 * Fold fragments back into the cylinder they belong to. Strips of a short bore
 * can pass as small planes, and a handful of facets between them can fit as a
 * spurious little cylinder or fail as freeform; each is adopted by a reliable
 * cylinder (>= 90° of coverage) when every one of its vertices lies on that
 * cylinder's surface within its axial extent. Coaxial pieces are merged again
 * afterwards.
 */
function adoptFragments(
  mesh: IndexedMesh,
  planes: PlaneRegion[],
  cylinders: CylinderRegion[],
  freeform: FreeformRegion[],
  tol: number,
  totalArea: number,
): CylinderRegion[] {
  const onSurface = (c: CylinderRegion, tris: number[]): boolean => {
    for (const t of tris) {
      for (let k = 0; k < 3; k++) {
        const v = vertex(mesh, mesh.triangles[t * 3 + k]);
        const along = dot3([v[0] - c.origin[0], v[1] - c.origin[1], v[2] - c.origin[2]], c.axis);
        const tAbs = dot3(v, c.axis);
        if (tAbs < c.tMin - tol || tAbs > c.tMax + tol) return false;
        const rx = v[0] - c.origin[0] - c.axis[0] * along;
        const ry = v[1] - c.origin[1] - c.axis[1] * along;
        const rz = v[2] - c.origin[2] - c.axis[2] * along;
        if (Math.abs(Math.hypot(rx, ry, rz) - c.radius) > tol) return false;
      }
    }
    return true;
  };
  let changed = true;
  let pool = cylinders;
  for (let round = 0; round < 3 && changed; round++) {
    changed = false;
    pool = [...pool].sort((a, b) => b.area - a.area);
    for (let ci = 0; ci < pool.length; ci++) {
      const c = pool[ci];
      if (c.coverageRad < Math.PI / 2) continue;
      let tris = c.tris;
      for (let i = planes.length - 1; i >= 0; i--) {
        const p = planes[i];
        if (p.area >= 0.02 * totalArea || !onSurface(c, p.tris)) continue;
        tris = tris.concat(p.tris);
        planes.splice(i, 1);
      }
      for (let i = freeform.length - 1; i >= 0; i--) {
        if (!onSurface(c, freeform[i].tris)) continue;
        tris = tris.concat(freeform[i].tris);
        freeform.splice(i, 1);
      }
      for (let j = pool.length - 1; j > ci; j--) {
        const other = pool[j];
        if (other.area >= c.area || !onSurface(c, other.tris)) continue;
        tris = tris.concat(other.tris);
        pool.splice(j, 1);
      }
      if (tris.length === c.tris.length) continue;
      const refit = fitCylinder(mesh, tris, Infinity, Infinity) ?? fitCylinder(mesh, tris, Infinity, Infinity, c.axis);
      if (refit) {
        pool[ci] = refit;
        changed = true;
      }
    }
    pool = mergeCoaxial(mesh, pool, tol);
  }
  return pool;
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

const altitudeCache = new WeakMap<IndexedMesh, Float64Array>();

/** Per-triangle altitude over its longest edge (how far a vertex can move
 *  before the normal is meaningless). Cached per mesh. */
function altitudes(mesh: IndexedMesh): Float64Array {
  let a = altitudeCache.get(mesh);
  if (a) return a;
  const n = mesh.areas.length;
  a = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    const longest = Math.max(edgeLength(mesh, t, 0), edgeLength(mesh, t, 1), edgeLength(mesh, t, 2));
    a[t] = longest > 0 ? (2 * mesh.areas[t]) / longest : 0;
  }
  altitudeCache.set(mesh, a);
  return a;
}

interface PlaneGrower {
  grow(seed: number, n: V3, d: number, within: number): number[];
  currentStamp(): number;
}

function makePlaneGrower(
  mesh: IndexedMesh,
  tol: number,
  owner: Int32Array,
  stampOf: Int32Array,
  alt: Float64Array,
): PlaneGrower {
  const cos20 = Math.cos((20 * Math.PI) / 180);
  let stamp = 0;

  const withinPlane = (t: number, n: V3, d: number, within: number): boolean => {
    for (let k = 0; k < 3; k++) {
      const v = mesh.triangles[t * 3 + k] * 3;
      const dist = mesh.positions[v] * n[0] + mesh.positions[v + 1] * n[1] + mesh.positions[v + 2] * n[2] - d;
      if (Math.abs(dist) > within) return false;
    }
    return true;
  };

  const grow = (seed: number, n: V3, d: number, within: number): number[] => {
    stamp++;
    stampOf[seed] = stamp;
    const queue = [seed];
    const region = [seed];
    while (queue.length > 0) {
      const t = queue.pop()!;
      for (let k = 0; k < 3; k++) {
        const nb = mesh.neighbors[t * 3 + k];
        if (nb < 0 || stampOf[nb] === stamp || owner[nb] >= 0) continue;
        const dn = mesh.normals[nb * 3] * n[0] + mesh.normals[nb * 3 + 1] * n[1] + mesh.normals[nb * 3 + 2] * n[2];
        // Normal agreement is required only for triangles tall enough for
        // their normal to be trustworthy; slivers join on distance alone.
        if (alt[nb] > 10 * tol && dn < cos20) continue;
        if (dn < 0) continue;
        if (!withinPlane(nb, n, d, within)) continue;
        stampOf[nb] = stamp;
        region.push(nb);
        queue.push(nb);
      }
    }
    return region;
  };

  return { grow, currentStamp: () => stamp };
}

function planeBoundaryFraction(mesh: IndexedMesh, region: number[], stamp: number, stampOf: Int32Array): number {
  let boundary = 0;
  let sharp = 0;
  for (const t of region) {
    for (let k = 0; k < 3; k++) {
      const nb = mesh.neighbors[t * 3 + k];
      if (nb >= 0 && stampOf[nb] === stamp) continue;
      const len = edgeLength(mesh, t, k);
      boundary += len;
      if (nb < 0 || dot3(triNormal(mesh, t), triNormal(mesh, nb)) < SHARP_COS) sharp += len;
    }
  }
  return boundary > 0 ? sharp / boundary : 1;
}

function growPlanes(mesh: IndexedMesh, tol: number, totalArea: number, robust = false): PlaneRegion[] {
  const triCount = mesh.areas.length;
  const order = Array.from({ length: triCount }, (_, i) => i).sort((a, b) => mesh.areas[b] - mesh.areas[a]);
  const owner = new Int32Array(triCount).fill(-1);
  const tried = new Uint8Array(triCount);
  const stampOf = new Int32Array(triCount);
  const alt = altitudes(mesh);
  const planes: PlaneRegion[] = [];
  const minSeedArea = tol * tol;
  const { grow, currentStamp } = makePlaneGrower(mesh, tol, owner, stampOf, alt);

  for (const seed of order) {
    if (owner[seed] >= 0 || tried[seed]) continue;
    tried[seed] = 1;
    if (mesh.areas[seed] < minSeedArea) break; // sorted: every later seed is smaller
    const n0 = triNormal(mesh, seed);
    const d0 = dot3(n0, vertex(mesh, mesh.triangles[seed * 3]));
    // Two growth rounds: grow loosely from the seed triangle's plane (on a
    // noisy mesh a single triangle's plane is itself off by the noise), refit,
    // then regrow from scratch at the real tolerance against the fitted plane.
    let region = grow(seed, n0, d0, 2 * tol);
    let area0 = 0;
    for (const t of region) area0 += mesh.areas[t];
    if (area0 < 25 * tol * tol && area0 < 0.02 * totalArea) {
      // Even the loose growth is too small to become a plane: skip the refit.
      for (const t of region) tried[t] = 1;
      continue;
    }
    if (region.length >= 3) {
      const first = fitPlane(mesh, region, false);
      region = first ? grow(seed, first.normal, first.offset, tol) : grow(seed, n0, d0, tol);
    } else {
      region = grow(seed, n0, d0, tol);
    }
    let area = 0;
    for (const t of region) area += mesh.areas[t];
    const big = area >= 0.02 * totalArea;
    const reject = () => {
      // Every triangle of a rejected region is a poor seed too (a facet strip
      // on a round); later seeds can still grow into them.
      for (const t of region) tried[t] = 1;
    };
    if (!big && area < 25 * tol * tol) {
      reject();
      continue;
    }
    const sharpBoundaryFraction = planeBoundaryFraction(mesh, region, currentStamp(), stampOf);
    if (!(big || sharpBoundaryFraction >= 0.25)) {
      reject();
      continue;
    }
    const fit = fitPlane(mesh, region, robust);
    if (!fit) {
      reject();
      continue;
    }
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
      robustSigma: fit.robustSigma,
      sharpBoundaryFraction,
    });
  }
  return planes;
}

function fitPlane(
  mesh: IndexedMesh,
  tris: number[],
  robust = true,
): { normal: V3; offset: number; centroid: V3; rms: number; robustSigma: number } | null {
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
  let normal = normalize3(nSum);
  if (normal[0] === 0 && normal[1] === 0 && normal[2] === 0) return null;
  // Refit without triangles tilted more than 3° from the first estimate: a
  // region that crept onto the first facets of a neighbouring round would
  // otherwise tilt its plane towards it.
  const cos3 = Math.cos((3 * Math.PI) / 180);
  let area2 = 0;
  const n2: V3 = [0, 0, 0];
  const c2: V3 = [0, 0, 0];
  for (const t of tris) {
    const tn = triNormal(mesh, t);
    if (dot3(tn, normal) < cos3) continue;
    const a = mesh.areas[t];
    area2 += a;
    for (let k = 0; k < 3; k++) n2[k] += tn[k] * a;
    for (let j = 0; j < 3; j++) {
      const v = mesh.triangles[t * 3 + j] * 3;
      for (let k = 0; k < 3; k++) c2[k] += (mesh.positions[v + k] * a) / 3;
    }
  }
  if (area2 >= 0.5 * area) {
    normal = normalize3(n2);
    c[0] = c2[0]; c[1] = c2[1]; c[2] = c2[2];
    area = area2;
  }
  const centroid: V3 = [c[0] / area, c[1] / area, c[2] / area];
  const offset = dot3(normal, centroid);
  if (!robust) {
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
    return { normal, offset, centroid, rms: Math.sqrt(sq / Math.max(1, cnt)), robustSigma: 0 };
  }
  let sq = 0;
  const dists: number[] = [];
  const seen = new Set<number>();
  for (const t of tris) {
    for (let j = 0; j < 3; j++) {
      const vi = mesh.triangles[t * 3 + j];
      if (seen.has(vi)) continue;
      seen.add(vi);
      const v = vi * 3;
      const dist = mesh.positions[v] * normal[0] + mesh.positions[v + 1] * normal[1] + mesh.positions[v + 2] * normal[2] - offset;
      sq += dist * dist;
      dists.push(dist);
    }
  }
  // Median absolute deviation: a plane that crept onto a few facets of a
  // neighbouring round keeps a near-zero robust spread, a noisy scan does not.
  dists.sort((a, b) => a - b);
  const med = dists[dists.length >> 1] ?? 0;
  const abs = dists.map((d) => Math.abs(d - med)).sort((a, b) => a - b);
  const robustSigma = 1.4826 * (abs[abs.length >> 1] ?? 0);
  return { normal, offset, centroid, rms: Math.sqrt(sq / Math.max(1, dists.length)), robustSigma };
}

/** Cylinders fitted to smooth components that span soft (strip-like) planes;
 *  only fits covering at least 60° are kept, so a plane tangent to a round is
 *  never swallowed. */
function claimSoftStrips(mesh: IndexedMesh, hardAssigned: Int8Array, tol: number, diag: number): CylinderRegion[] {
  const triCount = mesh.areas.length;
  const visited = new Uint8Array(triCount);
  const out: CylinderRegion[] = [];
  for (let s = 0; s < triCount; s++) {
    if (hardAssigned[s] || visited[s]) continue;
    const comp: number[] = [];
    const stack = [s];
    visited[s] = 1;
    while (stack.length > 0) {
      const t = stack.pop()!;
      comp.push(t);
      for (let k = 0; k < 3; k++) {
        const nb = mesh.neighbors[t * 3 + k];
        if (nb < 0 || hardAssigned[nb] || visited[nb]) continue;
        if (dot3(triNormal(mesh, t), triNormal(mesh, nb)) < COMPONENT_SPLIT_COS) continue;
        visited[nb] = 1;
        stack.push(nb);
      }
    }
    const cyl = fitCylinder(mesh, comp, tol, diag);
    if (cyl && cyl.coverageRad >= Math.PI / 3) out.push(cyl);
  }
  return out;
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
