// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/kinematics/loopClosure/linearAlgebra.ts
//
// Small dense helpers for the loop solver. Matrices are arrays of
// Float64Array columns (`cols[j][i]` = row i, column j): the Jacobian is
// built one coordinate (column) at a time. Sizes stay below ~60 rows and
// ~30 columns, so clarity wins over speed.

export type Columns = readonly Float64Array[];

export function dotCols(a: Float64Array, b: Float64Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** JᵀJ (n×n, row-major arrays) and Jᵀr. */
export function normalEquations(J: Columns, r: Float64Array): { A: number[][]; g: number[] } {
  const n = J.length;
  const A: number[][] = [];
  const g: number[] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) row.push(j < i ? A[j][i] : dotCols(J[i], J[j]));
    A.push(row);
    g.push(dotCols(J[i], r));
  }
  return { A, g };
}

/** Solve (A + λI) x = b for symmetric positive semi-definite A and λ > 0 by
 *  Cholesky. Returns undefined when the factorisation breaks down. */
export function solveDamped(A: readonly number[][], b: readonly number[], lambda: number): number[] | undefined {
  const n = b.length;
  const L: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j] + (i === j ? lambda : 0);
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (!(s > 0)) return undefined;
        L[i][i] = Math.sqrt(s);
      } else {
        L[i][j] = s / L[j][j];
      }
    }
  }
  const y = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
    y[i] = s / L[i][i];
  }
  const x = new Array<number>(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

/** Eigen-decomposition of a symmetric matrix by cyclic Jacobi rotations.
 *  Deterministic; eigenvalues sorted descending with matching eigenvectors
 *  (each `vectors[k]` is a unit vector). */
export function symmetricEigen(M: readonly number[][]): { values: number[]; vectors: number[][] } {
  const n = M.length;
  const a = M.map((row) => [...row]);
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) jacobiRotate(a, v, p, q);
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => a[j][j] - a[i][i] || i - j);
  return {
    values: order.map((i) => a[i][i]),
    vectors: order.map((i) => v.map((row) => row[i])),
  };
}

function jacobiRotate(a: number[][], v: number[][], p: number, q: number): void {
  const apq = a[p][q];
  if (Math.abs(apq) < 1e-300) return;
  const theta = (a[q][q] - a[p][p]) / (2 * apq);
  const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
  const c = 1 / Math.sqrt(t * t + 1);
  const s = t * c;
  const n = a.length;
  for (let k = 0; k < n; k++) {
    const akp = a[k][p];
    const akq = a[k][q];
    a[k][p] = c * akp - s * akq;
    a[k][q] = s * akp + c * akq;
  }
  for (let k = 0; k < n; k++) {
    const apk = a[p][k];
    const aqk = a[q][k];
    a[p][k] = c * apk - s * aqk;
    a[q][k] = s * apk + c * aqk;
  }
  for (let k = 0; k < n; k++) {
    const vkp = v[k][p];
    const vkq = v[k][q];
    v[k][p] = c * vkp - s * vkq;
    v[k][q] = s * vkp + c * vkq;
  }
}

/** Singular values of J (descending) and right singular vectors. */
export function singularValues(J: Columns): { sigma: number[]; right: number[][] } {
  if (J.length === 0) return { sigma: [], right: [] };
  const { A } = normalEquations(J, new Float64Array(J[0].length));
  const { values, vectors } = symmetricEigen(A);
  return { sigma: values.map((x) => Math.sqrt(Math.max(0, x))), right: vectors };
}

/** Numerical rank: singular values above `relTol · max(1, σmax)`. */
export function numericalRank(sigma: readonly number[], relTol = 1e-6): number {
  const cut = relTol * Math.max(1, sigma[0] ?? 0);
  return sigma.filter((s) => s > cut).length;
}

/** Modified Gram–Schmidt on the columns of J. Returns the orthonormal basis,
 *  or undefined when a column is (numerically) dependent on the previous
 *  ones — the dependent-coordinate Jacobian is then rank deficient. */
export function orthonormalBasis(J: Columns, relTol = 1e-7): Float64Array[] | undefined {
  const q: Float64Array[] = [];
  let scale = 0;
  for (const c of J) scale = Math.max(scale, Math.sqrt(dotCols(c, c)));
  for (const c of J) {
    const w = Float64Array.from(c);
    for (const e of q) {
      const d = dotCols(e, w);
      for (let i = 0; i < w.length; i++) w[i] -= d * e[i];
    }
    const len = Math.sqrt(dotCols(w, w));
    if (!(len > relTol * Math.max(scale, 1e-12))) return undefined;
    for (let i = 0; i < w.length; i++) w[i] /= len;
    q.push(w);
  }
  return q;
}

/** det(Qᵀ J) for an orthonormal basis Q with as many columns as J. */
export function projectedDeterminant(Q: Columns, J: Columns): number {
  const n = J.length;
  const m: number[][] = Q.map((qi) => J.map((jc) => dotCols(qi, jc)));
  return determinant(m, n);
}

function determinant(m: number[][], n: number): number {
  let det = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (m[p][c] === 0) return 0;
    if (p !== c) {
      [m[p], m[c]] = [m[c], m[p]];
      det = -det;
    }
    det *= m[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let k = c; k < n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return det;
}
