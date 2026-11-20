// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Connector support regions for the connector-not-in-solid and
// revolute-unsupported rules. A connector is supported when its origin lies
// inside the bounding box, grown by the rule's tolerance, of its own part or
// of a part joined to it by fastened mates (transitively): a roll axis that
// sits on a servo screwed to the link is carried by the link. Every box is
// taken into the connector's part-local frame at the rest pose, so the
// suggested origin passes the same test it is checked by.
import type { Vec3 } from '../../shared/intent/types';
import { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef, type MateRecord } from './mate';

export type Bbox = { min: Vec3; max: Vec3 };

export interface SupportBox {
  /** Part whose box this is (the connector's part or a fastened neighbour). */
  readonly partName: string;
  /** The box in the connector's part-local frame. */
  readonly bbox: Bbox;
}

export type NearestSupport =
  | { readonly kind: 'point'; readonly origin: Vec3; readonly moveMm: number }
  | { readonly kind: 'axis-misses' };

/** Parts joined to `partName` by fastened mates, transitively (itself excluded). */
export function fastenedNeighbours(mates: readonly MateRecord[], partName: string): string[] {
  const adjacent = new Map<string, string[]>();
  for (const mate of mates) {
    if (mate.type !== 'fastened') continue;
    let a: string;
    let b: string;
    try {
      a = parseConnectorRef(mate.a).partName;
      b = parseConnectorRef(mate.b).partName;
    } catch {
      continue;
    }
    adjacent.set(a, [...(adjacent.get(a) ?? []), b]);
    adjacent.set(b, [...(adjacent.get(b) ?? []), a]);
  }
  const seen = new Set([partName]);
  const queue = [partName];
  while (queue.length > 0) {
    for (const next of adjacent.get(queue.shift()!) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  seen.delete(partName);
  return [...seen];
}

/** `local` bounds of `memberName` expressed in the frame of a part at `partPose`. */
export function boxInPartFrame(local: Bbox, partPose: Transform, memberPose: Transform): Bbox {
  return transformBbox(local, partPose.inverse().compose(memberPose));
}

export function distanceOutsideExpandedBbox(point: Vec3, bbox: Bbox, toleranceMm: number): number {
  let d2 = 0;
  for (let axis = 0; axis < 3; axis++) {
    const min = bbox.min[axis] - toleranceMm;
    const max = bbox.max[axis] + toleranceMm;
    const value = point[axis];
    if (value < min) d2 += (min - value) ** 2;
    else if (value > max) d2 += (value - max) ** 2;
  }
  return Math.sqrt(d2);
}

/**
 * The supported origin nearest to `origin`: along `axis` when the connector
 * has one (moving it along its own axis keeps the joint line), otherwise the
 * closest point of any grown box. `axis-misses` when the axis line passes
 * through no grown box.
 */
export function nearestSupportedOrigin(
  origin: Vec3,
  axis: Vec3 | undefined,
  boxes: readonly SupportBox[],
  toleranceMm: number,
): NearestSupport {
  let best: { origin: Vec3; moveMm: number } | undefined;
  for (const { bbox } of boxes) {
    const candidate = axis === undefined
      ? clampToBox(origin, bbox, toleranceMm)
      : nearestOnAxis(origin, axis, bbox, toleranceMm);
    if (candidate === undefined) continue;
    const moveMm = Math.hypot(candidate[0] - origin[0], candidate[1] - origin[1], candidate[2] - origin[2]);
    if (best === undefined || moveMm < best.moveMm) best = { origin: candidate, moveMm };
  }
  return best === undefined ? { kind: 'axis-misses' } : { kind: 'point', ...best };
}

function clampToBox(p: Vec3, bbox: Bbox, tol: number): Vec3 {
  return [0, 1, 2].map((i) => Math.min(Math.max(p[i], bbox.min[i] - tol), bbox.max[i] + tol)) as Vec3;
}

function nearestOnAxis(p: Vec3, axis: Vec3, bbox: Bbox, tol: number): Vec3 | undefined {
  const len = Math.hypot(axis[0], axis[1], axis[2]);
  if (len < 1e-12) return undefined;
  const d = axis.map((v) => v / len) as Vec3;
  let lo = Number.NEGATIVE_INFINITY;
  let hi = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 3; i++) {
    const min = bbox.min[i] - tol;
    const max = bbox.max[i] + tol;
    if (Math.abs(d[i]) < 1e-12) {
      if (p[i] < min || p[i] > max) return undefined;
      continue;
    }
    const t0 = (min - p[i]) / d[i];
    const t1 = (max - p[i]) / d[i];
    lo = Math.max(lo, Math.min(t0, t1));
    hi = Math.min(hi, Math.max(t0, t1));
  }
  if (lo > hi) return undefined;
  const t = Math.min(Math.max(0, lo), hi);
  return [p[0] + t * d[0], p[1] + t * d[1], p[2] + t * d[2]];
}

/** `[x, y, z]` with at most two decimals and no negative zero. */
export function formatPoint(p: Vec3): string {
  return `[${p.map((v) => String(Number(v.toFixed(2)) + 0)).join(', ')}]`;
}

export function transformBbox(bbox: Bbox, transform: Transform): Bbox {
  const corners: Vec3[] = [];
  for (const x of [bbox.min[0], bbox.max[0]]) {
    for (const y of [bbox.min[1], bbox.max[1]]) {
      for (const z of [bbox.min[2], bbox.max[2]]) corners.push(transform.point([x, y, z]) as Vec3);
    }
  }
  return {
    min: [0, 1, 2].map((i) => Math.min(...corners.map((c) => c[i]))) as Vec3,
    max: [0, 1, 2].map((i) => Math.max(...corners.map((c) => c[i]))) as Vec3,
  };
}

export const IDENTITY = Transform.identity();
