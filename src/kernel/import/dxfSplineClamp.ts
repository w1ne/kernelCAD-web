// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/dxfSplineClamp.ts
//
// Exact clamping of an unclamped DXF SPLINE.
//
// A DXF SPLINE stores `controlCount + degree + 1` knots, and its curve lives on
// the domain [u_degree, u_controlCount]. Periodic splines (flag 2) and uniform
// open splines leave the outer knots unclamped, so the curve does not start or
// end on a control point and cannot join a neighbouring profile segment by its
// control net alone. Boehm knot insertion of each domain end until it has
// multiplicity `degree` puts a control point on the curve end without moving
// the curve; the control points and knots outside the domain are then dropped.
// Rational splines are clamped in homogeneous coordinates, so the result is
// the same curve at the same parameters, not an approximation.

import { DxfParseError } from './dxfPairs';

export interface PlanarSpline {
  degree: number;
  controlPoints: Array<readonly [number, number]>;
  knots: number[];
  /** Empty for a non-rational spline. */
  weights: number[];
}

type Homogeneous = [number, number, number];

/**
 * Insert `u` once (Boehm). Each new point blends P[i-1] and P[i] by
 * alpha = 1 when knots[i + degree] <= u, 0 when knots[i] >= u, otherwise the
 * linear ratio; this form needs no knot-span search, so `u` may sit on a knot.
 */
function insertKnot(degree: number, knots: number[], points: Homogeneous[], u: number): Homogeneous[] {
  const next: Homogeneous[] = [];
  for (let i = 0; i <= points.length; i++) {
    if (knots[i + degree] <= u) { next.push(points[i]); continue; }
    if (knots[i] >= u) { next.push(points[i - 1]); continue; }
    const alpha = (u - knots[i]) / (knots[i + degree] - knots[i]);
    const a = points[i - 1];
    const b = points[i];
    next.push([
      (1 - alpha) * a[0] + alpha * b[0],
      (1 - alpha) * a[1] + alpha * b[1],
      (1 - alpha) * a[2] + alpha * b[2],
    ]);
  }
  let at = 0;
  while (at < knots.length && knots[at] <= u) at++;
  knots.splice(at, 0, u);
  return next;
}

function multiplicityOf(knots: readonly number[], u: number): number {
  return knots.reduce((count, knot) => count + (knot === u ? 1 : 0), 0);
}

/**
 * Return the clamped form of `spline` over its DXF parameter domain. A spline
 * whose end knots are already clamped is returned unchanged.
 */
export function clampSpline(spline: PlanarSpline): PlanarSpline {
  const { degree } = spline;
  const start = spline.knots[degree];
  const end = spline.knots[spline.controlPoints.length];
  const startClamped = spline.knots[0] === start;
  const endClamped = spline.knots[spline.knots.length - 1] === end;
  if (startClamped && endClamped) return spline;

  const rational = spline.weights.length !== 0;
  const knots = [...spline.knots];
  let points: Homogeneous[] = spline.controlPoints.map(([x, y], i) => {
    const w = rational ? spline.weights[i] : 1;
    return [x * w, y * w, w];
  });
  if (!startClamped) while (multiplicityOf(knots, start) < degree) points = insertKnot(degree, knots, points, start);
  if (!endClamped) while (multiplicityOf(knots, end) < degree) points = insertKnot(degree, knots, points, end);

  // Keep the control points whose basis functions reach into (start, end).
  const first = startClamped ? 0 : knots.lastIndexOf(start) - degree;
  const last = endClamped ? points.length - 1 : knots.indexOf(end) - 1;
  const kept = points.slice(first, last + 1);
  const clampedKnots = knots.slice(first, last + degree + 2);
  clampedKnots[0] = start;
  clampedKnots[clampedKnots.length - 1] = end;
  return {
    degree,
    controlPoints: kept.map(([x, y, w]) => [x / w, y / w] as const),
    knots: clampedKnots,
    weights: rational ? kept.map(([, , w]) => w) : [],
  };
}

// `where` names the entity in the error, for example `SPLINE at line 12`.

export function validateKnotOrder(knots: number[], where: string): void {
  for (let i = 1; i < knots.length; i++) {
    if (knots[i] < knots[i - 1]) {
      throw new DxfParseError('malformed-entity', `${where}: knot values must be non-decreasing.`);
    }
  }
}

export function validateKnotDomain(knots: number[], degree: number, controlCount: number, where: string): void {
  if (knots[degree] >= knots[controlCount]) {
    throw new DxfParseError('malformed-entity', `${where}: knot vector has an empty parameter domain.`);
  }
}

export function validateSplineContinuity(knots: number[], degree: number, controlCount: number, where: string): void {
  for (let i = degree + 1; i < controlCount; i++) {
    let multiplicity = 1;
    while (i + multiplicity < controlCount && knots[i + multiplicity] === knots[i]) multiplicity++;
    if (multiplicity > degree) {
      throw new DxfParseError(
        'unsupported-entity',
        `${where}: knot multiplicity ${multiplicity} makes the curve discontinuous; use a continuous clamped spline.`,
      );
    }
    i += multiplicity - 1;
  }
}
