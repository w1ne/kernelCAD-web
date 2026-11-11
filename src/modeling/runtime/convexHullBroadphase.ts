// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/convexHullBroadphase.ts
//
// Conservative separation proof for interference pairs. Each analysis body
// is covered by the convex hull of its face bounding-box corners (OCCT's
// tolerance-inclusive boxes, padded outward). The hull of the boundary
// contains the solid, including its interior: a small cube nested inside a
// larger cube has overlapping hulls and is not treated as separate. A
// union of face boxes would miss that case, because face boxes cover the
// skin, not the volume. If two hulls do not meet, the solids cannot share
// volume and the exact Common boolean is skipped. Any bound failure or
// inconclusive GJK falls through to the exact probe.

import { analysisBodyOf, OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { toleranceInclusiveBounds } from '../../kernel/backends/occt/backendBounds';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { Transform, type Vec3 } from '../../shared/runtime/se3';
import { collectSweepProxyCandidates, type SweepProxy } from './sweepCollisionProxy';

/** Same outward pad the sweep OBB proxies use. Never a shrink. */
const HULL_MARGIN_MM = 1e-3;

const hullPointsCache = new WeakMap<object, readonly Vec3[]>();

type V = [number, number, number];

export function hullsProveSeparated(
  aSource: object,
  aTransform: Transform,
  bSource: object,
  bTransform: Transform,
): boolean {
  try {
    if (!(aSource instanceof OcctBackend) || !(bSource instanceof OcctBackend)) return false;
    const aPts = hullCoverPoints(aSource);
    const bPts = hullCoverPoints(bSource);
    if (aPts === undefined || bPts === undefined) return false;
    const aInv = aTransform.inverse();
    const bInv = bTransform.inverse();
    return gjkSeparated(
      (dir) => supportTransformed(aPts, aTransform, aInv, dir),
      (dir) => supportTransformed(bPts, bTransform, bInv, dir),
    );
  } catch {
    return false;
  }
}

/** Local-frame points whose convex hull contains the solid. */
export function hullCoverPoints(body: OcctBackend): readonly Vec3[] | undefined {
  const cached = hullPointsCache.get(body);
  if (cached !== undefined) return cached;
  let faces: Array<{ boundingBox: { bounds: [number[], number[]] }; wrapped?: unknown }>;
  try {
    faces = body.getReplicadShape().faces as typeof faces;
  } catch {
    return undefined;
  }
  if (!Array.isArray(faces) || faces.length === 0) return undefined;
  const points: Vec3[] = [];
  for (const face of faces) {
    const bounds = boundsOfFace(face);
    if (bounds === undefined) return undefined;
    const expanded = expandOutward(bounds.min, bounds.max, HULL_MARGIN_MM);
    if (expanded === undefined) return undefined;
    pushBoxCorners(points, expanded.min, expanded.max);
  }
  if (points.length < 4) return undefined;
  hullPointsCache.set(body, points);
  return points;
}

/** OBB proxy candidates whose conservative hulls still might touch. */
export function proxyPairsNeedingExactConfirm(
  proxies: readonly SweepProxy[],
  scene: SceneBackend,
  ignored: ReadonlySet<string> = new Set<string>(),
): Array<readonly [number, number]> {
  const parts = scene.parts.filter((part) => part.shape instanceof OcctBackend);
  const kept: Array<readonly [number, number]> = [];
  for (const pair of collectSweepProxyCandidates(proxies, scene, ignored)) {
    const a = parts[pair.i];
    const b = parts[pair.j];
    if (a === undefined || b === undefined) {
      kept.push([pair.i, pair.j]);
      continue;
    }
    if (!hullsProveSeparated(
      analysisBodyOf(a.shape) as object,
      a.worldTransform,
      analysisBodyOf(b.shape) as object,
      b.worldTransform,
    )) {
      kept.push([pair.i, pair.j]);
    }
  }
  return kept;
}

function boundsOfFace(face: { boundingBox: { bounds: [number[], number[]] }; wrapped?: unknown }): { min: Vec3; max: Vec3 } | undefined {
  try {
    if (face.wrapped !== undefined) {
      const inclusive = toleranceInclusiveBounds(face.wrapped);
      if (inclusive !== undefined) return inclusive;
    }
    const [min, max] = face.boundingBox.bounds;
    return { min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]] };
  } catch {
    return undefined;
  }
}

function expandOutward(min: Vec3, max: Vec3, margin: number): { min: Vec3; max: Vec3 } | undefined {
  if (!(margin >= 0) || !Number.isFinite(margin)) return undefined;
  const expandedMin: Vec3 = [min[0] - margin, min[1] - margin, min[2] - margin];
  const expandedMax: Vec3 = [max[0] + margin, max[1] + margin, max[2] + margin];
  for (let axis = 0; axis < 3; axis++) {
    if (!(expandedMin[axis]! <= min[axis]!)) return undefined;
    if (!(expandedMax[axis]! >= max[axis]!)) return undefined;
    if (!Number.isFinite(expandedMin[axis]!) || !Number.isFinite(expandedMax[axis]!)) return undefined;
  }
  return { min: expandedMin, max: expandedMax };
}

function pushBoxCorners(out: Vec3[], min: Vec3, max: Vec3): void {
  for (const x of [min[0], max[0]]) {
    for (const y of [min[1], max[1]]) {
      for (const z of [min[2], max[2]]) out.push([x, y, z]);
    }
  }
}

function supportTransformed(
  points: readonly Vec3[],
  transform: Transform,
  inverse: Transform,
  worldDir: V,
): V {
  const localDir = inverse.axisDir(worldDir);
  let best = points[0]!;
  let bestDot = -Infinity;
  for (const point of points) {
    const value = point[0] * localDir[0] + point[1] * localDir[1] + point[2] * localDir[2];
    if (value > bestDot) {
      bestDot = value;
      best = point;
    }
  }
  return transform.point(best) as V;
}

function sub(a: V, b: V): V { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a: V, b: V): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: V, b: V): V {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function len2(a: V): number { return dot(a, a); }
function neg(a: V): V { return [-a[0], -a[1], -a[2]]; }

function gjkSeparated(
  supportA: (dir: V) => V,
  supportB: (dir: V) => V,
): boolean {
  const support = (dir: V): V => sub(supportA(dir), supportB(neg(dir)));
  let direction: V = [1, 0, 0];
  const simplex: V[] = [support(direction)];
  direction = neg(simplex[0]!);
  for (let iter = 0; iter < 32; iter++) {
    const next = support(direction);
    if (dot(next, direction) <= 0) return true;
    simplex.push(next);
    const evolved = evolveSimplex(simplex);
    if (evolved === 'intersecting') return false;
    direction = evolved;
    if (!Number.isFinite(direction[0]) || !Number.isFinite(direction[1]) || !Number.isFinite(direction[2])) {
      return false;
    }
    if (len2(direction) <= 1e-24) return false;
  }
  return false;
}

function evolveSimplex(simplex: V[]): V | 'intersecting' {
  if (simplex.length === 2) return lineCase(simplex);
  if (simplex.length === 3) return triangleCase(simplex);
  return tetrahedronCase(simplex);
}

function lineCase(simplex: V[]): V {
  const a = simplex[1]!;
  const b = simplex[0]!;
  const ab = sub(b, a);
  const ao = neg(a);
  if (dot(ab, ao) > 0) return cross(cross(ab, ao), ab);
  simplex.splice(0, simplex.length, a);
  return ao;
}

function triangleCase(simplex: V[]): V {
  const a = simplex[2]!;
  const b = simplex[1]!;
  const c = simplex[0]!;
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ao = neg(a);
  const abc = cross(ab, ac);
  if (dot(cross(abc, ab), ao) > 0) {
    simplex.splice(0, simplex.length, b, a);
    return lineCase(simplex);
  }
  if (dot(cross(ac, abc), ao) > 0) {
    simplex.splice(0, simplex.length, c, a);
    return lineCase(simplex);
  }
  if (dot(abc, ao) > 0) return abc;
  simplex.splice(0, simplex.length, b, c, a);
  return neg(abc);
}

function tetrahedronCase(simplex: V[]): V | 'intersecting' {
  const a = simplex[3]!;
  const b = simplex[2]!;
  const c = simplex[1]!;
  const d = simplex[0]!;
  const ao = neg(a);
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ad = sub(d, a);
  const abc = cross(ab, ac);
  const acd = cross(ac, ad);
  const adb = cross(ad, ab);
  if (dot(abc, ao) > 0) {
    simplex.splice(0, simplex.length, c, b, a);
    return triangleCase(simplex);
  }
  if (dot(acd, ao) > 0) {
    simplex.splice(0, simplex.length, d, c, a);
    return triangleCase(simplex);
  }
  if (dot(adb, ao) > 0) {
    simplex.splice(0, simplex.length, b, d, a);
    return triangleCase(simplex);
  }
  return 'intersecting';
}
