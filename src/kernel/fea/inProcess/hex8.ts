// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/inProcess/hex8.ts
//
// The one element the in-process solver uses: an axis-aligned 8-node brick
// with Wilson-Taylor incompatible modes (the C3D8I formulation), statically
// condensed to 24 dofs.
//
// Why incompatible modes: the plain trilinear brick shear-locks in bending, so
// a cantilever two or three bricks thick comes out several times too stiff.
// The nine bubble modes (1 - xi^2 etc.) let each brick bend; for rectangular
// bricks they pass the patch test and reproduce pure bending exactly, which is
// what makes a coarse voxel mesh usable for real brackets and beams.
//
// Every voxel of a grid has the same size, so the 24x24 stiffness and the
// corner stress-recovery operators are computed ONCE per solve.

/** Natural coordinates of the 8 corners, in local node order. */
export const HEX8_CORNERS: ReadonlyArray<readonly [number, number, number]> = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];

/** Isotropic elasticity matrix (Voigt order xx, yy, zz, xy, yz, zx). */
export function elasticityMatrix(E: number, nu: number): number[][] {
  const lam = (E * nu) / ((1 + nu) * (1 - 2 * nu));
  const mu = E / (2 * (1 + nu));
  const d = (i: number, j: number): number => {
    if (i < 3 && j < 3) return i === j ? lam + 2 * mu : lam;
    return i === j ? mu : 0;
  };
  return Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => d(i, j)));
}

/** Compatible strain-displacement matrix (6 x 24) at a natural point. */
function bMatrix(xi: number, eta: number, zeta: number, h: readonly [number, number, number]): number[][] {
  const B = Array.from({ length: 6 }, () => new Array<number>(24).fill(0));
  for (let n = 0; n < 8; n++) {
    const [a, b, c] = HEX8_CORNERS[n];
    const dx = (a * (1 + b * eta) * (1 + c * zeta)) / 8 * (2 / h[0]);
    const dy = (b * (1 + a * xi) * (1 + c * zeta)) / 8 * (2 / h[1]);
    const dz = (c * (1 + a * xi) * (1 + b * eta)) / 8 * (2 / h[2]);
    const k = 3 * n;
    B[0][k] = dx;
    B[1][k + 1] = dy;
    B[2][k + 2] = dz;
    B[3][k] = dy; B[3][k + 1] = dx;
    B[4][k + 1] = dz; B[4][k + 2] = dy;
    B[5][k] = dz; B[5][k + 2] = dx;
  }
  return B;
}

/** Incompatible-mode strain matrix (6 x 9). Internal dof order:
 *  [u1 u2 u3 v1 v2 v3 w1 w2 w3], mode k = 1 - (xi, eta, zeta)[k]^2. */
function gMatrix(xi: number, eta: number, zeta: number, h: readonly [number, number, number]): number[][] {
  const p = [(-2 * xi * 2) / h[0], (-2 * eta * 2) / h[1], (-2 * zeta * 2) / h[2]];
  const G = Array.from({ length: 6 }, () => new Array<number>(9).fill(0));
  // u-modes
  G[0][0] = p[0]; G[3][1] = p[1]; G[5][2] = p[2];
  // v-modes
  G[3][3] = p[0]; G[1][4] = p[1]; G[4][5] = p[2];
  // w-modes
  G[5][6] = p[0]; G[4][7] = p[1]; G[2][8] = p[2];
  return G;
}

function mul(A: number[][], B: number[][]): number[][] {
  return A.map(row => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
}

const transpose = (A: number[][]): number[][] => A[0].map((_, j) => A.map(row => row[j]));

function addInto(T: number[][], S: number[][], w: number): void {
  for (let i = 0; i < T.length; i++) for (let j = 0; j < T[0].length; j++) T[i][j] += w * S[i][j];
}

/** Solve A X = B for X (A square, small) by Gauss-Jordan with pivoting. */
export function solveSmall(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...B[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c];
    for (let j = c; j < M[c].length; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (f !== 0) for (let j = c; j < M[r].length; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map(row => row.slice(n));
}

export interface Hex8Operators {
  /** Condensed 24x24 element stiffness, row-major. */
  ke: Float64Array;
  /** Per corner n (0..7): 6x24 stress-recovery operator, row-major, so the
   *  corner stress is R_n u_e (incompatible modes included). */
  cornerStress: Float64Array[];
}

/**
 * Element operators for a brick of size h = [hx, hy, hz] mm, modulus E MPa,
 * Poisson nu: 2x2x2 Gauss integration, then static condensation of the nine
 * incompatible modes.
 */
export function hex8Operators(h: readonly [number, number, number], E: number, nu: number): Hex8Operators {
  const D = elasticityMatrix(E, nu);
  const detJ = (h[0] * h[1] * h[2]) / 8;
  const g = 1 / Math.sqrt(3);
  const Kuu = Array.from({ length: 24 }, () => new Array<number>(24).fill(0));
  const Kua = Array.from({ length: 24 }, () => new Array<number>(9).fill(0));
  const Kaa = Array.from({ length: 9 }, () => new Array<number>(9).fill(0));
  for (const [a, b, c] of HEX8_CORNERS) {
    const B = bMatrix(a * g, b * g, c * g, h);
    const G = gMatrix(a * g, b * g, c * g, h);
    const DB = mul(D, B);
    const DG = mul(D, G);
    addInto(Kuu, mul(transpose(B), DB), detJ);
    addInto(Kua, mul(transpose(B), DG), detJ);
    addInto(Kaa, mul(transpose(G), DG), detJ);
  }
  // alpha = -Kaa^-1 Kau u  ->  K = Kuu - Kua Kaa^-1 Kau
  const KaaInvKau = solveSmall(Kaa, transpose(Kua)); // 9 x 24
  const corr = mul(Kua, KaaInvKau);
  const ke = new Float64Array(576);
  for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) ke[i * 24 + j] = Kuu[i][j] - corr[i][j];
  const cornerStress = HEX8_CORNERS.map(([a, b, c]) => {
    const B = bMatrix(a, b, c, h);
    const G = gMatrix(a, b, c, h);
    const GA = mul(G, KaaInvKau); // 6 x 24
    const eff = B.map((row, i) => row.map((v, j) => v - GA[i][j]));
    const R = mul(D, eff);
    return Float64Array.from(R.flat());
  });
  return { ke, cornerStress };
}

/** Von Mises equivalent of a Voigt stress [sxx, syy, szz, sxy, syz, szx]. */
export function vonMises(s: ArrayLike<number>): number {
  const [xx, yy, zz, xy, yz, zx] = [s[0], s[1], s[2], s[3], s[4], s[5]];
  return Math.sqrt(0.5 * ((xx - yy) ** 2 + (yy - zz) ** 2 + (zz - xx) ** 2) + 3 * (xy ** 2 + yz ** 2 + zx ** 2));
}
