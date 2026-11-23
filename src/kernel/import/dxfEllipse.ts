// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { ImportSegment } from './contourAssembly';

type Vec2 = readonly [number, number];

/** Exact rational-quadratic segments for a planar DXF ellipse arc. */
export function ellipseArcSegments(opts: {
  center: readonly [number, number];
  majorAxis: readonly [number, number];
  axisRatio: number;
  startParameter: number;
  endParameter: number;
  normalZ: 1 | -1;
  scale: number;
  source: string;
}): ImportSegment[] {
  const [cx, cy] = opts.center.map(value => value * opts.scale);
  const [ux, uy] = opts.majorAxis.map(value => value * opts.scale);
  return conicArcSegments({
    center: [cx, cy],
    u: [ux, uy],
    v: [-opts.normalZ * uy * opts.axisRatio, opts.normalZ * ux * opts.axisRatio],
    startParameter: opts.startParameter,
    endParameter: opts.endParameter,
    source: opts.source,
  });
}

/**
 * Exact rational-quadratic segments for the elliptical arc
 * `center + u cos(t) + v sin(t)`, t from `startParameter` to `endParameter`.
 *
 * `u` and `v` are conjugate semi-diameters and need not be perpendicular, so
 * the affine image of any ellipse is passed straight through: a rational
 * Bézier maps to the rational Bézier of its mapped poles with the same
 * weights. Each segment spans at most a quarter turn of `t`. `startPoint`
 * and `endPoint`, when given, replace the computed arc ends so the arc joins
 * its neighbours without a float gap.
 */
export function conicArcSegments(opts: {
  center: Vec2;
  u: Vec2;
  v: Vec2;
  startParameter: number;
  endParameter: number;
  startPoint?: Vec2;
  endPoint?: Vec2;
  source: string;
}): ImportSegment[] {
  const [cx, cy] = opts.center;
  const [ux, uy] = opts.u;
  const [vx, vy] = opts.v;
  const point = (parameter: number): [number, number] => [
    cx + ux * Math.cos(parameter) + vx * Math.sin(parameter),
    cy + uy * Math.cos(parameter) + vy * Math.sin(parameter),
  ];
  const sweep = opts.endParameter - opts.startParameter;
  const out: ImportSegment[] = [];
  const segmentCount = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
  for (let i = 0; i < segmentCount; i++) {
    const start = opts.startParameter + sweep * i / segmentCount;
    const end = opts.startParameter + sweep * (i + 1) / segmentCount;
    const middle = (start + end) / 2;
    const weight = Math.cos((end - start) / 2);
    const startPoint = i === 0 && opts.startPoint ? opts.startPoint : point(start);
    const endPoint = i === segmentCount - 1 && opts.endPoint ? opts.endPoint : point(end);
    const controlPoint: [number, number] = [
      cx + (ux * Math.cos(middle) + vx * Math.sin(middle)) / weight,
      cy + (uy * Math.cos(middle) + vy * Math.sin(middle)) / weight,
    ];
    out.push({
      x0: startPoint[0], y0: startPoint[1], x1: endPoint[0], y1: endPoint[1],
      source: opts.source,
      nurbs: {
        degree: 2,
        controlPoints: [startPoint, controlPoint, endPoint],
        knots: [0, 0, 0, 1, 1, 1],
        weights: [1, weight, 1],
      },
    });
  }
  return out;
}
