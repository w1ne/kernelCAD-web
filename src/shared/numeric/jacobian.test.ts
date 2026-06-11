// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/numeric/jacobian.test.ts
//
// Unit tests for the small-matrix helpers used by the v0.6 mate solver
// (T7 — Newton-Raphson closed-loop solver). Targets correctness on
// matrices up to ~10×10; the solver itself never sees more than ~30×30
// in realistic closed-loop assemblies.

import { describe, it, expect } from 'vitest';
import {
  finiteDiffJacobian,
  invertSquare,
  norm2,
  solveLeastSquares,
  sub,
} from './jacobian';

describe('numeric/jacobian helpers', () => {
  it('invertSquare gives identity on a 2x2 identity', () => {
    expect(invertSquare([[1, 0], [0, 1]])).toEqual([[1, 0], [0, 1]]);
  });

  it('invertSquare round-trips on a non-trivial 3x3', () => {
    const m = [[2, 0, 0], [0, 3, 0], [0, 0, 4]];
    const inv = invertSquare(m);
    expect(inv[0][0]).toBeCloseTo(0.5);
    expect(inv[1][1]).toBeCloseTo(1 / 3);
    expect(inv[2][2]).toBeCloseTo(0.25);
  });

  it('finiteDiffJacobian approximates df/dx for f(x) = [x[0]^2, x[1]^2]', () => {
    const f = (x: number[]) => [x[0] * x[0], x[1] * x[1]];
    const J = finiteDiffJacobian(f, [2, 3]);
    expect(J[0][0]).toBeCloseTo(4, 3);   // df0/dx0 = 2*x0 = 4
    expect(J[1][1]).toBeCloseTo(6, 3);   // df1/dx1 = 2*x1 = 6
    expect(J[0][1]).toBeCloseTo(0, 3);
    expect(J[1][0]).toBeCloseTo(0, 3);
  });

  it('solveLeastSquares handles overdetermined system', () => {
    // y = 2x + 1 over points (0,1), (1,3), (2,5) — exact fit
    const A = [[0, 1], [1, 1], [2, 1]];
    const b = [1, 3, 5];
    const sol = solveLeastSquares(A, b);
    expect(sol[0]).toBeCloseTo(2);   // slope
    expect(sol[1]).toBeCloseTo(1);   // intercept
  });

  it('norm2 / sub work as expected', () => {
    expect(norm2([3, 4])).toBeCloseTo(5);
    expect(sub([5, 5, 5], [1, 2, 3])).toEqual([4, 3, 2]);
  });
});
