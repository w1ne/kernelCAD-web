// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/remoteLoad.ts
//
// Turn a remote wrench (force + moment about a point) into statically
// equivalent nodal forces on a set of nodes. CalculiX's C3D10 has only
// translational DOFs, so a moment is carried as a force couple rather than a
// rotational load. The distribution is the minimum-norm solution of
//   sum f_i = F,   sum (r_i - point) x f_i = M.
// For a rigid joint patch this is the same resultant as an RBE-like remote
// load; it is not a claim that the patch really is rigid.

import type { Vec3 } from '../../shared/intent/types';

export interface RemoteLoadNode {
  readonly id: number;
  readonly at: readonly [number, number, number];
}

export interface EquivalentNodalForce {
  readonly node: number;
  readonly force: readonly [number, number, number];
}

const norm = (v: readonly [number, number, number]): number => Math.hypot(v[0], v[1], v[2]);

/** Solve a small dense system by Gauss-Jordan with partial pivoting. */
function solve(A: number[][], b: number[]): number[] | undefined {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[pivot]![c]!)) pivot = r;
    if (Math.abs(M[pivot]![c]!) < 1e-12) return undefined;
    [M[c], M[pivot]] = [M[pivot]!, M[c]!];
    const d = M[c]![c]!;
    for (let j = c; j <= n; j++) M[c]![j]! /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]!;
      if (f !== 0) for (let j = c; j <= n; j++) M[r]![j]! -= f * M[c]![j]!;
    }
  }
  return M.map((row) => row[n]!);
}

/**
 * Equivalent nodal forces for `force` (N) and `moment` (N·mm) about
 * `pointMm`, distributed over `nodes` (mm). Returns undefined when the node
 * set cannot represent the wrench (an empty set or all nodes collinear).
 * A pure force keeps the existing uniform split, so force-only decks are
 * byte-identical to before.
 */
export function equivalentRemoteLoad(
  nodes: readonly RemoteLoadNode[],
  pointMm: readonly [number, number, number],
  force: readonly [number, number, number],
  moment: readonly [number, number, number],
): EquivalentNodalForce[] | undefined {
  if (nodes.length === 0) return undefined;
  if (norm(moment) <= 1e-12) {
    const n = nodes.length;
    return nodes.map((node) => ({ node: node.id, force: [force[0] / n, force[1] / n, force[2] / n] as const }));
  }
  const r = nodes.map((node): Vec3 => [
    node.at[0] - pointMm[0],
    node.at[1] - pointMm[1],
    node.at[2] - pointMm[2],
  ]);
  const N = nodes.length;
  const cols = 3 * N;
  // A maps nodal forces to the wrench: rows 0-2 sum force, rows 3-5 sum
  // (r - point) x f. The minimum-norm solution is f = A^T (A A^T)^-1 w.
  const A = Array.from({ length: 6 }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < N; i++) {
    const [x, y, z] = r[i]!;
    const c = 3 * i;
    A[0]![c] = 1; A[1]![c + 1] = 1; A[2]![c + 2] = 1;
    A[3]![c + 1] = -z; A[3]![c + 2] = y;
    A[4]![c] = z; A[4]![c + 2] = -x;
    A[5]![c] = -y; A[5]![c + 1] = x;
  }
  const G = Array.from({ length: 6 }, () => new Array<number>(6).fill(0));
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      let v = 0;
      for (let k = 0; k < cols; k++) v += A[i]![k]! * A[j]![k]!;
      G[i]![j] = v;
    }
  }
  const y = solve(G, [force[0], force[1], force[2], moment[0], moment[1], moment[2]]);
  if (y === undefined) return undefined;
  return nodes.map((node, i) => {
    const c = 3 * i;
    const f = [0, 0, 0];
    for (let d = 0; d < 3; d++) {
      let v = 0;
      for (let row = 0; row < 6; row++) v += A[row]![c + d]! * y[row]!;
      f[d] = v;
    }
    return { node: node.id, force: [f[0], f[1], f[2]] as const };
  });
}
