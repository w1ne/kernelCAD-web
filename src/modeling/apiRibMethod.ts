// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { KernelCadApi } from './api';
import { invalidArgs } from '../shared/intent/invalidArgs';

export type RibPoint = readonly [number, number];

export interface RibOptions {
  /** Full wall thickness, centred on each open centerline segment (mm). */
  thickness: number;
  /** Rib height along +Z (mm). */
  height: number;
  /** Bottom elevation along Z (mm, default 0). */
  startZ?: number;
}

const EPS = 1e-9;
const MAX_MITER_RATIO = 8;

function invalid(api: string, path: string, got: unknown, requires: string, example: string): never {
  invalidArgs({ api, path, got, showType: true, requires, unit: 'mm', hintSlug: 'invalid-args.rib', example });
}

function cross(a: RibPoint, b: RibPoint): number {
  return a[0] * b[1] - a[1] * b[0];
}

function subtract(a: RibPoint, b: RibPoint): [number, number] {
  return [a[0] - b[0], a[1] - b[1]];
}

function segmentsIntersect(a: RibPoint, b: RibPoint, c: RibPoint, d: RibPoint): boolean {
  const ab = subtract(b, a);
  const ac = subtract(c, a);
  const ad = subtract(d, a);
  const cd = subtract(d, c);
  const ca = subtract(a, c);
  const cb = subtract(b, c);
  const o1 = cross(ab, ac);
  const o2 = cross(ab, ad);
  const o3 = cross(cd, ca);
  const o4 = cross(cd, cb);
  const on = (p: RibPoint, q: RibPoint, r: RibPoint) =>
    Math.abs(cross(subtract(q, p), subtract(r, p))) <= EPS
    && r[0] >= Math.min(p[0], q[0]) - EPS && r[0] <= Math.max(p[0], q[0]) + EPS
    && r[1] >= Math.min(p[1], q[1]) - EPS && r[1] <= Math.max(p[1], q[1]) + EPS;
  return (o1 > EPS && o2 < -EPS || o1 < -EPS && o2 > EPS)
    && (o3 > EPS && o4 < -EPS || o3 < -EPS && o4 > EPS)
    || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
}

function validateCenterline(points: readonly RibPoint[]): [number, number][] {
  if (!Array.isArray(points) || points.length < 2) {
    invalid('rib(base, centerline, opts)', 'centerline', points, 'an open polyline with at least 2 finite [x, y] points',
      'rib(base, [[5, 15], [35, 15]], { thickness: 2, height: 20, startZ: 9.9 })');
  }
  if (!points.every((point) => Array.isArray(point) && point.length === 2
    && Number.isFinite(point[0]) && Number.isFinite(point[1]))) {
    invalid('rib(base, centerline, opts)', 'centerline', points, 'finite [x, y] coordinate pairs',
      'rib(base, [[5, 15], [35, 15]], { thickness: 2, height: 20 })');
  }
  const copy = points.map(([x, y]) => [x, y] as [number, number]);
  if (copy.some((point, i) => i > 0
    && Math.hypot(point[0] - copy[i - 1]![0], point[1] - copy[i - 1]![1]) <= EPS)) {
    invalid('rib(base, centerline, opts)', 'centerline', points, 'no duplicate consecutive points or zero-length segments',
      'rib(base, [[5, 15], [35, 15]], { thickness: 2, height: 20 })');
  }
  for (let i = 0; i < copy.length - 1; i++) {
    for (let j = i + 2; j < copy.length - 1; j++) {
      if (segmentsIntersect(copy[i]!, copy[i + 1]!, copy[j]!, copy[j + 1]!)) {
        invalid('rib(base, centerline, opts)', 'centerline', points, 'a non-self-intersecting open polyline',
          'rib(base, [[5, 15], [35, 15]], { thickness: 2, height: 20 })');
      }
    }
  }
  return copy;
}

function offsetSide(
  points: readonly [number, number][],
  directions: readonly [number, number][],
  halfThickness: number,
  sign: 1 | -1,
): [number, number][] {
  const normals = directions.map(([x, y]) => [-y, x] as [number, number]);
  const shifted = (point: RibPoint, normal: RibPoint): [number, number] => [
    point[0] + normal[0] * halfThickness * sign,
    point[1] + normal[1] * halfThickness * sign,
  ];
  const result: [number, number][] = [shifted(points[0]!, normals[0]!)];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = directions[i - 1]!;
    const next = directions[i]!;
    const nPrev = normals[i - 1]!;
    const nNext = normals[i]!;
    const det = cross(prev, next);
    const alignment = prev[0] * next[0] + prev[1] * next[1];
    if (Math.abs(det) <= EPS) {
      if (alignment < 0) {
        invalid('rib(base, centerline, opts)', 'centerline', points, 'no 180-degree reversals',
          'rib(base, [[5, 15], [20, 15], [35, 15]], { thickness: 2, height: 20 })');
      }
      result.push(shifted(points[i]!, nPrev));
      continue;
    }
    const a = shifted(points[i]!, nPrev);
    const b = shifted(points[i]!, nNext);
    const delta = subtract(b, a);
    const alongPrev = cross(delta, next) / det;
    const miter: [number, number] = [a[0] + alongPrev * prev[0], a[1] + alongPrev * prev[1]];
    if (Math.hypot(miter[0] - points[i]![0], miter[1] - points[i]![1]) > halfThickness * MAX_MITER_RATIO) {
      invalid('rib(base, centerline, opts)', 'centerline', points,
        'corners whose miter is at most 8 times half the rib thickness',
        'rib(base, [[5, 15], [20, 15], [20, 35]], { thickness: 2, height: 20 })');
    }
    result.push(miter);
  }

  result.push(shifted(points[points.length - 1]!, normals[normals.length - 1]!));
  return result;
}

function centerlineOutline(points: readonly [number, number][], thickness: number): [number, number][] {
  const directions: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const delta = subtract(points[i + 1]!, points[i]!);
    const length = Math.hypot(delta[0], delta[1]);
    directions.push([delta[0] / length, delta[1] / length]);
  }
  const half = thickness / 2;
  const left = offsetSide(points, directions, half, 1);
  const right = offsetSide(points, directions, half, -1).reverse();
  const outline = [...left, ...right];

  for (let i = 0; i < outline.length; i++) {
    for (let j = i + 1; j < outline.length; j++) {
      if (j === i || j === i + 1 || i === 0 && j === outline.length - 1) continue;
      if (segmentsIntersect(outline[i]!, outline[(i + 1) % outline.length]!, outline[j]!, outline[(j + 1) % outline.length]!)) {
        invalid('rib(base, centerline, opts)', 'centerline', points,
          'a polyline whose constant-thickness offset does not self-intersect',
          'rib(base, [[5, 15], [35, 15]], { thickness: 2, height: 20 })');
      }
    }
  }
  return outline;
}

/** Create an upright, constant-thickness prism from an open XY centerline and
 *  fuse it to the supplied base. The rib must overlap the base by a positive
 *  amount; a merely tangent or disconnected result is diagnosed by `union`. */
export function makeRibMethod(api: () => KernelCadApi): Pick<KernelCadApi, 'rib'> {
  return {
    rib(base, centerline, opts) {
      const points = validateCenterline(centerline);
      if (!opts || typeof opts !== 'object') {
        invalid('rib(base, centerline, opts)', 'opts', opts, 'an options object with thickness and height',
          'rib(base, [[5, 15], [35, 15]], { thickness: 2, height: 20 })');
      }
      if (!Number.isFinite(opts.thickness) || opts.thickness <= 0) {
        invalid('rib(base, centerline, opts)', 'thickness', opts.thickness, 'a finite positive rib thickness',
          'rib(base, [[5, 15], [35, 15]], { thickness: 2, height: 20 })');
      }
      if (!Number.isFinite(opts.height) || opts.height <= 0) {
        invalid('rib(base, centerline, opts)', 'height', opts.height, 'a finite positive rib height',
          'rib(base, [[5, 15], [35, 15]], { thickness: 2, height: 20 })');
      }
      const startZ = opts.startZ ?? 0;
      if (!Number.isFinite(startZ)) {
        invalid('rib(base, centerline, opts)', 'startZ', startZ, 'a finite Z elevation',
          'rib(base, [[5, 15], [35, 15]], { thickness: 2, height: 20, startZ: 9.9 })');
      }
      if (!base || typeof base.union !== 'function') {
        invalid('rib(base, centerline, opts)', 'base', base, 'a Shape returned by the KernelCAD geometry API',
          'rib(box(40, 30, 10), [[5, 15], [35, 15]], { thickness: 2, height: 20 })');
      }

      const profile = centerlineOutline(points, opts.thickness);
      const prism = api().extrudePolygon(profile, opts.height).translate(0, 0, startZ);
      return base.union(prism);
    },
  };
}
