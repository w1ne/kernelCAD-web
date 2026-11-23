// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tight, conservative AABB of rational B-spline surface patches.
//
// A rational B-spline with positive weights lies inside the convex hull of
// its poles, so the pole box is a valid outer bound. It is loose: on the
// helical faces of `threadedRod` it is 10 to 22 % large. This module splits
// each patch into Bezier patches, then bisects (de Casteljau, homogeneous
// coordinates) only the patches whose pole box sticks out past the inner box
// of known surface points (Bezier corner poles lie on the surface). Every
// leaf still contributes its pole box, so the result always contains the
// surface; it is at most `tol` outside the inner box unless the split budget
// runs out, and then it is only looser.
//
// Pure JS: the OCCT side (reading poles, knots and face bounds) lives in
// backends/occt/splineFaceBounds.ts.

/** Homogeneous pole `[w*x, w*y, w*z, w]`. */
export type HPoint = [number, number, number, number];

/** Mutable AABB as `[minX, minY, minZ, maxX, maxY, maxZ]`. */
export type Box6 = [number, number, number, number, number, number];

/** A non-periodic B-spline surface. `poles[i][j]` is homogeneous; `uKnots`
 *  and `vKnots` are flat (each value repeated by its multiplicity). */
export interface SplineSurface {
  uDegree: number;
  vDegree: number;
  uKnots: number[];
  vKnots: number[];
  poles: HPoint[][];
}

/** Split budget shared by one bounds call; leaves past it keep their pole box. */
export interface SplitBudget {
  splits: number;
}

const MAX_DEPTH = 40;

export function emptyBox(): Box6 {
  return [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
}

export function unionBox(into: Box6, b: Box6): void {
  for (let a = 0; a < 3; a++) {
    if (b[a] < into[a]) into[a] = b[a];
    if (b[a + 3] > into[a + 3]) into[a + 3] = b[a + 3];
  }
}

function addPoint(into: Box6, p: HPoint): void {
  const x = p[0] / p[3], y = p[1] / p[3], z = p[2] / p[3];
  if (x < into[0]) into[0] = x;
  if (y < into[1]) into[1] = y;
  if (z < into[2]) into[2] = z;
  if (x > into[3]) into[3] = x;
  if (y > into[4]) into[4] = y;
  if (z > into[5]) into[5] = z;
}

/** True when `outer` exceeds `inner` by more than `tol` on any side. */
export function exceeds(outer: Box6, inner: Box6, tol: number): boolean {
  for (let a = 0; a < 3; a++) {
    if (outer[a] < inner[a] - tol || outer[a + 3] > inner[a + 3] + tol) return true;
  }
  return false;
}

/** Pole box of `surface` restricted to `[u1, u2] x [v1, v2]`, tightened to
 *  `tol` against `inner`. Grows `inner` with the surface points it finds.
 *  Undefined when a weight is not positive (no convex-hull guarantee). */
export function splineSurfaceBounds(
  surface: SplineSurface,
  range: { u1: number; u2: number; v1: number; v2: number },
  inner: Box6,
  tol: number,
  budget: SplitBudget,
): Box6 | undefined {
  for (const row of surface.poles) for (const p of row) if (!(p[3] > 0)) return undefined;
  const patches = bezierPatches(surface, range);
  if (patches.length === 0) return undefined;
  for (const patch of patches) addCorners(inner, patch);
  const out = emptyBox();
  const stack: { net: HPoint[][]; depth: number }[] = patches.map((net) => ({ net, depth: 0 }));
  while (stack.length > 0) {
    const { net, depth } = stack.pop()!;
    const hull = poleBox(net);
    if (depth >= MAX_DEPTH || budget.splits <= 0 || !exceeds(hull, inner, tol)) {
      unionBox(out, hull);
      continue;
    }
    budget.splits--;
    for (const half of splitDir(net, bendier(net))) {
      addCorners(inner, half);
      stack.push({ net: half, depth: depth + 1 });
    }
  }
  return out;
}

function poleBox(net: HPoint[][]): Box6 {
  const box = emptyBox();
  for (const row of net) for (const p of row) addPoint(box, p);
  return box;
}

/** 0 when the net bends more along u (first index) than along v, else 1.
 *  A flat-crested thread face is straight along one direction; splitting
 *  that direction would not tighten its pole box. */
function bendier(net: HPoint[][]): 0 | 1 {
  return bend(net) >= bend(transpose(net)) ? 0 : 1;
}

/** Largest second difference of the Cartesian poles along the first index. */
function bend(net: HPoint[][]): number {
  let worst = 0;
  for (let i = 1; i + 1 < net.length; i++) {
    for (let j = 0; j < net[i].length; j++) {
      const a = net[i - 1][j], b = net[i][j], c = net[i + 1][j];
      for (let k = 0; k < 3; k++) {
        const d = Math.abs(a[k] / a[3] - 2 * (b[k] / b[3]) + c[k] / c[3]);
        if (d > worst) worst = d;
      }
    }
  }
  return worst;
}

function addCorners(inner: Box6, net: HPoint[][]): void {
  const last = net.length - 1;
  const lastCol = net[0].length - 1;
  addPoint(inner, net[0][0]);
  addPoint(inner, net[0][lastCol]);
  addPoint(inner, net[last][0]);
  addPoint(inner, net[last][lastCol]);
}

/** Split a Bezier net at parameter 0.5 along u (`dir` 0, first index) or v. */
function splitDir(net: HPoint[][], dir: 0 | 1): [HPoint[][], HPoint[][]] {
  const t = dir === 0 ? net : transpose(net);
  const lo: HPoint[][] = [];
  const hi: HPoint[][] = [];
  const n = t.length;
  for (let k = 0; k < n; k++) {
    lo.push([]);
    hi.push([]);
  }
  for (let j = 0; j < t[0].length; j++) {
    const work = t.map((row) => row[j].slice() as HPoint);
    lo[0].push(work[0].slice() as HPoint);
    hi[n - 1].push(work[n - 1].slice() as HPoint);
    for (let r = 1; r < n; r++) {
      for (let i = 0; i < n - r; i++) {
        for (let c = 0; c < 4; c++) work[i][c] = 0.5 * (work[i][c] + work[i + 1][c]);
      }
      lo[r].push(work[0].slice() as HPoint);
      hi[n - 1 - r].push(work[n - 1 - r].slice() as HPoint);
    }
  }
  return dir === 0 ? [lo, hi] : [transpose(lo), transpose(hi)];
}

function transpose(net: HPoint[][]): HPoint[][] {
  return net[0].map((_, j) => net.map((row) => row[j]));
}

/** Bezier nets covering the requested parameter range. */
export function bezierPatches(
  surface: SplineSurface,
  range: { u1: number; u2: number; v1: number; v2: number },
): HPoint[][][] {
  const p = surface.uDegree;
  const q = surface.vDegree;
  // Refine along u: each column (fixed j) is a curve in u.
  const uCols = transpose(surface.poles);
  const u = toBezierKnots(surface.uKnots, p, uCols, range.u1, range.u2);
  const net = transpose(u.curves);
  const v = toBezierKnots(surface.vKnots, q, net, range.v1, range.v2);
  const full = v.curves; // full[i][j]
  const patches: HPoint[][][] = [];
  for (const ui of u.spanStarts) {
    for (const vj of v.spanStarts) {
      const patch: HPoint[][] = [];
      for (let i = ui; i <= ui + p; i++) patch.push(full[i].slice(vj, vj + q + 1));
      patches.push(patch);
    }
  }
  return patches;
}

/** Insert knots so every distinct knot in `[t1, t2]` (and both ends) has
 *  multiplicity >= degree, applied to each curve in `curves`. Returns the
 *  refined curves and the first pole index of each Bezier span in range. */
function toBezierKnots(
  knots: number[],
  degree: number,
  curves: HPoint[][],
  t1: number,
  t2: number,
): { curves: HPoint[][]; spanStarts: number[] } {
  let U = knots.slice();
  let cs = curves.map((c) => c.slice());
  const lo = Math.max(t1, U[degree]);
  const hi = Math.min(t2, U[U.length - 1 - degree]);
  if (!(hi > lo)) return { curves: cs, spanStarts: [] };
  const targets = [lo, hi, ...new Set(U.filter((k) => k > lo && k < hi))];
  for (const t of targets) {
    let mult = U.filter((k) => k === t).length;
    while (mult < degree) {
      // On an unclamped end knot, the span after `t` has no poles; insert
      // through the last span that ends at `t` instead.
      const k = Math.min(lastIndexAtOrBelow(U, t), U.length - degree - 2);
      cs = cs.map((c) => insertOnce(c, U, degree, t, k));
      U = [...U.slice(0, k + 1), t, ...U.slice(k + 1)];
      mult++;
    }
  }
  const spanStarts: number[] = [];
  for (let k = degree; k < U.length - degree - 1; k++) {
    if (U[k] < U[k + 1] && U[k] >= lo && U[k + 1] <= hi) spanStarts.push(k - degree);
  }
  return { curves: cs, spanStarts };
}

function lastIndexAtOrBelow(U: number[], t: number): number {
  let k = -1;
  for (let i = 0; i < U.length; i++) if (U[i] <= t) k = i;
  return k;
}

/** Boehm single knot insertion of `t` (with `U[k] <= t <= U[k+1]`) into
 *  one homogeneous curve. */
function insertOnce(P: HPoint[], U: number[], p: number, t: number, k: number): HPoint[] {
  const Q: HPoint[] = [];
  for (let i = 0; i <= k - p; i++) Q.push(P[i]);
  for (let i = k - p + 1; i <= k; i++) {
    const den = U[i + p] - U[i];
    const a = den > 0 ? (t - U[i]) / den : 0;
    const pt: HPoint = [0, 0, 0, 0];
    for (let c = 0; c < 4; c++) pt[c] = a * P[i][c] + (1 - a) * P[i - 1][c];
    Q.push(pt);
  }
  for (let i = k; i < P.length; i++) Q.push(P[i]);
  return Q;
}

/** Flat knots and pole indices of one periodic direction, unwrapped so its
 *  span `[knots[degree], knots[knots.length - 1 - degree]]` covers
 *  `[t1, t2]`. `period` is OCCT's periodic flat knot sequence
 *  (`UKnotSequence`): pole `j` of the unwrapped curve is pole `j mod nPoles`.
 *  Undefined when the sequence is not periodic or `[t1, t2]` spans more than
 *  `MAX_PERIODS` periods. */
export function unwrapPeriodic(
  period: number[],
  nPoles: number,
  degree: number,
  t1: number,
  t2: number,
): { knots: number[]; poleIndex: number[] } | undefined {
  const n = nPoles;
  if (n < 1 || period.length < n + degree + 1) return undefined;
  const T = period[n] - period[0];
  if (!(T > 0)) return undefined;
  for (let i = 0; i + n < period.length; i++) {
    if (Math.abs(period[i + n] - period[i] - T) > 1e-9 * Math.max(1, T)) return undefined;
  }
  const knot = (i: number) => period[mod(i, n)] + Math.floor(i / n) * T;
  let lo = 0;
  let hi = period.length - 1;
  for (let k = 0; knot(lo + degree) > t1; k++) {
    if (k >= MAX_PERIODS) return undefined;
    lo -= n;
  }
  for (let k = 0; knot(hi - degree) < t2; k++) {
    if (k >= MAX_PERIODS) return undefined;
    hi += n;
  }
  const knots: number[] = [];
  for (let i = lo; i <= hi; i++) knots.push(knot(i));
  const poleIndex: number[] = [];
  for (let j = lo; j <= hi - degree - 1; j++) poleIndex.push(mod(j, n));
  return { knots, poleIndex };
}

const MAX_PERIODS = 8;

function mod(i: number, n: number): number {
  return ((i % n) + n) % n;
}
