// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { RuntimeMesh } from '../../kernel/backends/runtimeMesh';
import { chamferDistanceMm, selectByConsensus, type ConsensusCandidate } from './consensus.js';

/** Closed axis-aligned box mesh: 8 corners, 12 triangles. */
function boxMesh(sx: number, sy: number, sz: number, at: [number, number, number] = [0, 0, 0]): RuntimeMesh {
  const [ox, oy, oz] = at;
  const p: number[] = [];
  for (const z of [0, sz]) for (const y of [0, sy]) for (const x of [0, sx]) p.push(ox + x, oy + y, oz + z);
  // corner index = x + 2y + 4z
  const quads = [
    [0, 1, 3, 2], [4, 6, 7, 5], // z- / z+
    [0, 4, 5, 1], [2, 3, 7, 6], // y- / y+
    [0, 2, 6, 4], [1, 5, 7, 3], // x- / x+
  ];
  const idx: number[] = [];
  for (const [a, b, c, d] of quads) idx.push(a, b, c, a, c, d);
  return { positions: new Float32Array(p), normals: new Float32Array(p.length), indices: new Uint32Array(idx) };
}

const cand = (mesh: RuntimeMesh | null, extra: Partial<ConsensusCandidate> = {}): ConsensusCandidate => ({
  script: 'return box();',
  mesh,
  ...extra,
});

/** Constant distance: every valid pair ties exactly, so only tie-breaks decide. */
const flat = () => 1;

describe('chamferDistanceMm', () => {
  it('is zero for identical meshes, symmetric, and grows with the shape difference', () => {
    const a = boxMesh(10, 10, 10);
    const b = boxMesh(12, 10, 10);
    const c = boxMesh(20, 10, 10);
    expect(chamferDistanceMm(a, a)).toBe(0);
    expect(chamferDistanceMm(a, b)).toBeCloseTo(chamferDistanceMm(b, a), 9);
    expect(chamferDistanceMm(a, b)).toBeGreaterThan(0);
    expect(chamferDistanceMm(a, c)).toBeGreaterThan(chamferDistanceMm(a, b));
  });
});

describe('selectByConsensus', () => {
  it('rejects the geometric outlier even when it passes more gates', () => {
    const r = selectByConsensus([
      cand(boxMesh(10, 10, 10), { id: 'a' }),
      cand(boxMesh(10.5, 10, 10), { id: 'b' }),
      cand(boxMesh(40, 4, 4, [30, 30, 30]), { id: 'outlier', gatesPassed: 9 }),
      cand(boxMesh(11, 10, 10), { id: 'c' }),
    ]);
    expect([0, 1, 3]).toContain(r.chosenIndex);
    expect(r.scores[r.chosenIndex as number]).toMatchObject({ status: 'chosen', rank: 1 });
    expect(r.scores[2]).toMatchObject({ status: 'ranked', rank: 4 });
    const clusterMax = Math.max(...[0, 1, 3].map((i) => r.scores[i].meanDistanceMm ?? 0));
    expect(r.scores[2].meanDistanceMm).toBeGreaterThan(clusterMax);
    expect(r.reason).toMatch(/is the geometric medoid/);
    // Distance matrix is symmetric with a zero diagonal.
    for (let i = 0; i < 4; i++) {
      expect(r.distances[i][i]).toBe(0);
      for (let j = 0; j < 4; j++) expect(r.distances[i][j]).toBe(r.distances[j][i]);
    }
  });

  it('picks the exact medoid: lowest mean distance to the others', () => {
    // 1-D positions 0,1,2,3,100: mean distances 26.5, 25.75, 25.5, 25.75, 97.5.
    const xs = [0, 1, 2, 3, 100];
    const r = selectByConsensus(
      xs.map((x) => cand(boxMesh(1, 1, 1, [x, 0, 0]))),
      { distance: (a, b) => Math.abs(a.positions[0] - b.positions[0]) },
    );
    expect(r.chosenIndex).toBe(2);
    expect(r.scores[2].meanDistanceMm).toBeCloseTo(25.5, 9);
    expect(r.scores.map((s) => s.rank)).toEqual([4, 2, 1, 3, 5]);
  });

  it('drops invalid candidates with a reason and never lets them vote', () => {
    const nan = boxMesh(10, 10, 10);
    nan.positions[0] = Number.NaN;
    const r = selectByConsensus([
      cand(null, { id: 'broken', invalidReason: 'script failed: boom' }),
      cand(boxMesh(10, 10, 10)),
      cand({ positions: new Float32Array(), normals: new Float32Array(), indices: new Uint32Array() }),
      cand(nan),
      cand(boxMesh(10.2, 10, 10)),
      cand(boxMesh(10.4, 10, 10)),
    ]);
    expect(r.chosenIndex).toBe(4);
    expect(r.scores[0]).toMatchObject({ status: 'dropped', droppedReason: 'script failed: boom' });
    expect(r.scores[2]).toMatchObject({ status: 'dropped', droppedReason: 'empty mesh (no triangles)' });
    expect(r.scores[3].droppedReason).toMatch(/non-finite/);
    for (const i of [0, 2, 3]) {
      expect(r.scores[i].meanDistanceMm).toBeUndefined();
      expect(r.scores[i].rank).toBeUndefined();
      expect(r.distances[i].every((d) => d === null)).toBe(true);
    }
    expect(r.reason).toMatch(/3 of 6 dropped as invalid/);
  });

  it('returns null when every candidate is invalid, and for an empty list', () => {
    const r = selectByConsensus([cand(null), cand(null, { invalidReason: 'x' })]);
    expect(r.chosenIndex).toBeNull();
    expect(r.scores.every((s) => s.status === 'dropped')).toBe(true);
    expect(r.reason).toMatch(/All 2 candidates were dropped/);
    expect(selectByConsensus([]).chosenIndex).toBeNull();
  });

  it('N=1: the single valid candidate is chosen without a vote', () => {
    const r = selectByConsensus([cand(boxMesh(5, 5, 5), { id: 'only' })]);
    expect(r.chosenIndex).toBe(0);
    expect(r.scores[0]).toMatchObject({ status: 'chosen', rank: 1, meanDistanceMm: 0 });
    expect(r.reason).toMatch(/only valid candidate/);
  });

  it('breaks a distance tie by more gates passed', () => {
    const r = selectByConsensus(
      [cand(boxMesh(1, 1, 1), { gatesPassed: 1 }), cand(boxMesh(1, 1, 1), { gatesPassed: 3 }), cand(boxMesh(1, 1, 1), { gatesPassed: 2 })],
      { distance: flat },
    );
    expect(r.chosenIndex).toBe(1);
    expect(r.scores.map((s) => s.rank)).toEqual([3, 1, 2]);
    expect(r.reason).toMatch(/more verify gates passed \(3 vs 2\)/);
  });

  it('then by the shorter script, then by the earlier index', () => {
    const byLength = selectByConsensus(
      [cand(boxMesh(1, 1, 1), { script: 'x'.repeat(30) }), cand(boxMesh(1, 1, 1), { script: 'x'.repeat(10) })],
      { distance: flat },
    );
    expect(byLength.chosenIndex).toBe(1);
    expect(byLength.reason).toMatch(/shorter script \(10 vs 30 chars\)/);

    const byIndex = selectByConsensus([cand(boxMesh(1, 1, 1)), cand(boxMesh(1, 1, 1))], { distance: flat });
    expect(byIndex.chosenIndex).toBe(0);
    expect(byIndex.reason).toMatch(/earliest candidate wins/);
  });

  it('two valid candidates always tie on distance, so gates decide', () => {
    const r = selectByConsensus([
      cand(boxMesh(10, 10, 10), { gatesPassed: 0 }),
      cand(boxMesh(30, 10, 10), { gatesPassed: 2 }),
    ]);
    expect(r.chosenIndex).toBe(1);
  });

  it('counts an unmeasurable pair as the worst measured distance', () => {
    const poisoned = boxMesh(1, 1, 1, [7, 0, 0]);
    const r = selectByConsensus(
      [cand(poisoned), cand(boxMesh(1, 1, 1)), cand(boxMesh(1, 1, 1, [0.5, 0, 0]))],
      {
        distance: (x, y) => {
          if (x === poisoned || y === poisoned) throw new Error('no distance');
          return 2;
        },
      },
    );
    expect(r.distances[0][1]).toBe(2);
    expect(r.scores.every((s) => Number.isFinite(s.meanDistanceMm))).toBe(true);
    // Everyone ties at 2 mm, so the tie-break (index) decides — no Infinity poisoning.
    expect(r.chosenIndex).toBe(0);
  });

  it('is deterministic and independent of candidate order', () => {
    const meshes = [boxMesh(10, 10, 10), boxMesh(10.5, 10, 10), boxMesh(25, 10, 10), boxMesh(11, 10, 10)];
    const input = meshes.map((m, i) => cand(m, { id: `m${i}` }));
    const first = selectByConsensus(input);
    const second = selectByConsensus(input);
    expect(second).toEqual(first);
    const reversed = selectByConsensus([...input].reverse());
    expect(reversed.scores[reversed.chosenIndex as number].id).toBe(first.scores[first.chosenIndex as number].id);
  });
});
