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
import { writeInp, GMSH_TO_CCX_TET10, consistentLoadWeights } from '../../../src/kernel/fea/inpWriter';
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

  it('splits the TOTAL declared force evenly when the load carries no surface triangles', () => {
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

  describe('consistent face load', () => {
    // A flat z=0 face of two UNEQUAL triangles: A = (0,0)(3,0)(1,1), area
    // 1.5, and B = (0,0)(1,1)(0,1), area 0.5. Each is the base of one tet10
    // with apex above it; the shared edge (0,0)-(1,1) has one mid-side node.
    function twoTriangleJob(): { job: FeaJobSpec; corner: number[]; mid: Map<string, number> } {
      const nodes = new Map<number, readonly [number, number, number]>();
      const byPos = new Map<string, number>();
      const node = (p: [number, number, number]): number => {
        const k = p.join(',');
        let id = byPos.get(k);
        if (id === undefined) { id = byPos.size + 1; byPos.set(k, id); nodes.set(id, p); }
        return id;
      };
      const midOf = (a: number, b: number): number => {
        const pa = nodes.get(a)!, pb = nodes.get(b)!;
        return node([(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2]);
      };
      const tet = (id: number, c: number[]) => ({
        id,
        // gmsh tet10 order: corners, then edges 01 12 02 03 23 13.
        nodes: [...c, midOf(c[0], c[1]), midOf(c[1], c[2]), midOf(c[0], c[2]),
          midOf(c[0], c[3]), midOf(c[2], c[3]), midOf(c[1], c[3])],
      });
      const p0 = node([0, 0, 0]), p1 = node([3, 0, 0]), p2 = node([1, 1, 0]), p3 = node([0, 1, 0]);
      const apexA = node([1, 0.3, 1]), apexB = node([0.3, 0.6, 1]);
      const elements = [tet(1, [p0, p1, p2, apexA]), tet(2, [p0, p2, p3, apexB])];
      const mid = new Map<string, number>([
        ['01', midOf(p0, p1)], ['12', midOf(p1, p2)], ['02', midOf(p0, p2)],
        ['23', midOf(p2, p3)], ['03', midOf(p0, p3)],
      ]);
      const tris: Array<[number, number, number]> = [[p0, p1, p2], [p0, p2, p3]];
      const faceNodes = [p0, p1, p2, p3, ...mid.values()].sort((a, b) => a - b);
      return {
        job: {
          mesh: { nodes, elements, surfaces: [], quality: mesh().quality, meshSize: 1 },
          material: { E: 1000, nu: 0.3, yield: 10 },
          fixed: { name: 'NFIXED', nodes: [apexA, apexB] },
          loads: [{ name: 'push', set: { name: 'NLOAD0', nodes: faceNodes }, force: [0, 0, -80], tris }],
        },
        corner: [p0, p1, p2, p3],
        mid,
      };
    }

    it('puts nothing on corner nodes and area-weights the mid-side nodes', () => {
      const { job: j, corner, mid } = twoTriangleJob();
      const w = consistentLoadWeights(j, j.loads[0].tris!)!;
      for (const c of corner) expect(w.get(c) ?? 0).toBe(0);
      // Triangle A holds 3/4 of the area, B 1/4; each mid-side takes 1/3 of
      // its triangle; the shared edge collects from both.
      expect(w.get(mid.get('01')!)).toBeCloseTo(0.75 / 3, 12);
      expect(w.get(mid.get('12')!)).toBeCloseTo(0.75 / 3, 12);
      expect(w.get(mid.get('02')!)).toBeCloseTo(0.75 / 3 + 0.25 / 3, 12);
      expect(w.get(mid.get('23')!)).toBeCloseTo(0.25 / 3, 12);
      expect(w.get(mid.get('03')!)).toBeCloseTo(0.25 / 3, 12);
      expect([...w.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    });

    it('writes per-node *CLOAD cards whose sum is the declared total', () => {
      const { job: j, corner, mid } = twoTriangleJob();
      const deck = writeInp(j).split('\n');
      const start = deck.indexOf('*CLOAD');
      const cards = deck.slice(start + 1).filter(l => /^\d+, \d, /.test(l)).map(l => l.split(', ').map(Number));
      expect(cards.every(([, dof]) => dof === 3)).toBe(true);
      expect(cards.reduce((acc, c) => acc + c[2], 0)).toBeCloseTo(-80, 6);
      const loaded = new Set(cards.map(c => c[0]));
      for (const c of corner) expect(loaded.has(c)).toBe(false);
      const byNode = new Map(cards.map(c => [c[0], c[2]]));
      expect(byNode.get(mid.get('01')!)).toBeCloseTo(-20, 6);
      expect(byNode.get(mid.get('02')!)).toBeCloseTo(-80 / 3, 6);
      expect(byNode.get(mid.get('23')!)).toBeCloseTo(-20 / 3, 6);
      // No set-level card when the per-node split is used.
      expect(deck.some(l => l.startsWith('NLOAD0, '))).toBe(false);
    });

    it('falls back to the linear-triangle corner split when a triangle has no mid-side nodes', () => {
      const { job: j, corner } = twoTriangleJob();
      const flat = { ...j, mesh: { ...j.mesh, elements: [] } };
      const w = consistentLoadWeights(flat, j.loads[0].tris!)!;
      expect(w.get(corner[1])).toBeCloseTo(0.75 / 3, 12);
      expect(w.get(corner[3])).toBeCloseTo(0.25 / 3, 12);
      expect([...w.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    });
  });
});
