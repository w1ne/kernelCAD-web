// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/meshPairCheck.ts
//
// Deterministic triangle-BVH collision and minimum-distance engine for part
// pairs where at least one side is a display mesh (lib.meshFromGLB /
// lib.meshFromSTL). BRep-vs-BRep pairs keep their exact OCCT path; this module
// covers imported KiCad / LabWired hardware bodies so they are first-class
// animatable and mechanism-testable rigid bodies.

import { OcctBackend, analysisBodyOf } from '../../kernel/backends/occt/occtBackend';
import { isMeshBackend } from '../../kernel/backends/meshBackend';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { Transform } from '../../shared/runtime/se3';
import { TriangleBvh } from './dfm/meshBvh';
import { meshOverlapVolume } from './meshVolumeOverlap';

/** One display mesh posed into world coordinates with its own BVH. */
export interface PosedWorldMesh {
  readonly positions: Float64Array;
  readonly indices: Uint32Array;
  readonly min: [number, number, number];
  readonly max: [number, number, number];
  readonly bvh: TriangleBvh;
}

interface LocalMesh {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
}

const localMeshCache = new WeakMap<object, LocalMesh | null>();

/** Local unchanged mesh of a BRep analysis body or display mesh, cached per
 *  shape object so repeated pose sweeps do not re-tessellate BRep parts. */
function localMeshOf(shape: ShapeBackend): LocalMesh | undefined {
  const cached = localMeshCache.get(shape);
  if (cached !== undefined) return cached ?? undefined;
  let mesh: { positions: Float32Array; indices: Uint32Array };
  try {
    if (isMeshBackend(shape)) mesh = shape.getMesh();
    else if (shape instanceof OcctBackend) mesh = (analysisBodyOf(shape) as OcctBackend).getMesh();
    else return undefined;
  } catch {
    localMeshCache.set(shape, null);
    return undefined;
  }
  if (mesh.positions.length === 0 || mesh.indices.length === 0) {
    localMeshCache.set(shape, null);
    return undefined;
  }
  const entry: LocalMesh = { positions: mesh.positions, indices: mesh.indices };
  localMeshCache.set(shape, entry);
  return entry;
}

/** Pose one part's triangles into world space and build its BVH. */
export function extractPosedWorldMesh(
  shape: ShapeBackend,
  worldTransform: Transform,
): PosedWorldMesh | undefined {
  const local = localMeshCache.get(shape) ?? localMeshOf(shape);
  if (local === undefined) return undefined;
  const n = local.positions.length / 3;
  const positions = new Float64Array(n * 3);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    const p = worldTransform.point([
      local.positions[3 * i], local.positions[3 * i + 1], local.positions[3 * i + 2],
    ]);
    for (let k = 0; k < 3; k++) {
      positions[3 * i + k] = p[k];
      if (p[k] < min[k]) min[k] = p[k];
      if (p[k] > max[k]) max[k] = p[k];
    }
  }
  const bvh = new TriangleBvh({ vertices: positions, triangles: local.indices });
  if (bvh.triangleCount === 0) return undefined;
  return { positions, indices: local.indices, min, max, bvh };
}

/** Local TRIANGLE count of a display mesh, 0 for a BRep or an empty mesh. */
export function displayMeshTriangleCount(shape: ShapeBackend): number {
  if (!isMeshBackend(shape)) return 0;
  const indices = localMeshOf(shape)?.indices.length ?? 0;
  return indices / 3;
}

/** Total imported-mesh triangles this pass will probe exactly. A triangle BVH
 *  plus voxel integral per pair costs O(triangles), and a 26-link robot
 *  rebuilt from 30k-triangle STLs took ~95 s for one interference pass. The
 *  cost is therefore bounded UP FRONT and the whole mesh sweep is declined
 *  (each pair reported unchecked with its own reason, `partial: true`) rather
 *  than measured for an arbitrary prefix. Typical hardware stays far inside
 *  the budget: a KiCad PCB / sensor / relay / display GLB is 2-10k triangles. */
export const MESH_PAIR_TRIANGLE_BUDGET = 250_000;

/** True when the imported meshes in this pass are small enough to measure. */
export function meshPairWorkWithinBudget(shapes: Iterable<ShapeBackend>): boolean {
  let total = 0;
  for (const shape of shapes) {
    total += displayMeshTriangleCount(shape);
    if (total > MESH_PAIR_TRIANGLE_BUDGET) return false;
  }
  return true;
}

/** Exact Euclidean gap between two AABBs; 0 when they overlap or touch. */
export function bboxesGapMm(
  a: { min: readonly [number, number, number]; max: readonly [number, number, number] },
  b: { min: readonly [number, number, number]; max: readonly [number, number, number] },
): number {
  let sq = 0;
  for (let axis = 0; axis < 3; axis++) {
    const gap = Math.max(0, b.min[axis] - a.max[axis], a.min[axis] - b.max[axis]);
    sq += gap * gap;
  }
  return Math.sqrt(sq);
}

type Tri = [number, number, number];

function sub(a: Tri, b: Tri): Tri { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a: Tri, b: Tri): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: Tri, b: Tri): Tri {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function triangleVertices(positions: Float64Array, indices: Uint32Array, t: number): [Tri, Tri, Tri] {
  const i0 = indices[3 * t] * 3, i1 = indices[3 * t + 1] * 3, i2 = indices[3 * t + 2] * 3;
  return [
    [positions[i0], positions[i0 + 1], positions[i0 + 2]],
    [positions[i1], positions[i1 + 1], positions[i1 + 2]],
    [positions[i2], positions[i2 + 1], positions[i2 + 2]],
  ];
}

/** Strict-interior segment/triangle crossing; coincident faces and shared
 *  edges do not count. */
function segmentCrossesTriangle(p: Tri, q: Tri, a: Tri, b: Tri, c: Tri): boolean {
  const dir = sub(q, p);
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const h = cross(dir, e2);
  const det = dot(e1, h);
  if (Math.abs(det) <= 1e-12) return false;
  const inv = 1 / det;
  const s = sub(p, a);
  const u = dot(s, h) * inv;
  if (u <= 1e-6 || u >= 1 - 1e-6) return false;
  const r = cross(s, e1);
  const v = dot(dir, r) * inv;
  if (v <= 1e-6 || u + v >= 1 - 1e-6) return false;
  const t = dot(e2, r) * inv;
  return t > 1e-6 && t < 1 - 1e-6;
}

function trianglesCross(a: readonly Tri[], b: readonly Tri[]): boolean {
  for (let i = 0; i < 3; i++) {
    if (segmentCrossesTriangle(a[i], a[(i + 1) % 3], b[0], b[1], b[2])) return true;
    if (segmentCrossesTriangle(b[i], b[(i + 1) % 3], a[0], a[1], a[2])) return true;
  }
  return false;
}

/** How far one triangle crosses the other's plane (0 when it does not). */
function planePenetrationMm(tri: readonly Tri[], plane: readonly Tri[]): number {
  const normal = cross(sub(plane[1], plane[0]), sub(plane[2], plane[0]));
  const length = Math.hypot(normal[0], normal[1], normal[2]);
  if (length <= 1e-12) return 0;
  const unit: Tri = [normal[0] / length, normal[1] / length, normal[2] / length];
  const distances = tri.map((p) => dot(sub(p, plane[0]), unit));
  const positive = Math.max(0, ...distances);
  const negative = Math.max(0, ...distances.map((d) => -d));
  return Math.min(positive, negative);
}

/** True only for genuine triangle overlap, not a coincident/edge touch. */
export function trianglePairIntersects(
  positionsA: Float64Array, indicesA: Uint32Array, ta: number,
  positionsB: Float64Array, indicesB: Uint32Array, tb: number,
): boolean {
  return trianglePairPenetrationMm(positionsA, indicesA, ta, positionsB, indicesB, tb) > 1e-6;
}

function trianglePairPenetrationMm(
  positionsA: Float64Array, indicesA: Uint32Array, ta: number,
  positionsB: Float64Array, indicesB: Uint32Array, tb: number,
): number {
  const a = triangleVertices(positionsA, indicesA, ta);
  const b = triangleVertices(positionsB, indicesB, tb);
  if (!trianglesCross(a, b)) return 0;
  return Math.min(planePenetrationMm(a, b), planePenetrationMm(b, a));
}

export interface MeshOverlapResult {
  readonly intersecting: boolean;
  readonly volumeMm3: number;
  readonly thicknessMm: number;
  readonly overlapBounds?: { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] };
}

const NO_OVERLAP: MeshOverlapResult = { intersecting: false, volumeMm3: 0, thicknessMm: 0 };
/** Contact floor for TESSELATED pairs. Imported meshes carry no analytic
 *  surface, so coincident or sub-tessellation-offset faces read as thin
 *  overlaps; 0.3 mm is the same mesh noise floor `restPoseContact` uses
 *  (REST_PENETRATION_DEPTH_MM) and well above the analysis-mesh deflection.
 *  Anything thinner is surface contact, not a collision. */
const CONTACT_THICKNESS_MM = 0.3;
const TOUCH_DISTANCE_MM = 1e-4;
const noWork = (): void => {};

function overlapBounds(
  a: PosedWorldMesh,
  b: PosedWorldMesh,
): { min: [number, number, number]; max: [number, number, number] } {
  return {
    min: [Math.max(a.min[0], b.min[0]), Math.max(a.min[1], b.min[1]), Math.max(a.min[2], b.min[2])],
    max: [Math.min(a.max[0], b.max[0]), Math.min(a.max[1], b.max[1]), Math.min(a.max[2], b.max[2])],
  };
}

function nearbyTriangles(mesh: PosedWorldMesh, bounds: { min: [number, number, number]; max: [number, number, number] }): number[] {
  const out: number[] = [];
  for (const tri of mesh.bvh.overlappingTriangles(bounds, noWork)) out.push(tri);
  return out;
}

/** Deepest genuine triangle-triangle penetration inside the overlap AABB. */
function deepestTrianglePenetrationMm(
  a: PosedWorldMesh,
  b: PosedWorldMesh,
  bounds: { min: [number, number, number]; max: [number, number, number] },
): number {
  const candidatesA = nearbyTriangles(a, bounds);
  const candidatesB = nearbyTriangles(b, bounds);
  let deepest = 0;
  for (const ta of candidatesA) {
    for (const tb of candidatesB) {
      const depth = trianglePairPenetrationMm(a.positions, a.indices, ta, b.positions, b.indices, tb);
      if (depth > deepest) deepest = depth;
      if (deepest > CONTACT_THICKNESS_MM) return deepest;
    }
  }
  return deepest;
}

/**
 * Overlap of two posed meshes. Closed meshes use the voxel integral; when an
 * open-seam GLB reads zero volume, a BVH triangle probe still reports a real
 * interpenetration. Coincident faces stay contact, never interference.
 *
 * `volumeMm3` on the open-seam path is a CONSERVATIVE LOWER BOUND derived from
 * the measured penetration depth (depth³), not a boolean common volume: the
 * mesh is not watertight, so no exact common solid exists. `thicknessMm` is
 * the real measured depth and is what `isActionableOverlap` classifies on.
 */
export function measureMeshPairOverlap(
  a: PosedWorldMesh,
  b: PosedWorldMesh,
  epsilonMm3 = 0.01,
): MeshOverlapResult {
  if (bboxesGapMm(a, b) > 0) return NO_OVERLAP;
  const voxel = meshOverlapVolume({ closed: true, ...a }, { closed: true, ...b });
  if (voxel.volumeMm3 > epsilonMm3 && voxel.thicknessMm > CONTACT_THICKNESS_MM) {
    return {
      intersecting: true,
      volumeMm3: voxel.volumeMm3,
      thicknessMm: voxel.thicknessMm,
      overlapBounds: overlapBounds(a, b),
    };
  }
  const closest = a.bvh.closestPoints(b.bvh);
  if (closest === null || closest.distance > TOUCH_DISTANCE_MM) return NO_OVERLAP;
  const bounds = overlapBounds(a, b);
  const depth = deepestTrianglePenetrationMm(a, b, bounds);
  if (depth <= CONTACT_THICKNESS_MM) return NO_OVERLAP;
  return {
    intersecting: true,
    volumeMm3: Math.max(epsilonMm3 * 2, depth ** 3),
    thicknessMm: depth,
    overlapBounds: bounds,
  };
}

export interface MeshDistanceResult {
  readonly distanceMm: number;
  readonly overlapping: boolean;
  readonly overlapVolumeMm3?: number;
  readonly overlapThicknessMm?: number;
}

function overlapDistanceResult(overlap: MeshOverlapResult): MeshDistanceResult {
  return {
    distanceMm: 0,
    overlapping: true,
    overlapVolumeMm3: overlap.volumeMm3,
    overlapThicknessMm: overlap.thicknessMm,
  };
}

function aabbsTouch(a: PosedWorldMesh, b: PosedWorldMesh): boolean {
  return bboxesGapMm(a, b) <= 0;
}

/**
 * Minimum surface distance between two posed meshes, with real overlap
 * disambiguated from surface contact by the overlap engine.
 */
export function measureMeshPairDistance(
  a: PosedWorldMesh,
  b: PosedWorldMesh,
  minClearanceMm: number,
  options?: { forceExact?: boolean; distanceOnly?: boolean },
): MeshDistanceResult {
  const gap = bboxesGapMm(a, b);
  if (!options?.forceExact && gap >= minClearanceMm) return { distanceMm: gap, overlapping: false };
  const closest = a.bvh.closestPoints(b.bvh);
  if (closest === null) return { distanceMm: Number.NaN, overlapping: false };
  if (closest.distance > 1e-5) {
    if (options?.distanceOnly) return { distanceMm: closest.distance, overlapping: false };
    if (!aabbsTouch(a, b)) return { distanceMm: closest.distance, overlapping: false };
    const nested = b.bvh.pointInside(closest.pointA) || a.bvh.pointInside(closest.pointB);
    if (!nested) return { distanceMm: closest.distance, overlapping: false };
    const overlap = measureMeshPairOverlap(a, b);
    return overlap.intersecting ? overlapDistanceResult(overlap) : { distanceMm: closest.distance, overlapping: false };
  }
  if (options?.distanceOnly) return { distanceMm: closest.distance, overlapping: false };
  const overlap = measureMeshPairOverlap(a, b);
  return overlap.intersecting ? overlapDistanceResult(overlap) : { distanceMm: 0, overlapping: false };
}
