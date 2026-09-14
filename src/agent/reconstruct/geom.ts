// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/geom.ts
//
// Small, allocation-light geometry helpers for mesh → feature reconstruction:
// 3-vector math, a Jacobi eigen-solver for 3×3 symmetric matrices, and 2D
// line / circle least-squares fits. Pure TypeScript — no OCCT, no `node:`.

export type V3 = [number, number, number];
export type V2 = [number, number];

export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale3 = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot3 = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm3 = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export function normalize3(a: V3): V3 {
  const n = norm3(a);
  return n < 1e-300 ? [0, 0, 0] : [a[0] / n, a[1] / n, a[2] / n];
}

/**
 * Eigen-decomposition of a symmetric 3×3 matrix by cyclic Jacobi rotations.
 * `m` is row-major `[a00,a01,a02, a10,a11,a12, a20,a21,a22]`. Returns the
 * eigenvalues ascending with their unit eigenvectors.
 */
export function symmetricEigen3(m: ArrayLike<number>): { values: V3; vectors: [V3, V3, V3] } {
  const a = [
    [m[0], m[1], m[2]],
    [m[3], m[4], m[5]],
    [m[6], m[7], m[8]],
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 50; sweep++) {
    const off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
    const scaleRef = Math.abs(a[0][0]) + Math.abs(a[1][1]) + Math.abs(a[2][2]);
    if (off <= 1e-15 * Math.max(scaleRef, 1e-300)) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]] as const) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k];
        const aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p];
        const vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const pairs = [0, 1, 2].map((i) => ({
    value: a[i][i],
    vector: normalize3([v[0][i], v[1][i], v[2][i]]),
  }));
  pairs.sort((x, y) => x.value - y.value);
  return {
    values: [pairs[0].value, pairs[1].value, pairs[2].value],
    vectors: [pairs[0].vector, pairs[1].vector, pairs[2].vector],
  };
}

/** Any unit vector perpendicular to `n`. Deterministic. */
export function anyPerpendicular(n: V3): V3 {
  const ref: V3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  return normalize3(cross3(ref, n));
}

function solve3(m: number[][], b: number[]): V3 | null {
  const a = m.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-300) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let k = col; k < 4; k++) a[r][k] -= f * a[col][k];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

export interface CircleFit {
  cx: number;
  cy: number;
  r: number;
  /** RMS of |p − c| − r over the points. */
  rms: number;
  /** Max of ||p − c| − r| over the points. */
  maxResidual: number;
}

/**
 * Least-squares circle through 2D points `xy` (flat `[x0,y0,x1,y1,…]`,
 * optionally a sub-range `[start, end)` of point indices). Algebraic (Kåsa)
 * fit for the start, refined by Gauss-Newton on the geometric distance.
 * Coordinates are centred first for conditioning. Returns null for fewer
 * than three points or collinear input.
 */
export function fitCircle2D(xy: ArrayLike<number>, start = 0, end = xy.length / 2): CircleFit | null {
  const n = end - start;
  if (n < 3) return null;
  let mx = 0;
  let my = 0;
  for (let i = start; i < end; i++) {
    mx += xy[2 * i];
    my += xy[2 * i + 1];
  }
  mx /= n;
  my /= n;
  // Kåsa: minimise Σ (x² + y² + D x + E y + F)².
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sz = 0, sxz = 0, syz = 0;
  for (let i = start; i < end; i++) {
    const x = xy[2 * i] - mx;
    const y = xy[2 * i + 1] - my;
    const z = x * x + y * y;
    sxx += x * x; sxy += x * y; syy += y * y;
    sx += x; sy += y; sz += z;
    sxz += x * z; syz += y * z;
  }
  const sol = solve3(
    [
      [sxx, sxy, sx],
      [sxy, syy, sy],
      [sx, sy, n],
    ],
    [-sxz, -syz, -sz],
  );
  if (!sol) return null;
  let cx = -sol[0] / 2;
  let cy = -sol[1] / 2;
  const r2 = cx * cx + cy * cy - sol[2];
  if (!(r2 > 0) || !Number.isFinite(r2)) return null;
  let r = Math.sqrt(r2);
  // Gauss-Newton on geometric residuals d_i = |p_i − c| − r.
  for (let iter = 0; iter < 20; iter++) {
    let j00 = 0, j01 = 0, j02 = 0, j11 = 0, j12 = 0, j22 = 0, g0 = 0, g1 = 0, g2 = 0;
    for (let i = start; i < end; i++) {
      const dx = xy[2 * i] - mx - cx;
      const dy = xy[2 * i + 1] - my - cy;
      const d = Math.hypot(dx, dy) || 1e-300;
      const res = d - r;
      const a0 = -dx / d;
      const a1 = -dy / d;
      const a2 = -1;
      j00 += a0 * a0; j01 += a0 * a1; j02 += a0 * a2;
      j11 += a1 * a1; j12 += a1 * a2; j22 += a2 * a2;
      g0 += a0 * res; g1 += a1 * res; g2 += a2 * res;
    }
    const step = solve3(
      [
        [j00, j01, j02],
        [j01, j11, j12],
        [j02, j12, j22],
      ],
      [-g0, -g1, -g2],
    );
    if (!step) break;
    cx += step[0];
    cy += step[1];
    r += step[2];
    if (Math.abs(step[0]) + Math.abs(step[1]) + Math.abs(step[2]) < 1e-12 * Math.max(1, r)) break;
  }
  if (!(r > 0) || !Number.isFinite(r)) return null;
  let sumSq = 0;
  let maxResidual = 0;
  for (let i = start; i < end; i++) {
    const res = Math.abs(Math.hypot(xy[2 * i] - mx - cx, xy[2 * i + 1] - my - cy) - r);
    sumSq += res * res;
    if (res > maxResidual) maxResidual = res;
  }
  return { cx: cx + mx, cy: cy + my, r, rms: Math.sqrt(sumSq / n), maxResidual };
}

export interface LineFit {
  /** A point on the line (the centroid of the fitted points). */
  px: number;
  py: number;
  /** Unit direction. */
  dx: number;
  dy: number;
  maxResidual: number;
}

/** Total-least-squares 2D line through points `[start, end)` of `xy`. */
export function fitLine2D(xy: ArrayLike<number>, start = 0, end = xy.length / 2): LineFit | null {
  const n = end - start;
  if (n < 2) return null;
  let mx = 0;
  let my = 0;
  for (let i = start; i < end; i++) {
    mx += xy[2 * i];
    my += xy[2 * i + 1];
  }
  mx /= n;
  my /= n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = start; i < end; i++) {
    const x = xy[2 * i] - mx;
    const y = xy[2 * i + 1] - my;
    sxx += x * x; sxy += x * y; syy += y * y;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let maxResidual = 0;
  for (let i = start; i < end; i++) {
    const res = Math.abs(-(xy[2 * i] - mx) * dy + (xy[2 * i + 1] - my) * dx);
    if (res > maxResidual) maxResidual = res;
  }
  return { px: mx, py: my, dx, dy, maxResidual };
}

/** Signed area of a closed 2D polygon (flat xy), positive when CCW. */
export function polygonSignedArea(xy: ArrayLike<number>): number {
  const n = xy.length / 2;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    s += xy[2 * i] * xy[2 * j + 1] - xy[2 * j] * xy[2 * i + 1];
  }
  return s / 2;
}

/** Area-weighted centroid moments of a closed polygon: `{ area, cx, cy }`
 *  with signed area (CCW positive). */
export function polygonMoments(xy: ArrayLike<number>): { area: number; cx: number; cy: number } {
  const n = xy.length / 2;
  let a = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x0 = xy[2 * i], y0 = xy[2 * i + 1], x1 = xy[2 * j], y1 = xy[2 * j + 1];
    const cr = x0 * y1 - x1 * y0;
    a += cr;
    sx += (x0 + x1) * cr;
    sy += (y0 + y1) * cr;
  }
  a /= 2;
  if (Math.abs(a) < 1e-300) return { area: 0, cx: 0, cy: 0 };
  return { area: a, cx: sx / (6 * a), cy: sy / (6 * a) };
}

/** Even-odd point-in-polygon test against a flat xy polygon. */
export function pointInPolygon(x: number, y: number, xy: ArrayLike<number>): boolean {
  const n = xy.length / 2;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = xy[2 * i], yi = xy[2 * i + 1], xj = xy[2 * j], yj = xy[2 * j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from (x, y) to the closest edge of a closed flat-xy polygon. */
export function distanceToPolygon(x: number, y: number, xy: ArrayLike<number>): number {
  const n = xy.length / 2;
  let best = Infinity;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = xy[2 * j], ay = xy[2 * j + 1], bx = xy[2 * i], by = xy[2 * i + 1];
    const ex = bx - ax, ey = by - ay;
    const len2 = ex * ex + ey * ey;
    let t = len2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(ax + t * ex - x, ay + t * ey - y);
    if (d < best) best = d;
  }
  return best;
}

/** Axis-angle (unit axis, degrees) of a proper rotation matrix given as
 *  columns. Returns angle 0 for identity. */
export function rotationToAxisAngle(r: [V3, V3, V3]): { axis: V3; degrees: number } {
  // r = [col0, col1, col2]; element (i, j) = r[j][i].
  const m = (i: number, j: number) => r[j][i];
  const trace = m(0, 0) + m(1, 1) + m(2, 2);
  const cosA = Math.max(-1, Math.min(1, (trace - 1) / 2));
  const angle = Math.acos(cosA);
  if (angle < 1e-9) return { axis: [0, 0, 1], degrees: 0 };
  if (Math.PI - angle < 1e-6) {
    // 180°: axis from the diagonal of (R + I) / 2.
    const xx = (m(0, 0) + 1) / 2, yy = (m(1, 1) + 1) / 2, zz = (m(2, 2) + 1) / 2;
    let axis: V3;
    if (xx >= yy && xx >= zz) {
      const x = Math.sqrt(xx);
      axis = [x, (m(0, 1) + m(1, 0)) / (4 * x), (m(0, 2) + m(2, 0)) / (4 * x)];
    } else if (yy >= zz) {
      const y = Math.sqrt(yy);
      axis = [(m(0, 1) + m(1, 0)) / (4 * y), y, (m(1, 2) + m(2, 1)) / (4 * y)];
    } else {
      const z = Math.sqrt(zz);
      axis = [(m(0, 2) + m(2, 0)) / (4 * z), (m(1, 2) + m(2, 1)) / (4 * z), z];
    }
    return { axis: normalize3(axis), degrees: 180 };
  }
  const s = 2 * Math.sin(angle);
  const axis: V3 = [(m(2, 1) - m(1, 2)) / s, (m(0, 2) - m(2, 0)) / s, (m(1, 0) - m(0, 1)) / s];
  return { axis: normalize3(axis), degrees: (angle * 180) / Math.PI };
}
