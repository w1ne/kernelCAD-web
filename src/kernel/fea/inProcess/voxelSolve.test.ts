// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { buildVoxelModel, solveVoxelModel } from './voxelSolve';
import { keepLargestFaceConnected, voxelize, type VoxelGrid } from './voxelize';
import { hex8Operators } from './hex8';

function fullGrid(n: [number, number, number], size: [number, number, number]): VoxelGrid {
  const count = n[0] * n[1] * n[2];
  return {
    origin: [0, 0, 0],
    h: [size[0] / n[0], size[1] / n[1], size[2] / n[2]],
    n,
    solid: new Uint8Array(count).fill(1),
    solidCount: count,
  };
}

/** 100 x 10 x 10 mm steel cantilever, clamped at x = 0, 100 N down at the tip. */
function cantilever(n: [number, number, number]) {
  const model = buildVoxelModel(fullGrid(n, [100, 10, 10]));
  const fixed = new Set<number>();
  const tip: number[] = [];
  for (let i = 0; i < model.nodeCount; i++) {
    const x = model.coords[3 * i];
    if (x < 1e-9) fixed.add(i);
    if (x > 100 - 1e-9) tip.push(i);
  }
  const force = new Float64Array(3 * model.nodeCount);
  for (const i of tip) force[3 * i + 2] = -100 / tip.length;
  return { model, solved: solveVoxelModel({ model, E: 200_000, nu: 0.3, fixedNodes: fixed, force }) };
}

describe('in-process voxel solver', () => {
  it('element stiffness has six rigid-body modes (translations carry no energy)', () => {
    const { ke } = hex8Operators([2, 3, 4], 200_000, 0.3);
    for (let d = 0; d < 3; d++) {
      for (let r = 0; r < 24; r++) {
        let s = 0;
        for (let c = 0; c < 8; c++) s += ke[r * 24 + 3 * c + d];
        expect(Math.abs(s)).toBeLessThan(1e-6);
      }
    }
  });

  it.each([[[20, 2, 2]], [[40, 4, 4]]] as Array<[[number, number, number]]>)(
    'matches Euler-Bernoulli on a cantilever, even two bricks thick (%j)',
    (n) => {
      const { model, solved } = cantilever(n);
      expect(solved.converged).toBe(true);
      // delta = F L^3 / (3 E I), I = 10^4 / 12: 0.2 mm (shear adds well under 1 %).
      let tipDisp = 0;
      for (let i = 0; i < model.nodeCount; i++) tipDisp = Math.max(tipDisp, Math.abs(solved.u[3 * i + 2]));
      expect(tipDisp).toBeGreaterThan(0.198);
      expect(tipDisp).toBeLessThan(0.203);
      // Bending stress at mid-span on the top fibre: M c / I = 100 * 50 * 5 / 833.3 = 30 MPa.
      let mid = 0;
      for (let i = 0; i < model.nodeCount; i++) {
        if (Math.abs(model.coords[3 * i] - 50) < 1e-6 && Math.abs(model.coords[3 * i + 2] - 10) < 1e-6) mid = Math.max(mid, solved.vonMises[i]);
      }
      expect(mid).toBeGreaterThan(29.5);
      expect(mid).toBeLessThan(30.5);
      // Equilibrium: the clamp reacts the full load.
      expect(solved.reaction[2]).toBeCloseTo(100, 4);
    },
  );

  it('voxelizes a closed triangle surface by its cell centres', () => {
    // Unit-cube surface scaled to 10 mm: 12 triangles.
    const p = [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 10, 10, 0, 10, 10, 10, 10, 0, 10, 10];
    const f = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
    const grid = voxelize({ positions: p, indices: f }, { min: [0, 0, 0], max: [10, 10, 10], size: 2 });
    expect(grid.n).toEqual([5, 5, 5]);
    expect(grid.solidCount).toBe(125);
  });

  it('drops bricks joined to the body only along an edge (a hinge)', () => {
    const grid = fullGrid([3, 3, 1], [3, 3, 1]);
    grid.solid.fill(0);
    grid.solid[0] = 1; grid.solid[1] = 1; // face-joined pair
    grid.solid[1 + 3 * 1 + 1] = 1;        // (2,1): touches (1,0) only along an edge
    grid.solidCount = 3;
    expect(keepLargestFaceConnected(grid)).toBe(1);
    expect(grid.solidCount).toBe(2);
  });
});
