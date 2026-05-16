// src/lib/numeric/jacobian.ts
//
// Small-matrix helpers for the v0.6 mate solver (T7 — Newton-Raphson
// closed-loop solver). Pure-TS, no external numerical library. Targets
// matrices up to ~30×30 (the largest realistic kernelCAD closed-loop
// assembly). Numerical robustness over peak throughput — partial-pivot
// LU for inverse / linear solve, central-difference Jacobian.

/** Square matrix inverse via LU decomposition with partial pivoting.
 *  Throws `Error` on singular / near-singular input. */
export function invertSquare(m: number[][]): number[][] {
  const n = m.length;
  if (n === 0 || m.some((row) => row.length !== n)) {
    throw new Error(`invertSquare: expected square matrix; got ${n}×${m[0]?.length ?? 0}`);
  }
  // Augment [A | I] and reduce A side to I; right side becomes A^{-1}.
  const a: number[][] = m.map((row, i) => {
    const ext = new Array<number>(2 * n);
    for (let j = 0; j < n; j++) ext[j] = row[j];
    for (let j = 0; j < n; j++) ext[n + j] = i === j ? 1 : 0;
    return ext;
  });

  for (let col = 0; col < n; col++) {
    // Partial pivot: pick row with max |a[row][col]| from col..n-1.
    let pivot = col;
    let pivotAbs = Math.abs(a[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(a[r][col]);
      if (v > pivotAbs) {
        pivotAbs = v;
        pivot = r;
      }
    }
    if (pivotAbs < 1e-14) {
      throw new Error(`invertSquare: matrix is singular (pivot ${pivotAbs} at col ${col})`);
    }
    if (pivot !== col) {
      const tmp = a[col];
      a[col] = a[pivot];
      a[pivot] = tmp;
    }
    // Scale pivot row so a[col][col] = 1.
    const inv = 1 / a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] *= inv;
    // Eliminate other rows.
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= factor * a[col][j];
    }
  }

  return a.map((row) => row.slice(n));
}

/** Solve `A x = b` for `A` (m×n) and `b` (length m). For square `A`
 *  uses `invertSquare`; otherwise uses normal equations
 *  `x = (AᵀA)⁻¹ Aᵀ b`. Throws if `AᵀA` is singular (underdetermined or
 *  rank-deficient — caller's responsibility to handle). */
export function solveLeastSquares(A: number[][], b: number[]): number[] {
  const m = A.length;
  if (m === 0) return [];
  const n = A[0].length;
  if (b.length !== m) {
    throw new Error(`solveLeastSquares: b length ${b.length} != A rows ${m}`);
  }
  if (m === n) {
    const inv = invertSquare(A);
    return matVec(inv, b);
  }
  // Normal equations: AᵀA x = Aᵀ b.
  const At = transpose(A);
  const AtA = matMul(At, A);
  const Atb = matVec(At, b);
  const inv = invertSquare(AtA);
  return matVec(inv, Atb);
}

/** Finite-difference Jacobian of `f` at `x` with step `eps`.
 *  Central-difference for accuracy: J[i][j] ≈ (f(x+eps·e_j) - f(x-eps·e_j)) / (2·eps).
 *  `f` must map R^n -> R^m; the returned matrix is m×n. */
export function finiteDiffJacobian(
  f: (x: number[]) => number[],
  x: number[],
  eps: number = 1e-6,
): number[][] {
  const n = x.length;
  const f0 = f(x);
  const m = f0.length;
  const J: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let j = 0; j < n; j++) {
    const xp = x.slice();
    const xm = x.slice();
    xp[j] = x[j] + eps;
    xm[j] = x[j] - eps;
    const fp = f(xp);
    const fm = f(xm);
    const inv2eps = 1 / (2 * eps);
    for (let i = 0; i < m; i++) J[i][j] = (fp[i] - fm[i]) * inv2eps;
  }
  return J;
}

/** L2 norm of a vector. */
export function norm2(v: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}

/** Vector subtraction `a - b`. */
export function sub(a: readonly number[], b: readonly number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`sub: length mismatch ${a.length} vs ${b.length}`);
  }
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] - b[i];
  return out;
}

// --- internal helpers ---------------------------------------------------

function transpose(A: number[][]): number[][] {
  const m = A.length;
  const n = A[0].length;
  const T: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) T[j][i] = A[i][j];
  return T;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const k = A[0].length;
  const n = B[0].length;
  if (B.length !== k) {
    throw new Error(`matMul: A cols ${k} != B rows ${B.length}`);
  }
  const C: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let p = 0; p < k; p++) {
      const aip = A[i][p];
      if (aip === 0) continue;
      for (let j = 0; j < n; j++) C[i][j] += aip * B[p][j];
    }
  }
  return C;
}

function matVec(A: number[][], v: readonly number[]): number[] {
  const m = A.length;
  const n = A[0].length;
  if (v.length !== n) {
    throw new Error(`matVec: A cols ${n} != v length ${v.length}`);
  }
  const out = new Array<number>(m).fill(0);
  for (let i = 0; i < m; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * v[j];
    out[i] = s;
  }
  return out;
}
