// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Gap #10 — the AABB candidate generation that prunes the exact BREP pair
// probing. The pure cases pin the prefilter semantics (disjoint bboxes are
// never probed; face-touching bboxes stay candidates; the symmetric ignore
// list is applied before the bbox test, matching the old inline loop). The
// shape cases pin the observable `comparisonCount` on the real detector.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import {
  collectInterferenceCandidates,
  pairKey,
  type InterferenceCandidatePart,
} from '../../../src/modeling/runtime/detectInterferences';

function part(
  name: string,
  min: [number, number, number],
  max: [number, number, number],
): InterferenceCandidatePart {
  return { name, bbox: { min, max } };
}

describe('collectInterferenceCandidates — AABB prune', () => {
  const parts = [
    part('a', [0, 0, 0], [10, 10, 10]),
    part('b', [20, 20, 20], [30, 30, 30]), // disjoint from a, c, and d
    part('c', [10, 0, 0], [20, 10, 10]), // face-touching a at x=10
    part('d', [5, 5, 5], [15, 15, 15]), // overlaps a
  ];

  it('keeps bbox-overlapping pairs and drops disjoint ones', () => {
    // (a,b), (b,c), and (b,d) are disjoint on at least one axis → never
    // probed. (a,c) touch on the boundary (inclusive compare) → kept so the
    // volume probe can decide; (a,d) and (c,d) genuinely overlap.
    expect(collectInterferenceCandidates(parts)).toEqual([
      [0, 2],
      [0, 3],
      [2, 3],
    ]);
  });

  it('applies the symmetric ignore list before the bbox test', () => {
    expect(collectInterferenceCandidates(parts, new Set([pairKey('a', 'c')]))).toEqual([
      [0, 3],
      [2, 3],
    ]);
    // pairKey is order-independent, so the reversed spelling silences the
    // same pair.
    expect(collectInterferenceCandidates(parts, new Set([pairKey('c', 'a')]))).toEqual([
      [0, 3],
      [2, 3],
    ]);
  });

  it('returns no candidates for empty or single-part inputs', () => {
    expect(collectInterferenceCandidates([])).toEqual([]);
    expect(collectInterferenceCandidates([parts[0]])).toEqual([]);
  });
});

describe('detectInterferences — probe count (bbox prune on real shapes)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  async function detect(bCode: string, ignore?: ReadonlySet<string>) {
    const code = `
      const arm = assembly('prune');
      arm.part('a', box(10, 10, 10, true));
      arm.part('b', ${bCode});
      return arm.model();
    `;
    const { checkInterference } = await import('../../../src/agent/script-runtime/checkInterference');
    return checkInterference({ code, fileName: 'prune.kcad.ts', ...(ignore ? { ignorePairs: ignore } : {}) });
  }

  it('does not probe a disjoint pair (comparisonCount 0, no pairs)', async () => {
    const r = await detect('box(10, 10, 10, true).translate(50, 0, 0)');
    expect(r.comparisonCount).toBe(0);
    expect(r.pairs).toEqual([]);
    expect(r.partCount).toBe(2);
  });

  it('probes a near-touching pair (face-coincident) but reports no volume', async () => {
    const r = await detect('box(10, 10, 10, true).translate(10, 0, 0)');
    expect(r.comparisonCount).toBe(1);
    expect(r.pairs).toEqual([]);
  });

  it('probes an overlapping pair and reports the shared volume', async () => {
    const r = await detect('box(10, 10, 10, true).translate(8, 0, 0)');
    expect(r.comparisonCount).toBe(1);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].volumeMm3).toBeGreaterThan(0);
  });

  it('honors the symmetric ignore list before probing', async () => {
    const ignored = new Set([pairKey('b', 'a')]);
    const r = await detect('box(10, 10, 10, true).translate(8, 0, 0)', ignored);
    expect(r.comparisonCount).toBe(0);
    expect(r.pairs).toEqual([]);
  });
});
