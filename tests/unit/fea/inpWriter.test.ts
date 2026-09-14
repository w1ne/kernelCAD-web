// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Unit tests for the CalculiX .inp writer. The deck is the only thing the
// solver ever sees, so every contract that makes the answer correct is
// asserted here: C3D10 node ORDER (gmsh and CalculiX disagree on the last
// two midside nodes — get it wrong and the stiffness matrix is garbage),
// force distribution (a study declares a TOTAL force, the deck applies a
// per-node share), and the boundary/material cards.

import { describe, it, expect } from 'vitest';
import { writeInp, GMSH_TO_CCX_TET10 } from '../../../src/kernel/fea/inpWriter';
import type { FeaJobSpec, FeaMesh } from '../../../src/kernel/fea/types';

function mesh(): FeaMesh {
  const nodes = new Map<number, readonly [number, number, number]>();
  // 10 nodes of a single unit tet, ids deliberately non-contiguous.
  const coords: Array<[number, [number, number, number]]> = [
    [1, [0, 0, 0]], [2, [1, 0, 0]], [3, [0, 1, 0]], [4, [0, 0, 1]],
    [5, [0.5, 0, 0]], [6, [0.5, 0.5, 0]], [7, [0, 0.5, 0]],
    [8, [0, 0, 0.5]], [9, [0, 0.5, 0.5]], [10, [0.5, 0, 0.5]],
  ];
  for (const [id, c] of coords) nodes.set(id, c);
  return {
    nodes,
    elements: [{ id: 1, nodes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }],
    surfaces: [],
    quality: { minSICN: 0.7, meanSICN: 0.8, lowQualityCount: 0, lowQualityThreshold: 0.1 },
    meshSize: 1,
  };
}

function job(): FeaJobSpec {
  return {
    mesh: mesh(),
    material: { E: 200000, nu: 0.29, yield: 250 },
    fixed: { name: 'NFIXED', nodes: [1, 3, 4, 7, 8, 9] },
    loads: [{ name: 'tip', set: { name: 'NLOAD0', nodes: [2, 5, 10] }, force: [0, 0, -90] }],
  };
}

describe('writeInp', () => {
  it('reorders gmsh tet10 nodes into CalculiX C3D10 order (last two midsides swap)', () => {
    expect(GMSH_TO_CCX_TET10).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 9, 8]);
    const deck = writeInp(job());
    const line = deck.split('\n').find(l => l.startsWith('1, 1, 2, 3, 4'));
    expect(line).toBe('1, 1, 2, 3, 4, 5, 6, 7, 8, 10, 9');
  });

  it('writes every node with its own id, not an array index', () => {
    const deck = writeInp(job());
    expect(deck).toContain('*NODE, NSET=NALL');
    expect(deck).toContain('10, 0.500000, 0.000000, 0.500000');
    expect(deck).not.toContain('0, 0.000000, 0.000000, 0.000000');
  });

  it('fixes all three translations on the fixed node set', () => {
    const deck = writeInp(job());
    expect(deck).toContain('*BOUNDARY');
    expect(deck).toContain('NFIXED, 1, 3, 0.0');
  });

  it('splits the TOTAL declared force evenly over the loaded nodes', () => {
    const deck = writeInp(job());
    // -90 N over 3 nodes -> -30 N per node on DOF 3; no card for zero comps.
    expect(deck).toContain('NLOAD0, 3, -30');
    expect(deck).not.toMatch(/NLOAD0, 1,/);
    expect(deck).not.toMatch(/NLOAD0, 2,/);
  });

  it('emits the elastic material card in solver units (MPa) and a solid section', () => {
    const deck = writeInp(job());
    expect(deck).toContain('*MATERIAL, NAME=KCMAT');
    expect(deck).toContain('*ELASTIC');
    expect(deck).toContain('200000, 0.29');
    expect(deck).toContain('*SOLID SECTION, ELSET=EALL, MATERIAL=KCMAT');
  });

  it('requests displacement, stress, the error estimator, and fixed-set reactions', () => {
    const deck = writeInp(job());
    expect(deck).toContain('*STATIC');
    expect(deck).toContain('*NODE FILE');
    expect(deck).toMatch(/^U$/m);
    expect(deck).toContain('*EL FILE');
    expect(deck).toMatch(/^S, ERR$/m);
    expect(deck).toContain('*NODE PRINT, NSET=NFIXED, TOTALS=ONLY');
    expect(deck).toMatch(/^RF$/m);
    expect(deck).toContain('*END STEP');
  });

  it('wraps long node sets so no deck line exceeds the CalculiX line limit', () => {
    const j = job();
    const many = Array.from({ length: 40 }, (_, i) => i + 1);
    const deck = writeInp({ ...j, fixed: { name: 'NFIXED', nodes: many } });
    for (const line of deck.split('\n')) expect(line.length).toBeLessThanOrEqual(80);
    // Continued lines end with a comma; the last one does not.
    const start = deck.split('\n').indexOf('*NSET, NSET=NFIXED');
    expect(deck.split('\n')[start + 1].endsWith(',')).toBe(true);
  });

  it('refuses a job whose load set is empty rather than silently solving an unloaded part', () => {
    const j = job();
    expect(() => writeInp({ ...j, loads: [{ name: 'tip', set: { name: 'NLOAD0', nodes: [] }, force: [0, 0, -90] }] }))
      .toThrow(/no nodes/i);
  });
});
