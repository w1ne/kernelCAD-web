// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Linear algebra for the constraint solver: the sparse normal equations
// J^T J (+ damping) dx = -J^T r in skyline storage with a Cholesky solve, and a
// dense rank estimate of J for degrees-of-freedom reporting.
import type { Program } from "./residualProgram";

/** Rank analysis builds a dense Jacobian; skip it above this many entries. */
const RANK_ANALYSIS_MAX_CELLS = 250_000;

/** Symmetric positive-definite system stored as a skyline (profile): row i holds
 *  columns first[i]..i. Chains of constraints order into a narrow band, so
 *  factorisation costs ~O(n) there and falls back to dense O(n^3) only when
 *  the constraint graph really is dense. */
export interface Skyline {
    n: number;
    first: Int32Array;
    rows: Float64Array[];
}

export function buildSkyline(prog: Program): Skyline {
    const n = prog.x0.length;
    const first = new Int32Array(n);
    for (let i = 0; i < n; i++) first[i] = i;
    for (const c of prog.constraints) {
        if (c.vars.length === 0) continue;
        // vars are ascending, so vars[0] is the leftmost column this block couples.
        const lo = c.vars[0];
        for (const v of c.vars) if (lo < first[v]) first[v] = lo;
    }
    const rows: Float64Array[] = [];
    for (let i = 0; i < n; i++) rows.push(new Float64Array(i - first[i] + 1));
    return { n, first, rows };
}

/** A = J^T J into the skyline and g = J^T r, from the per-constraint blocks. */
export function assembleNormalEquations(prog: Program, sky: Skyline, r: Float64Array, g: Float64Array): void {
    for (const row of sky.rows) row.fill(0);
    g.fill(0);
    for (const c of prog.constraints) {
        const k = c.vars.length;
        for (let a = 0; a < k; a++) {
            const va = c.vars[a];
            let grad = 0;
            for (let i = 0; i < c.n; i++) grad += c.block[i * k + a] * r[c.row + i];
            g[va] += grad;
            for (let b = 0; b <= a; b++) {
                let dot = 0;
                for (let i = 0; i < c.n; i++) dot += c.block[i * k + a] * c.block[i * k + b];
                // vars are ascending, so va >= vb: row va, column vb.
                sky.rows[va][c.vars[b] - sky.first[va]] += dot;
            }
        }
    }
}

export function skylineDiagonal(sky: Skyline, i: number): number {
    return sky.rows[i][i - sky.first[i]];
}

/** In-place Cholesky of the skyline matrix. Returns the ratio of the smallest to
 *  the largest pivot (a cheap conditioning estimate, 1 = perfectly conditioned),
 *  or -1 if the matrix is not positive definite. */
export function factorSkyline(sky: Skyline): number {
    const { n, first, rows } = sky;
    let minPivot = Infinity;
    let maxPivot = 0;
    for (let i = 0; i < n; i++) {
        const fi = first[i];
        const Li = rows[i];
        for (let j = fi; j <= i; j++) {
            const fj = first[j];
            const Lj = rows[j];
            let sum = Li[j - fi];
            for (let k = Math.max(fi, fj); k < j; k++) sum -= Li[k - fi] * Lj[k - fj];
            if (j < i) {
                Li[j - fi] = sum / Lj[j - fj];
                continue;
            }
            if (!(sum > 0)) return -1;
            const pivot = Math.sqrt(sum);
            Li[j - fi] = pivot;
            minPivot = Math.min(minPivot, pivot);
            maxPivot = Math.max(maxPivot, pivot);
        }
    }
    return maxPivot > 0 ? minPivot / maxPivot : 1;
}

/** Solve (L L^T) x = b in place of b, given the factor from factorSkyline. */
export function solveSkyline(sky: Skyline, b: Float64Array): void {
    const { n, first, rows } = sky;
    for (let i = 0; i < n; i++) {
        const fi = first[i];
        let sum = b[i];
        for (let k = fi; k < i; k++) sum -= rows[i][k - fi] * b[k];
        b[i] = sum / rows[i][i - fi];
    }
    for (let i = n - 1; i >= 0; i--) {
        const fi = first[i];
        b[i] /= rows[i][i - fi];
        for (let k = fi; k < i; k++) b[k] -= rows[i][k - fi] * b[i];
    }
}

interface DenseMatrix { data: Float64Array; rows: number; cols: number; biggest: number }

function denseJacobian(prog: Program, nVars: number): DenseMatrix {
    const rows = prog.residualCount;
    const data = new Float64Array(rows * nVars);
    let biggest = 0;
    for (const c of prog.constraints) {
        const k = c.vars.length;
        for (let i = 0; i < c.n; i++) {
            for (let j = 0; j < k; j++) {
                const value = c.block[i * k + j];
                data[(c.row + i) * nVars + c.vars[j]] = value;
                biggest = Math.max(biggest, Math.abs(value));
            }
        }
    }
    return { data, rows, cols: nVars, biggest };
}

/** Largest entry of the trailing submatrix starting at (step, step) above `floor`. */
function findPivot(M: DenseMatrix, step: number, floor: number): [number, number] | null {
    let best = floor;
    let found: [number, number] | null = null;
    for (let i = step; i < M.rows; i++) {
        for (let j = step; j < M.cols; j++) {
            const a = Math.abs(M.data[i * M.cols + j]);
            if (a > best) { best = a; found = [i, j]; }
        }
    }
    return found;
}

function swapRows(M: DenseMatrix, a: number, b: number): void {
    if (a === b) return;
    for (let j = 0; j < M.cols; j++) {
        const t = M.data[a * M.cols + j];
        M.data[a * M.cols + j] = M.data[b * M.cols + j];
        M.data[b * M.cols + j] = t;
    }
}

function swapCols(M: DenseMatrix, a: number, b: number): void {
    if (a === b) return;
    for (let i = 0; i < M.rows; i++) {
        const t = M.data[i * M.cols + a];
        M.data[i * M.cols + a] = M.data[i * M.cols + b];
        M.data[i * M.cols + b] = t;
    }
}

function eliminateBelow(M: DenseMatrix, step: number): void {
    const pivot = M.data[step * M.cols + step];
    for (let i = step + 1; i < M.rows; i++) {
        const f = M.data[i * M.cols + step] / pivot;
        if (f === 0) continue;
        for (let j = step; j < M.cols; j++) M.data[i * M.cols + j] -= f * M.data[step * M.cols + j];
    }
}

/** Numerical rank of the Jacobian (as left in each constraint's block) by
 *  Gaussian elimination with full pivoting, or null when the system is too
 *  large to analyse cheaply. */
export function jacobianRank(prog: Program, nVars: number): number | null {
    if (prog.residualCount === 0 || nVars === 0) return 0;
    if (prog.residualCount * nVars > RANK_ANALYSIS_MAX_CELLS) return null;
    const M = denseJacobian(prog, nVars);
    const floor = 1e-6 * M.biggest;
    let rank = 0;
    for (let step = 0; step < Math.min(M.rows, M.cols); step++) {
        const pivot = findPivot(M, step, floor);
        if (!pivot) break;
        swapRows(M, step, pivot[0]);
        swapCols(M, step, pivot[1]);
        eliminateBelow(M, step);
        rank++;
    }
    return rank;
}
