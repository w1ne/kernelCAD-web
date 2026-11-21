// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/dxfSplineFit.ts
//
// Cubic interpolation of a fit-point-only DXF SPLINE.
//
// A DXF SPLINE may carry only fit points (group codes 11/21/31) and optional
// start and end tangent directions (12/22/32, 13/23/33); the reading CAD tool
// builds the control net itself. This module builds the clamped cubic that
// passes through every fit point, by global interpolation with end derivatives
// (Piegl & Tiller, The NURBS Book, 2nd ed., section 9.2.2):
//
//   - parameters are chord length, normalised to [0, 1];
//   - the knot vector is {0,0,0,0, u_1..u_{m-1}, 1,1,1,1};
//   - a given tangent direction is scaled to the total chord length, the
//     derivative magnitude a chord-length parameterisation implies;
//   - a missing tangent is the Bessel estimate, the end derivative of the
//     parabola through the first (or last) three fit points.
//
// A closed fit-point spline (flag 1) without end tangents is interpolated as a
// periodic cubic instead (Piegl & Tiller section 9.2.4 with chord-length
// parameters around the closed polygon, the knots at the parameters), so the
// seam is C2 like every other fit point. With an end tangent it is the clamped
// cubic above through the fit points and back to the first, with that tangent
// at both ends. The periodic result is clamped exactly (dxfSplineClamp.ts).
//
// The curve passes through the fit points exactly (to solver round-off).
// Between fit points the shape depends on these choices, so it can differ
// slightly from the curve the source tool drew from the same fit data.
//
// `fitPointSpline` reads and validates the fit data of one SPLINE entity;
// non-cubic, nonplanar and duplicate-point fit splines are refused.

import { clampSpline, type PlanarSpline } from './dxfSplineClamp';
import { DxfParseError, get, num, values, type EntityBlock } from './dxfPairs';

type Point = readonly [number, number];

/** Chord-length parameters in [0, 1]; the caller guarantees distinct consecutive points. */
function chordParameters(fit: readonly Point[]): { params: number[]; length: number } {
  const chords = fit.slice(1).map(([x, y], i) => Math.hypot(x - fit[i][0], y - fit[i][1]));
  const length = chords.reduce((a, b) => a + b, 0);
  const params = [0];
  for (const chord of chords) params.push(params[params.length - 1] + chord / length);
  params[params.length - 1] = 1;
  return { params, length };
}

/** Bessel end derivative: the derivative of the parabola through three points at the first. */
function besselDerivative(q0: Point, q1: Point, q2: Point, h1: number, h2: number): Point {
  const d1 = [(q1[0] - q0[0]) / h1, (q1[1] - q0[1]) / h1];
  const d2 = [(q2[0] - q1[0]) / h2, (q2[1] - q1[1]) / h2];
  return [
    ((2 * h1 + h2) * d1[0] - h1 * d2[0]) / (h1 + h2),
    ((2 * h1 + h2) * d1[1] - h1 * d2[1]) / (h1 + h2),
  ];
}

function endDerivative(
  tangent: Point | undefined,
  length: number,
  fit: readonly Point[],
  params: readonly number[],
  atEnd: boolean,
): Point {
  if (tangent) {
    const norm = Math.hypot(tangent[0], tangent[1]);
    return [(tangent[0] / norm) * length, (tangent[1] / norm) * length];
  }
  if (fit.length === 2) return [fit[1][0] - fit[0][0], fit[1][1] - fit[0][1]];
  if (!atEnd) return besselDerivative(fit[0], fit[1], fit[2], params[1] - params[0], params[2] - params[1]);
  const m = fit.length - 1;
  // Mirror the end: run the start formula on the reversed points, then negate.
  const [dx, dy] = besselDerivative(fit[m], fit[m - 1], fit[m - 2], params[m] - params[m - 1], params[m - 1] - params[m - 2]);
  return [-dx, -dy];
}

/** Non-zero cubic basis values N_{span-3..span,3}(u) (Piegl & Tiller A2.2). */
function cubicBasis(knots: readonly number[], span: number, u: number): number[] {
  const values = [1, 0, 0, 0];
  const left = [0, 0, 0, 0];
  const right = [0, 0, 0, 0];
  for (let j = 1; j <= 3; j++) {
    left[j] = u - knots[span + 1 - j];
    right[j] = knots[span + j] - u;
    let saved = 0;
    for (let r = 0; r < j; r++) {
      const temp = values[r] / (right[r + 1] + left[j - r]);
      values[r] = saved + right[r + 1] * temp;
      saved = left[j - r] * temp;
    }
    values[j] = saved;
  }
  return values;
}

/** Solve A x = b for each column of b by Gaussian elimination with partial pivoting. */
function solve(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];
    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / a[col][col];
      for (let k = col; k < n; k++) a[row][k] -= factor * a[col][k];
      for (let k = 0; k < b[row].length; k++) b[row][k] -= factor * b[col][k];
    }
  }
  const x = b.map(row => row.map(() => 0));
  for (let row = n - 1; row >= 0; row--) {
    for (let k = 0; k < b[row].length; k++) {
      let sum = b[row][k];
      for (let j = row + 1; j < n; j++) sum -= a[row][j] * x[j][k];
      x[row][k] = sum / a[row][row];
    }
  }
  return x;
}

/**
 * Clamped non-rational cubic through `fit` (two or more distinct consecutive
 * points). `startTangent` / `endTangent` are directions; their length is
 * ignored, and a missing one is estimated.
 */
export function interpolateFitPoints(
  fit: readonly Point[],
  startTangent?: Point,
  endTangent?: Point,
): PlanarSpline {
  const m = fit.length - 1;
  const { params, length } = chordParameters(fit);
  const knots = [0, 0, 0, 0, ...params.slice(1, m), 1, 1, 1, 1];
  const n = m + 2; // index of the last of m + 3 control points
  const d0 = endDerivative(startTangent, length, fit, params, false);
  const dm = endDerivative(endTangent, length, fit, params, true);
  const controls: Array<[number, number]> = Array.from({ length: n + 1 }, () => [0, 0]);
  controls[0] = [fit[0][0], fit[0][1]];
  controls[n] = [fit[m][0], fit[m][1]];
  // C'(0) = 3 / u_4 (P1 - P0) and C'(1) = 3 / (1 - u_n) (Pn - Pn-1).
  controls[1] = [fit[0][0] + (knots[4] / 3) * d0[0], fit[0][1] + (knots[4] / 3) * d0[1]];
  controls[n - 1] = [fit[m][0] - ((1 - knots[n]) / 3) * dm[0], fit[m][1] - ((1 - knots[n]) / 3) * dm[1]];
  if (m > 1) {
    // Unknowns P2..P(n-2), one equation C(u_k) = Q_k per interior fit point.
    const a = Array.from({ length: m - 1 }, () => new Array<number>(m - 1).fill(0));
    const b = Array.from({ length: m - 1 }, (_, row) => [fit[row + 1][0], fit[row + 1][1]]);
    for (let k = 1; k < m; k++) {
      const span = k + 3; // u_k = knots[k + 3] and lies in [knots[k + 3], knots[k + 4])
      const basis = cubicBasis(knots, span, params[k]);
      for (let j = 0; j <= 3; j++) {
        const i = span - 3 + j;
        if (i >= 2 && i <= n - 2) {
          a[k - 1][i - 2] += basis[j];
        } else {
          b[k - 1][0] -= basis[j] * controls[i][0];
          b[k - 1][1] -= basis[j] * controls[i][1];
        }
      }
    }
    solve(a, b).forEach(([x, y], i) => { controls[i + 2] = [x, y]; });
  }
  return { degree: 3, controlPoints: controls, knots, weights: [] };
}

/**
 * Clamped form of the C2 periodic cubic through the closed polygon `fit`
 * (three or more distinct points, the first not repeated at the end).
 */
export function interpolateClosedFitPoints(fit: readonly Point[]): PlanarSpline {
  const count = fit.length;
  const { params } = chordParameters([...fit, fit[0]]);
  // Periodic knots u_i = params[i mod count] + floor(i / count), for i = -3..count+3.
  const knots = Array.from({ length: count + 7 }, (_, j) => {
    const i = j - 3;
    return params[((i % count) + count) % count] + Math.floor(i / count);
  });
  // Control i of the wrapped net is P[i mod count]; one equation C(u_k) = Q_k per fit point.
  const a = Array.from({ length: count }, () => new Array<number>(count).fill(0));
  const b = fit.map(([x, y]) => [x, y]);
  for (let k = 0; k < count; k++) {
    const basis = cubicBasis(knots, k + 3, params[k]);
    for (let j = 0; j <= 3; j++) a[k][(k + j) % count] += basis[j];
  }
  const periodic = solve(a, b).map(([x, y]) => [x, y] as const);
  return clampSpline({
    degree: 3,
    controlPoints: [...periodic, ...periodic.slice(0, 3)],
    knots,
    weights: [],
  });
}

/** Refuse SPLINE data off the XY plane: non-zero Z values or a tilted normal. */
export function validateSplinePlanarity(b: EntityBlock, zs: number[]): void {
  const zScale = Math.max(1, ...zs.map(Math.abs));
  if (zs.some(z => Math.abs(z) > 1e-9 * zScale)) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${b.line}: non-zero Z control points are outside this 2D profile importer; flatten the spline to the XY plane.`,
    );
  }
  const nx = get(b.body, 210);
  const ny = get(b.body, 220);
  const nz = get(b.body, 230);
  const normalIsXY = Math.abs(nx ? num(nx, 'SPLINE', 210) : 0) <= 1e-9 &&
    Math.abs(ny ? num(ny, 'SPLINE', 220) : 0) <= 1e-9 &&
    Math.abs(Math.abs(nz ? num(nz, 'SPLINE', 230) : 0) - 1) <= 1e-9;
  if ((nx !== undefined || ny !== undefined || nz !== undefined) && !normalIsXY) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${b.line}: its normal is not aligned with the XY plane; only planar XY profiles can be imported.`,
    );
  }
}

function optionalTangent(b: EntityBlock, codes: readonly [number, number, number]): readonly [number, number] | undefined {
  const [x, y, z] = codes.map(code => get(b.body, code));
  if (x === undefined && y === undefined) return undefined;
  const t = [x, y, z].map((p, i) => (p ? num(p, 'SPLINE', codes[i]) : 0));
  const norm = Math.hypot(t[0], t[1], t[2]);
  // A zero tangent carries no direction; treat it as absent and estimate one.
  if (norm === 0) return undefined;
  if (Math.abs(t[2]) > 1e-9 * norm) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${b.line}: an end tangent leaves the XY plane; only planar XY profiles can be imported.`,
    );
  }
  return [t[0], t[1]];
}

/**
 * Cubic through the fit points of a closed SPLINE and back to the first: C2
 * periodic without end tangents, otherwise clamped with the given tangent at
 * the seam.
 */
function closedFitPointSpline(
  fit: readonly Point[],
  size: number,
  line: number,
  startTangent?: Point,
  endTangent?: Point,
): PlanarSpline {
  // A closed spline may repeat its first fit point at the end; the closure adds it back.
  const [lx, ly] = fit[fit.length - 1];
  const ring = Math.hypot(lx - fit[0][0], ly - fit[0][1]) <= 1e-12 * size ? fit.slice(0, -1) : fit;
  if (ring.length < 3) {
    throw new DxfParseError(
      'malformed-entity',
      `SPLINE at line ${line}: a closed fit-point spline needs at least 3 distinct fit points, found ${ring.length}.`,
    );
  }
  if (!startTangent && !endTangent) return interpolateClosedFitPoints(ring);
  return interpolateFitPoints([...ring, ring[0]], startTangent ?? endTangent, endTangent ?? startTangent);
}

/**
 * A SPLINE with fit points and no control net: build the clamped cubic
 * through the fit points, or for a closed spline the cubic that also returns
 * to the first fit point (dxfSplineFit.ts).
 */
export function fitPointSpline(
  b: EntityBlock,
  scale: number,
  definition: { flags: number; degree: number },
): PlanarSpline {
  const xs = values(b.body, 11, 'SPLINE');
  const ys = values(b.body, 21, 'SPLINE');
  const zs = values(b.body, 31, 'SPLINE');
  const declaredFitCount = get(b.body, 74);
  if (xs.length === 0) {
    throw new DxfParseError('malformed-entity', `SPLINE at line ${b.line}: it has neither control points nor fit points.`);
  }
  if (ys.length !== xs.length || (zs.length !== 0 && zs.length !== xs.length) ||
      (declaredFitCount !== undefined && num(declaredFitCount, 'SPLINE', 74) !== xs.length)) {
    throw new DxfParseError(
      'malformed-entity',
      `SPLINE at line ${b.line}: fit point counts disagree (${xs.length} X, ${ys.length} Y, ${zs.length} Z` +
        `${declaredFitCount === undefined ? '' : `, ${num(declaredFitCount, 'SPLINE', 74)} declared`}).`,
    );
  }
  if (definition.degree !== 3) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${b.line}: fit-point-only splines are interpolated as cubics, but this one declares degree ${definition.degree}; ` +
        'export control points and knots from the source tool.',
    );
  }
  if (xs.length < 2) {
    throw new DxfParseError('malformed-entity', `SPLINE at line ${b.line}: a fit-point spline needs at least 2 fit points, found ${xs.length}.`);
  }
  validateSplinePlanarity(b, zs);
  const fit = xs.map((x, i) => [x * scale, ys[i] * scale] as const);
  const size = Math.max(1, ...fit.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))));
  fit.slice(1).forEach(([x, y], i) => {
    if (Math.hypot(x - fit[i][0], y - fit[i][1]) <= 1e-12 * size) {
      throw new DxfParseError(
        'malformed-entity',
        `SPLINE at line ${b.line}: consecutive fit points coincide at (${x}, ${y}); remove the duplicate fit point.`,
      );
    }
  });
  const startTangent = optionalTangent(b, [12, 22, 32]);
  const endTangent = optionalTangent(b, [13, 23, 33]);
  if ((definition.flags & 1) === 0) return interpolateFitPoints(fit, startTangent, endTangent);
  return closedFitPointSpline(fit, size, b.line, startTangent, endTangent);
}
