// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { ImportSegment } from './contourAssembly';

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
  const vx = -opts.normalZ * uy * opts.axisRatio;
  const vy = opts.normalZ * ux * opts.axisRatio;
  const point = (parameter: number): [number, number] => [
    cx + ux * Math.cos(parameter) + vx * Math.sin(parameter),
    cy + uy * Math.cos(parameter) + vy * Math.sin(parameter),
  ];
  const sweep = opts.endParameter - opts.startParameter;
  const out: ImportSegment[] = [];
  const segmentCount = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)));
  for (let i = 0; i < segmentCount; i++) {
    const start = opts.startParameter + sweep * i / segmentCount;
    const end = opts.startParameter + sweep * (i + 1) / segmentCount;
    const middle = (start + end) / 2;
    const weight = Math.cos((end - start) / 2);
    const startPoint = point(start);
    const endPoint = point(end);
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
