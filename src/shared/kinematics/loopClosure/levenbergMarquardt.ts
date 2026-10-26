// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/kinematics/loopClosure/levenbergMarquardt.ts
//
// Damped least squares with adaptive (Levenberg) damping. Central-difference
// Jacobian in the caller's scaled units. Deterministic: fixed probe step,
// fixed damping schedule, no randomness.

import { normalEquations, solveDamped, type Columns } from './linearAlgebra';

export interface LmProblem {
  /** Residual at x (scaled, O(1) rows). */
  readonly residual: (x: Float64Array) => Float64Array;
  /** True when the residual meets the caller's tolerances. */
  readonly converged: (r: Float64Array) => boolean;
}

export interface LmResult {
  readonly x: Float64Array;
  readonly r: Float64Array;
  readonly converged: boolean;
  readonly iterations: number;
}

const ITER_CAP = 100;
const PROBE = 1e-6;
const LAMBDA_START = 1e-6;
const LAMBDA_MIN = 1e-12;
const LAMBDA_MAX = 1e8;
/** Largest change of one coordinate per accepted step (rad, or lref units).
 *  Keeps a step from leaping onto another assembly branch. */
const MAX_STEP = 0.25;

function sumSq(r: Float64Array): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) s += r[i] * r[i];
  return s;
}

/** Central-difference Jacobian columns at x. */
export function jacobian(residual: (x: Float64Array) => Float64Array, x: Float64Array): Float64Array[] {
  const cols: Float64Array[] = [];
  for (let k = 0; k < x.length; k++) {
    const xp = Float64Array.from(x);
    const xm = Float64Array.from(x);
    xp[k] += PROBE;
    xm[k] -= PROBE;
    const rp = residual(xp);
    const rm = residual(xm);
    cols.push(Float64Array.from(rp, (v, i) => (v - rm[i]) / (2 * PROBE)));
  }
  return cols;
}

function clampStep(dx: number[]): number[] {
  let big = 0;
  for (const v of dx) big = Math.max(big, Math.abs(v));
  if (big <= MAX_STEP) return dx;
  const s = MAX_STEP / big;
  return dx.map((v) => v * s);
}

function tryStep(
  p: LmProblem,
  x: Float64Array,
  J: Columns,
  r: Float64Array,
  lambda: number,
): { x: Float64Array; r: Float64Array; lambda: number } | undefined {
  const { A, g } = normalEquations(J, r);
  const cost = sumSq(r);
  for (let lam = lambda; lam <= LAMBDA_MAX; lam *= 4) {
    const dx = solveDamped(A, g.map((v) => -v), lam);
    if (dx === undefined) continue;
    const step = clampStep(dx);
    const xn = Float64Array.from(x, (v, i) => v + step[i]);
    const rn = p.residual(xn);
    if (sumSq(rn) < cost) return { x: xn, r: rn, lambda: Math.max(lam / 3, LAMBDA_MIN) };
  }
  return undefined;
}

/** Minimise |r(x)|² from x0. Stops on convergence, on a stall (no damping
 *  value reduces the cost) or at the iteration cap. */
export function levenbergMarquardt(p: LmProblem, x0: Float64Array): LmResult {
  let x: Float64Array = Float64Array.from(x0);
  let r: Float64Array = p.residual(x);
  let lambda = LAMBDA_START;
  for (let it = 0; it < ITER_CAP; it++) {
    if (p.converged(r)) return { x, r, converged: true, iterations: it };
    if (x.length === 0) break;
    const next = tryStep(p, x, jacobian(p.residual, x), r, lambda);
    if (next === undefined) return { x, r, converged: false, iterations: it + 1 };
    ({ x, r, lambda } = next);
  }
  return { x, r, converged: p.converged(r), iterations: ITER_CAP };
}
