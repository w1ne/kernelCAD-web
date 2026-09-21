// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/nurbsKnots.ts
//
// Pure knot-vector helpers shared by the NURBS surface lowerer
// (`nurbsSurfaceLowerer.ts`) and the mixed-source path lowerer
// (`pathNurbsLowerer.ts`, via `verb/curveBridge.ts`). Leaf module with no
// kernel imports so both lowerers can depend on it without re-forming the
// surface <-> path import cycle.

/**
 * Build a clamped-uniform knot vector for `n` control points + degree `d`.
 *
 * For a clamped (non-periodic) NURBS, the knot multiplicities are:
 *  - degree+1 at each endpoint;
 *  - 1 for interior knots.
 *
 * Returns distinct knot values + per-knot multiplicities (the form OCCT
 * expects via its `Knots`/`Mults` arrays).
 */
export function clampedUniformKnots(
  n: number,
  d: number,
): { knots: number[]; mults: number[] } {
  // Distinct knot values for clamped uniform: { 0, 1/(n-d), 2/(n-d), ..., 1 }.
  const distinct = n - d + 1;
  if (distinct < 2) {
    // Degenerate: collapse to [0, 1] with mults [d+1, d+1] so OCCT can still
    // build the (rank-deficient) surface. Capture-layer validation should
    // reject this earlier; we keep the math defensive.
    return { knots: [0, 1], mults: [d + 1, d + 1] };
  }
  const knots: number[] = [];
  const mults: number[] = [];
  for (let i = 0; i < distinct; i++) {
    knots.push(i / (distinct - 1));
    mults.push(i === 0 || i === distinct - 1 ? d + 1 : 1);
  }
  return { knots, mults };
}

/**
 * Decompose a possibly-non-decreasing-with-repeats knot vector into the
 * (distinct, multiplicity) form OCCT consumes.
 */
export function decomposeKnots(
  knotVector: number[],
): { knots: number[]; mults: number[] } {
  const knots: number[] = [];
  const mults: number[] = [];
  for (const k of knotVector) {
    if (knots.length > 0 && knots[knots.length - 1] === k) {
      mults[mults.length - 1] += 1;
    } else {
      knots.push(k);
      mults.push(1);
    }
  }
  return { knots, mults };
}
