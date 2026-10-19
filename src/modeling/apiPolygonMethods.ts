// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// 2D polygon helpers for the script API. The mask-prism builders turn a
// side/front/plan polygon into a solid without the hand-written
// extrude→rotate→translate dance every reference example repeated.
//
// `filletPolygon` rounds an arbitrary closed polygon (convex or reflex)
// by tangent arcs, returning plain [x, y] points that feed straight into
// `extrudePolygon` or any prism helper. Radii are clamped per corner so a
// short edge never produces a self-intersecting arc.

import type { Shape } from './capture/proxy';
import type { KernelCadApi } from './api';
import { invalidArgs } from '../shared/intent/invalidArgs';

export type PolygonPoint = readonly [number, number];

export interface FilletPolygonOptions {
  /** Samples per rounded corner (default 8; minimum 2). */
  readonly segments?: number;
}

export interface PrismMethods {
  prismSide(points: readonly PolygonPoint[], halfY?: number): Shape;
  prismSideY(points: readonly PolygonPoint[], y0: number, y1: number): Shape;
  prismFront(points: readonly PolygonPoint[], x0: number, x1: number): Shape;
  prismPlan(points: readonly PolygonPoint[], z0: number, z1: number): Shape;
  filletPolygon(points: readonly PolygonPoint[], radius: number, opts?: FilletPolygonOptions): [number, number][];
}

const EPS = 1e-9;

function isFinitePoint(p: unknown): p is PolygonPoint {
  return (
    Array.isArray(p)
    && p.length === 2
    && typeof p[0] === 'number'
    && typeof p[1] === 'number'
    && Number.isFinite(p[0])
    && Number.isFinite(p[1])
  );
}

function assertPolygon(points: readonly PolygonPoint[], api: string): void {
  if (!Array.isArray(points) || points.length < 3) {
    invalidArgs({
      api,
      path: 'points',
      got: points,
      requires: 'a closed polygon with at least 3 [x, y] points',
      hintSlug: 'invalid-args.polygon.points',
      example: `${api}([[0, 0], [40, 0], [40, 20], [0, 20]], ...)`,
    });
  }
  if (!points.every(isFinitePoint)) {
    invalidArgs({
      api,
      path: 'points',
      got: points,
      requires: 'every point to be a finite [x, y] pair',
      hintSlug: 'invalid-args.polygon.points',
      example: `${api}([[0, 0], [40, 0], [40, 20], [0, 20]], ...)`,
    });
  }
}

function signedArea(points: readonly PolygonPoint[]): number {
  let area2 = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[(i + 1) % points.length]!;
    area2 += x1 * y2 - x2 * y1;
  }
  return area2 / 2;
}

function normalize(v: [number, number]): [number, number] | undefined {
  const len = Math.hypot(v[0], v[1]);
  if (len < EPS) return undefined;
  return [v[0] / len, v[1] / len];
}

function leftNormal(d: readonly [number, number]): [number, number] {
  return [-d[1], d[0]];
}

function angleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Round every corner of a closed 2D polygon with a tangent arc. Returns a new
 * point array; the input is untouched. Winding may be CW or CCW. Radius is
 * clamped per corner to half the shorter adjacent edge, so no corner can eat
 * its neighbour. Sharp/reflex corners are handled with the same construction.
 */
export function filletPolygon(
  points: readonly PolygonPoint[],
  radius: number,
  opts: FilletPolygonOptions = {},
): [number, number][] {
  assertPolygon(points, 'filletPolygon');
  if (!Number.isFinite(radius) || radius < 0) {
    invalidArgs({
      api: 'filletPolygon(points, radius, opts?)',
      path: 'radius',
      got: radius,
      showType: true,
      requires: 'a finite radius >= 0 (0 returns the polygon unchanged)',
      unit: 'mm',
      hintSlug: 'invalid-args.polygon.radius',
      example: 'filletPolygon(outline, 4, { segments: 8 })',
    });
  }
  const segments = Math.max(2, Math.floor(opts.segments ?? 8));
  if (radius === 0) return points.map(([x, y]) => [x, y] as [number, number]);

  const orientation = signedArea(points) >= 0 ? 1 : -1;
  const n = points.length;
  const out: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]!;
    const cur = points[i]!;
    const next = points[(i + 1) % n]!;
    const toPrev = normalize([prev[0] - cur[0], prev[1] - cur[1]]);
    const toNext = normalize([next[0] - cur[0], next[1] - cur[1]]);
    if (toPrev === undefined || toNext === undefined) {
      out.push([cur[0], cur[1]]);
      continue;
    }
    const cross = toPrev[0] * toNext[1] - toPrev[1] * toNext[0];
    // Interior angle between the two edge directions. A straight corner has
    // cos = 1; a hairpin has cos = -1.
    const cos = Math.max(-1, Math.min(1, toPrev[0] * toNext[0] + toPrev[1] * toNext[1]));
    const theta = Math.acos(cos);
    const tanHalf = Math.tan(theta / 2);
    if (!Number.isFinite(tanHalf) || tanHalf < EPS || Math.abs(cross) < EPS) {
      out.push([cur[0], cur[1]]);
      continue;
    }

    const lenPrev = Math.hypot(prev[0] - cur[0], prev[1] - cur[1]);
    const lenNext = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    const maxTangent = 0.5 * Math.min(lenPrev, lenNext);
    const tangent = Math.min(radius / tanHalf, maxTangent);
    const effectiveRadius = tangent * tanHalf;
    if (tangent < EPS || effectiveRadius < EPS) {
      out.push([cur[0], cur[1]]);
      continue;
    }

    // `cross` uses the two vectors pointing OUT of the corner, so a CCW
    // convex corner has a negative cross. Multiply by winding to normalize.
    const convex = cross * orientation < 0;
    // Inward normal of the incoming edge. For a CCW polygon the interior is
    // left of a convex edge and right of a reflex edge; CW flips both.
    const inwardSign = orientation * (convex ? 1 : -1);
    const nIn = leftNormal([-toPrev[0], -toPrev[1]]); // direction prev→cur
    const normal: [number, number] = [nIn[0] * inwardSign, nIn[1] * inwardSign];

    const tangentIn: [number, number] = [cur[0] + toPrev[0] * tangent, cur[1] + toPrev[1] * tangent];
    const tangentOut: [number, number] = [cur[0] + toNext[0] * tangent, cur[1] + toNext[1] * tangent];
    const center: [number, number] = [
      tangentIn[0] + normal[0] * effectiveRadius,
      tangentIn[1] + normal[1] * effectiveRadius,
    ];

    const a0 = Math.atan2(tangentIn[1] - center[1], tangentIn[0] - center[0]);
    const a1 = Math.atan2(tangentOut[1] - center[1], tangentOut[0] - center[0]);
    const delta = angleDelta(a0, a1);
    out.push(tangentIn);
    for (let s = 1; s < segments; s++) {
      const a = a0 + (delta * s) / segments;
      out.push([center[0] + effectiveRadius * Math.cos(a), center[1] + effectiveRadius * Math.sin(a)]);
    }
    out.push(tangentOut);
  }
  return out;
}

/** Build the mask-prism helpers against the fully constructed `kcad` API. */
export function makePolygonMethods(api: () => KernelCadApi): PrismMethods {
  const extrude = (points: readonly PolygonPoint[], depth: number): Shape => {
    assertPolygon(points, 'prism');
    if (!Number.isFinite(depth) || depth <= 0) {
      invalidArgs({
        api: 'prismSide/prismSideY/prismFront/prismPlan',
        path: 'depth',
        got: depth,
        showType: true,
        requires: 'a finite positive depth (the second bound must exceed the first)',
        unit: 'mm',
        hintSlug: 'invalid-args.prism.depth',
        example: 'prismSideY(outline, 0, 40)',
      });
    }
    return api().extrudePolygon(points.map(([x, y]) => [x, y] as [number, number]), depth);
  };

  return {
    /** Side-view polygon (s, z) extruded through Y from -halfY..+halfY. */
    prismSide(points, halfY = 1200) {
      if (!Number.isFinite(halfY) || halfY <= 0) {
        invalidArgs({
          api: 'prismSide(points, halfY?)',
          path: 'halfY',
          got: halfY,
          showType: true,
          requires: 'a finite positive half-width in mm',
          unit: 'mm',
          hintSlug: 'invalid-args.prism.depth',
          example: 'prismSide(sideOutline, 650)',
        });
      }
      return extrude(points, 2 * halfY).rotateX(90).translate(0, halfY, 0);
    },
    /** Side-view polygon on one side only: Y spans y0..y1 (y1 > y0). */
    prismSideY(points, y0, y1) {
      return extrude(points, y1 - y0).rotateX(90).translate(0, y1, 0);
    },
    /** Front-view polygon (y, z) extruded along X from x0..x1. */
    prismFront(points, x0, x1) {
      return extrude(points, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
    },
    /** Plan-view polygon (s, y) extruded along Z from z0..z1. */
    prismPlan(points, z0, z1) {
      return extrude(points, z1 - z0).translate(0, 0, z0);
    },
    filletPolygon,
  };
}
