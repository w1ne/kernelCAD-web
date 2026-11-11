// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/sweepCollisionProxy.ts
//
// Conservative pose-sweep proxies. Each analysis body gets one local AABB
// from OCCT's exact-geometry bound (no triangulation, shape tolerances
// included) plus a small outward margin. Under the part's rigid
// worldTransform that box is an oriented box. Two proxies are a candidate
// when no separating axis exists, touching included. The proxy is only a
// SAT descriptor: nothing here builds or booleans a stand-in solid.
//
// A failed or non-finite bound does not mean the parts are apart. Every
// pair that touches an invalid proxy stays a candidate for the exact probe.

import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend, analysisBodyOf } from '../../kernel/backends/occt/occtBackend';
import { toleranceInclusiveBounds } from '../../kernel/backends/occt/backendBounds';
import { Transform, type Vec3 } from '../../shared/runtime/se3';

/** Outward pad added to every finite exact bound. Never a shrink. */
export const SWEEP_PROXY_MARGIN_MM = 1e-3;

/** Extra gap that still counts as touching, for axis-projection rounding. */
export const SWEEP_PROXY_TOUCH_SLOP_MM = 1e-4;

export interface SweepProxy {
  readonly name: string;
  /** Analysis body the exact boolean measures. Face count is this body's. */
  readonly source: object;
  /** Analysis-body faces charged when this part is exact-confirmed. */
  readonly faces: number;
  /** False when the enclosing box could not be built. Pairs stay candidates. */
  readonly valid: boolean;
  readonly localMin?: readonly [number, number, number];
  readonly localMax?: readonly [number, number, number];
}

export interface OrientedBox {
  readonly center: readonly [number, number, number];
  readonly axes: readonly [
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number],
  ];
  readonly half: readonly [number, number, number];
}

export interface SweepProxyCandidate {
  /** Indexes into the scene's BRep parts, in that list's order (`i < j`). */
  readonly i: number;
  readonly j: number;
  readonly a: string;
  readonly b: string;
  /** Same relative-pose key the exact-overlap memo uses. */
  readonly relativeKey: string;
  /** Analysis-body faces of the two operands. Not the six proxy faces. */
  readonly faces: number;
}

const LOCAL_AXES: readonly [Vec3, Vec3, Vec3] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** Where `t` sends the origin and the unit axes, rounded like the overlap memo. */
export function rigidTransformKey(t: Transform): string {
  const probe: readonly Vec3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return probe.map((p) => t.point(p).map((c) => Math.round(c * 1e9)).join(',')).join(';');
}

/** Key of `b` in `a`'s frame. Parts that keep this key share one exact probe. */
export function relativePoseKey(a: Transform, b: Transform): string {
  return rigidTransformKey(a.inverse().compose(b));
}

/** One proxy per BRep part, in scene order. Display meshes are omitted. */
export function buildSweepProxies(scene: SceneBackend): SweepProxy[] {
  const proxies: SweepProxy[] = [];
  for (const part of scene.parts) {
    if (!(part.shape instanceof OcctBackend)) continue;
    proxies.push(proxyForPart(part.name, analysisBodyOf(part.shape) as OcctBackend));
  }
  return proxies;
}

/**
 * Proxy candidates for one posed scene. `proxies` were built from the rest
 * scene; parts are matched by name. An unknown or invalid proxy makes every
 * pair that includes it a candidate. `ignored` holds `pairKey` strings and
 * is applied before the SAT, matching exact detection.
 */
export function collectSweepProxyCandidates(
  proxies: readonly SweepProxy[],
  scene: SceneBackend,
  ignored: ReadonlySet<string> = new Set<string>(),
): SweepProxyCandidate[] {
  const byName = new Map(proxies.map((proxy) => [proxy.name, proxy]));
  const posed = brepParts(scene).map((part) => ({
    name: part.name,
    transform: part.worldTransform,
    proxy: byName.get(part.name) ?? invalidProxy(part.name, part.shape),
  }));
  const candidates: SweepProxyCandidate[] = [];
  for (let i = 0; i < posed.length; i++) {
    for (let j = i + 1; j < posed.length; j++) {
      const a = posed[i]!;
      const b = posed[j]!;
      if (ignored.has(encodedPairKey(a.name, b.name))) continue;
      if (!sweepProxyPairOverlaps(a.proxy, a.transform, b.proxy, b.transform)) continue;
      candidates.push({
        i,
        j,
        a: a.name,
        b: b.name,
        relativeKey: relativePoseKey(a.transform, b.transform),
        faces: a.proxy.faces + b.proxy.faces,
      });
    }
  }
  return candidates;
}

/** Inclusive OBB test. An invalid proxy overlaps everything (fail closed). */
export function sweepProxyPairOverlaps(
  a: SweepProxy,
  aTransform: Transform,
  b: SweepProxy,
  bTransform: Transform,
): boolean {
  const aBox = poseSweepProxy(a, aTransform);
  const bBox = poseSweepProxy(b, bTransform);
  if (aBox === undefined || bBox === undefined) return true;
  return orientedBoxesCandidate(aBox, bBox);
}

/** Fifteen-axis SAT. Touching (`distance == radii + slop`) stays a candidate. */
export function orientedBoxesCandidate(a: OrientedBox, b: OrientedBox): boolean {
  const delta: [number, number, number] = [
    b.center[0] - a.center[0],
    b.center[1] - a.center[1],
    b.center[2] - a.center[2],
  ];
  for (let axis = 0; axis < 3; axis++) {
    if (axisSeparates(a, b, a.axes[axis]!, delta)) return false;
    if (axisSeparates(a, b, b.axes[axis]!, delta)) return false;
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (axisSeparates(a, b, cross(a.axes[i]!, b.axes[j]!), delta)) return false;
    }
  }
  return true;
}

export function poseSweepProxy(proxy: SweepProxy, transform: Transform): OrientedBox | undefined {
  if (!proxy.valid || proxy.localMin === undefined || proxy.localMax === undefined) return undefined;
  const centerLocal = midpoint(proxy.localMin, proxy.localMax);
  const halfLocal = halfExtents(proxy.localMin, proxy.localMax);
  const center = transform.point(centerLocal);
  if (!finiteTriple(center)) return undefined;
  const axes: [Vec3, Vec3, Vec3] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const half: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    const posed = unitAxis(transform.axisDir(LOCAL_AXES[axis]!));
    if (posed === undefined) return undefined;
    axes[axis] = posed.direction;
    // A rigid axis is unit length. Never shrink a half-extent that rounded
    // just under 1; a real scale above 1 still grows the box.
    const extent = halfLocal[axis]! * Math.max(posed.length, 1);
    if (!Number.isFinite(extent) || extent < 0) return undefined;
    half[axis] = extent;
  }
  return { center, axes, half };
}

function proxyForPart(name: string, body: OcctBackend): SweepProxy {
  const faces = analysisFaceCount(body);
  const bounds = boundsOf(body);
  if (faces === undefined || bounds === undefined) {
    return { name, source: body, faces: faces ?? Number.POSITIVE_INFINITY, valid: false };
  }
  const expanded = expandOutward(bounds.min, bounds.max, SWEEP_PROXY_MARGIN_MM);
  if (expanded === undefined) {
    return { name, source: body, faces, valid: false };
  }
  return { name, source: body, faces, valid: true, localMin: expanded.min, localMax: expanded.max };
}

function invalidProxy(name: string, shape: unknown): SweepProxy {
  const body = shape instanceof OcctBackend ? analysisBodyOf(shape) as OcctBackend : undefined;
  const faces = body === undefined ? Number.POSITIVE_INFINITY : analysisFaceCount(body);
  return {
    name,
    source: body ?? shape ?? name,
    faces: faces ?? Number.POSITIVE_INFINITY,
    valid: false,
  };
}

function analysisFaceCount(body: OcctBackend): number | undefined {
  try {
    const faces = body.getReplicadShape().faces.length;
    return Number.isFinite(faces) && faces >= 0 ? faces : undefined;
  } catch {
    return undefined;
  }
}

function boundsOf(body: OcctBackend): { min: Vec3; max: Vec3 } | undefined {
  try {
    const wrapped = (body.getReplicadShape() as { wrapped?: unknown }).wrapped;
    if (wrapped === undefined) return undefined;
    return toleranceInclusiveBounds(wrapped);
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
  }
  if (!finiteBox(expandedMin, expandedMax)) return undefined;
  return { min: expandedMin, max: expandedMax };
}

function brepParts(scene: SceneBackend): SceneBackend['parts'][number][] {
  return scene.parts.filter((part) => part.shape instanceof OcctBackend);
}

function encodedPairKey(a: string, b: string): string {
  return a < b ? `${a}\t${b}` : `${b}\t${a}`;
}

function axisSeparates(
  a: OrientedBox,
  b: OrientedBox,
  axis: readonly [number, number, number],
  delta: readonly [number, number, number],
): boolean {
  const unit = unitAxis(axis);
  if (unit === undefined) return false;
  const distance = Math.abs(dot(delta, unit.direction));
  const limit = projectedRadius(a, unit.direction) + projectedRadius(b, unit.direction) + SWEEP_PROXY_TOUCH_SLOP_MM;
  if (!Number.isFinite(distance) || !Number.isFinite(limit)) return false;
  return distance > limit;
}

function projectedRadius(box: OrientedBox, axis: readonly [number, number, number]): number {
  let radius = 0;
  for (let i = 0; i < 3; i++) radius += box.half[i]! * Math.abs(dot(box.axes[i]!, axis));
  return radius;
}

function unitAxis(
  axis: readonly [number, number, number],
): { direction: [number, number, number]; length: number } | undefined {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (!(length > 1e-12) || !Number.isFinite(length)) return undefined;
  const direction: [number, number, number] = [axis[0] / length, axis[1] / length, axis[2] / length];
  return finiteTriple(direction) ? { direction, length } : undefined;
}

function cross(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function midpoint(min: readonly [number, number, number], max: readonly [number, number, number]): Vec3 {
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

function halfExtents(min: readonly [number, number, number], max: readonly [number, number, number]): Vec3 {
  return [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2];
}

function finiteTriple(value: readonly [number, number, number]): boolean {
  return value.every((component) => Number.isFinite(component));
}

function finiteBox(min: readonly [number, number, number], max: readonly [number, number, number]): boolean {
  for (let axis = 0; axis < 3; axis++) {
    if (!Number.isFinite(min[axis]!) || !Number.isFinite(max[axis]!)) return false;
    if (min[axis]! > max[axis]!) return false;
  }
  return true;
}
