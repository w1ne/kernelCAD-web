// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/inProcess/voxelSolve.ts
//
// Linear-static solve on a voxel grid: node numbering, a matrix-free
// Jacobi-preconditioned conjugate-gradient solve of K u = f with fixed nodes
// eliminated, and nodal von Mises from the bricks' corner stresses.
//
// Matrix-free because every brick shares one 24x24 stiffness: K u is a loop
// over bricks (gather 24 dofs, multiply, scatter), so memory is a few arrays
// of length 3 x nodes and no sparse assembly is needed.

import { HEX8_CORNERS, hex8Operators, vonMises } from './hex8';
import type { VoxelGrid } from './voxelize';

export interface VoxelModel {
  grid: VoxelGrid;
  /** Node coordinates, xyz triples, compact numbering. */
  coords: Float64Array;
  nodeCount: number;
  /** Per brick, its 8 compact node ids (HEX8_CORNERS order). */
  elemNodes: Int32Array;
  elementCount: number;
}

/** Number the corners of every solid brick compactly. */
export function buildVoxelModel(grid: VoxelGrid): VoxelModel {
  const [nx, ny, nz] = grid.n;
  const lattice = new Int32Array((nx + 1) * (ny + 1) * (nz + 1)).fill(-1);
  const elemNodes = new Int32Array(grid.solidCount * 8);
  const coordList: number[] = [];
  let e = 0;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (grid.solid[i + nx * (j + ny * k)] !== 1) continue;
    HEX8_CORNERS.forEach(([a, b, c], corner) => {
      const ii = i + (a + 1) / 2, jj = j + (b + 1) / 2, kk = k + (c + 1) / 2;
      const key = ii + (nx + 1) * (jj + (ny + 1) * kk);
      if (lattice[key] < 0) {
        lattice[key] = coordList.length / 3;
        coordList.push(grid.origin[0] + ii * grid.h[0], grid.origin[1] + jj * grid.h[1], grid.origin[2] + kk * grid.h[2]);
      }
      elemNodes[8 * e + corner] = lattice[key];
    });
    e++;
  }
  return { grid, coords: Float64Array.from(coordList), nodeCount: coordList.length / 3, elemNodes, elementCount: e };
}

export interface VoxelSolveInput {
  model: VoxelModel;
  E: number;
  nu: number;
  /** Compact ids of fully fixed nodes. */
  fixedNodes: ReadonlySet<number>;
  /** Nodal force vector, length 3 x nodeCount, N. */
  force: Float64Array;
  /** Relative residual target (default 1e-6: displacement and stress to well under 0.1 %). */
  tolerance?: number;
  /** Wall-clock budget for the iteration, ms. */
  timeoutMs?: number;
}

export interface VoxelSolveResult {
  converged: boolean;
  iterations: number;
  relResidual: number;
  /** Nodal displacement, xyz triples, mm. */
  u: Float64Array;
  /** Nodal von Mises (average of the corner values of the bricks sharing the node), MPa. */
  vonMises: Float64Array;
  /** Reaction at the fixed nodes, summed, N. */
  reaction: [number, number, number];
  solveMs: number;
}

/** The 24 global dof indices of every brick, flattened. */
const elementDofCache = new WeakMap<VoxelModel, Int32Array>();
function elementDofs(model: VoxelModel): Int32Array {
  let out = elementDofCache.get(model);
  if (out !== undefined) return out;
  out = new Int32Array(24 * model.elementCount);
  for (let e = 0; e < model.elementCount; e++) {
    for (let c = 0; c < 8; c++) {
      const n = model.elemNodes[8 * e + c];
      for (let d = 0; d < 3; d++) out[24 * e + 3 * c + d] = 3 * n + d;
    }
  }
  elementDofCache.set(model, out);
  return out;
}

/** y = K x over every brick (no constraint handling). The hot loop of the
 *  whole solver: one 24x24 multiply per brick per CG iteration. */
function applyK(model: VoxelModel, ke: Float64Array, x: Float64Array, y: Float64Array): void {
  y.fill(0);
  const dofs = elementDofs(model);
  const ue = new Float64Array(24);
  for (let e = 0, base = 0; e < model.elementCount; e++, base += 24) {
    for (let q = 0; q < 24; q++) ue[q] = x[dofs[base + q]];
    for (let r = 0, row = 0; r < 24; r++, row += 24) {
      let s = 0;
      for (let q = 0; q < 24; q++) s += ke[row + q] * ue[q];
      y[dofs[base + r]] += s;
    }
  }
}

function dot(a: Float64Array, b: Float64Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Jacobi preconditioner: inverse of K's diagonal, zero on fixed dofs. */
function inverseDiagonal(model: VoxelModel, ke: Float64Array, free: Uint8Array): Float64Array {
  const diag = new Float64Array(3 * model.nodeCount);
  for (let e = 0; e < model.elementCount; e++) {
    for (let c = 0; c < 8; c++) {
      const n = model.elemNodes[8 * e + c];
      for (let d = 0; d < 3; d++) diag[3 * n + d] += ke[(3 * c + d) * 25];
    }
  }
  return diag.map((v, i) => (free[i] === 1 && v > 0 ? 1 / v : 0));
}

interface CgState { x: Float64Array; r: Float64Array; z: Float64Array; p: Float64Array; q: Float64Array }

/** Preconditioned CG on the free dofs. */
function conjugateGradient(
  model: VoxelModel,
  ke: Float64Array,
  f: Float64Array,
  free: Uint8Array,
  opts: { tolerance: number; deadline: number },
): { x: Float64Array; converged: boolean; iterations: number; relResidual: number } {
  const size = f.length;
  const minv = inverseDiagonal(model, ke, free);
  const s: CgState = {
    x: new Float64Array(size),
    r: f.map((v, i) => v * free[i]),
    z: new Float64Array(size),
    p: new Float64Array(size),
    q: new Float64Array(size),
  };
  const fNorm = Math.sqrt(dot(s.r, s.r)) || 1;
  for (let i = 0; i < size; i++) { s.z[i] = minv[i] * s.r[i]; s.p[i] = s.z[i]; }
  let rz = dot(s.r, s.z);
  const maxIter = Math.max(1000, 20 * Math.cbrt(size) ** 2);
  for (let it = 1; it <= maxIter; it++) {
    applyK(model, ke, s.p, s.q);
    for (let i = 0; i < size; i++) s.q[i] *= free[i];
    const alpha = rz / dot(s.p, s.q);
    for (let i = 0; i < size; i++) { s.x[i] += alpha * s.p[i]; s.r[i] -= alpha * s.q[i]; }
    const rel = Math.sqrt(dot(s.r, s.r)) / fNorm;
    if (rel < opts.tolerance) return { x: s.x, converged: true, iterations: it, relResidual: rel };
    if (!Number.isFinite(rel) || Date.now() > opts.deadline) return { x: s.x, converged: false, iterations: it, relResidual: rel };
    for (let i = 0; i < size; i++) s.z[i] = minv[i] * s.r[i];
    const rzNew = dot(s.r, s.z);
    const beta = rzNew / rz;
    rz = rzNew;
    for (let i = 0; i < size; i++) s.p[i] = s.z[i] + beta * s.p[i];
  }
  const rel = Math.sqrt(dot(s.r, s.r)) / fNorm;
  return { x: s.x, converged: false, iterations: maxIter, relResidual: rel };
}

/** Nodal von Mises: corner stresses of each brick, averaged per node. */
function nodalVonMises(model: VoxelModel, cornerStress: Float64Array[], u: Float64Array): Float64Array {
  const sum = new Float64Array(model.nodeCount);
  const count = new Float64Array(model.nodeCount);
  const ue = new Float64Array(24);
  const sig = new Float64Array(6);
  for (let e = 0; e < model.elementCount; e++) {
    for (let c = 0; c < 8; c++) {
      const n = model.elemNodes[8 * e + c];
      for (let d = 0; d < 3; d++) ue[3 * c + d] = u[3 * n + d];
    }
    for (let c = 0; c < 8; c++) {
      const R = cornerStress[c];
      for (let r = 0; r < 6; r++) {
        let s = 0;
        for (let q = 0; q < 24; q++) s += R[r * 24 + q] * ue[q];
        sig[r] = s;
      }
      const n = model.elemNodes[8 * e + c];
      sum[n] += vonMises(sig);
      count[n] += 1;
    }
  }
  return sum.map((v, i) => (count[i] > 0 ? v / count[i] : 0));
}

/** Solve the voxel model for one load case. */
export function solveVoxelModel(input: VoxelSolveInput): VoxelSolveResult {
  const started = Date.now();
  const { model } = input;
  const ops = hex8Operators(model.grid.h, input.E, input.nu);
  const free = new Uint8Array(3 * model.nodeCount).fill(1);
  for (const n of input.fixedNodes) free[3 * n] = free[3 * n + 1] = free[3 * n + 2] = 0;
  const cg = conjugateGradient(model, ops.ke, input.force, free, {
    tolerance: input.tolerance ?? 1e-6,
    deadline: started + (input.timeoutMs ?? 120_000),
  });
  // Reaction = K u at the fixed dofs (where u = 0 and the external load is absorbed).
  const ku = new Float64Array(cg.x.length);
  applyK(model, ops.ke, cg.x, ku);
  const reaction: [number, number, number] = [0, 0, 0];
  for (const n of input.fixedNodes) for (let d = 0; d < 3; d++) reaction[d] += ku[3 * n + d] - input.force[3 * n + d];
  return {
    converged: cg.converged,
    iterations: cg.iterations,
    relResidual: cg.relResidual,
    u: cg.x,
    vonMises: nodalVonMises(model, ops.cornerStress, cg.x),
    reaction,
    solveMs: Date.now() - started,
  };
}
