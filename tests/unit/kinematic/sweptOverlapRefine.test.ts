// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// #1680: the swept walk bisects the step where a pair changes state and
// reports stretch ends, the worst overlap and unmeasured positions. These
// cases drive `refineWalk` with a closed-form overlap so the expected ends
// are exact; `checkSweptCollisionRefine.test.ts` checks real geometry.

import { describe, expect, it } from 'vitest';
import {
  pairKey,
  refineWalk,
  type MeasureAt,
  type PairState,
  type WalkSample,
} from '../../../src/kinematic/sweptOverlapRefine';

const KEY = pairKey('pin', 'block');

/** Overlap of `pin` and `block` for joint value v: inside [lo, hi], with
 *  the largest volume at the centre. */
function stateAt(v: number, lo: number, hi: number, unknownAt?: (v: number) => boolean): PairState {
  if (unknownAt?.(v)) {
    return { hits: new Map(), unknownPairs: new Map([[KEY, { a: 'pin', b: 'block' }]]) };
  }
  const hits = new Map();
  if (v >= lo && v <= hi) {
    const centre = (lo + hi) / 2;
    hits.set(KEY, {
      a: 'pin',
      b: 'block',
      volumeMm3: 10 - Math.abs(v - centre),
      overlapBounds: { min: [v, 0, 0], max: [v + 2, 2, 2] },
    });
  }
  return { hits, unknownPairs: new Map() };
}

function walk(values: number[], state: (v: number) => PairState): WalkSample<number>[] {
  return values.map((value) => ({ ...state(value), value, seed: value }));
}

function measureFor(state: (v: number) => PairState): { measure: MeasureAt<number>; calls: number[] } {
  const calls: number[] = [];
  const measure: MeasureAt<number> = async (value) => {
    calls.push(value);
    return { state: state(value), seed: value };
  };
  return { measure, calls };
}

describe('refineWalk (#1680)', () => {
  it('brackets both ends of an overlap stretch to step / 2^rounds', async () => {
    const state = (v: number) => stateAt(v, 23.3, 41.7);
    const { measure, calls } = measureFor(state);
    const report = await refineWalk('slide', 10, walk([0, 10, 20, 30, 40, 50], state), measure, 6);

    expect(report.overlaps).toHaveLength(1);
    const pair = report.overlaps[0];
    expect(pair.stretches).toHaveLength(1);
    const [s] = pair.stretches;
    expect(s.startResolution).toBeCloseTo(10 / 64, 9);
    expect(s.endResolution).toBeCloseTo(10 / 64, 9);
    // The overlap-side bracket end lies inside the true stretch, within one
    // resolution of the true end.
    expect(s.start).toBeGreaterThanOrEqual(23.3);
    expect(s.start - 23.3).toBeLessThanOrEqual(s.startResolution);
    expect(s.end).toBeLessThanOrEqual(41.7);
    expect(41.7 - s.end).toBeLessThanOrEqual(s.endResolution);
    expect(s.startsAtFirstSample).toBe(false);
    expect(s.endsAtLastSample).toBe(false);
    expect(calls).toHaveLength(12);
    expect(report.refinementSamples).toBe(12);
    expect(report.samples).toBe(6);
    expect(report.unknown).toEqual([]);
  });

  it('keeps the largest measured overlap, its pose and a witness point', async () => {
    const state = (v: number) => stateAt(v, 20, 40);
    const { measure } = measureFor(state);
    const report = await refineWalk('slide', 10, walk([0, 10, 20, 30, 40, 50], state), measure, 4);
    const pair = report.overlaps[0];
    expect(pair.worstVolumeMm3).toBe(10);
    expect(pair.worstPose).toEqual({ slide: 30 });
    expect(pair.witness).toEqual([31, 1, 1]);
  });

  it('marks a stretch that runs past the walk ends with zero resolution', async () => {
    const state = (v: number) => stateAt(v, -5, 12);
    const { measure } = measureFor(state);
    const report = await refineWalk('slide', 10, walk([0, 10, 20], state), measure, 3);
    const [s] = report.overlaps[0].stretches;
    expect(s.start).toBe(0);
    expect(s.startsAtFirstSample).toBe(true);
    expect(s.startResolution).toBe(0);
    expect(s.endResolution).toBeCloseTo(10 / 8, 9);
  });

  it('reports separate stretches and does not refine a step with no state change', async () => {
    const state = (v: number): PairState => {
      const a = stateAt(v, 5, 15);
      return a.hits.size > 0 ? a : stateAt(v, 35, 45);
    };
    const { measure } = measureFor(state);
    const report = await refineWalk('slide', 10, walk([0, 10, 20, 30, 40, 50], state), measure, 2);
    expect(report.overlaps[0].stretches.map((s) => [s.startsAtFirstSample, s.endsAtLastSample])).toEqual([
      [false, false],
      [false, false],
    ]);
    // Four state changes, two rounds each; 20 -> 30 stays clear.
    expect(report.refinementSamples).toBe(8);
  });

  it('lists an unmeasured position as unknown and leaves its bracket at one step', async () => {
    const unknownAt = (v: number) => v === 20;
    const state = (v: number) => stateAt(v, 25, 60, unknownAt);
    const { measure, calls } = measureFor(state);
    const report = await refineWalk('slide', 10, walk([0, 10, 20, 30, 40], state), measure, 4);
    expect(report.unknown).toEqual([
      { pose: { slide: 20 }, reason: 'exact interference check failed', pairs: [{ partA: 'pin', partB: 'block' }] },
    ]);
    // 20 -> 30 has an unknown end, so it is not bisected.
    expect(calls).toEqual([]);
    const [s] = report.overlaps[0].stretches;
    expect(s.start).toBe(30);
    expect(s.startResolution).toBe(10);
  });

  it('records an unmeasured bisection step and stops refining that bracket', async () => {
    const unknownAt = (v: number) => v === 15;
    const state = (v: number) => stateAt(v, 12, 60, unknownAt);
    const { measure, calls } = measureFor(state);
    const report = await refineWalk('slide', 10, walk([0, 10, 20, 30], state), measure, 5);
    expect(calls).toEqual([15]);
    expect(report.unknown.map((u) => u.pose)).toEqual([{ slide: 15 }]);
    const [s] = report.overlaps[0].stretches;
    expect(s.start).toBe(20);
    expect(s.startResolution).toBe(10);
  });

  it('states that pairs not listed were clear at every position checked', async () => {
    const state = (): PairState => ({ hits: new Map(), unknownPairs: new Map() });
    const { measure } = measureFor(state);
    const report = await refineWalk('slide', 2.5, walk([0, 2.5, 5], state), measure);
    expect(report.overlaps).toEqual([]);
    expect(report.clearNote).toContain('clear at every position checked (step 2.5)');
  });

  it('counts pairs with a constant relative pose and leaves their overlap out', async () => {
    const FIXED = pairKey('frame', 'block');
    const state = (v: number): PairState => {
      const base = stateAt(v, 23.3, 41.7);
      const hits = new Map(base.hits);
      hits.set(FIXED, { a: 'frame', b: 'block', volumeMm3: 50 });
      return {
        ...base,
        hits,
        poseKeys: new Map([[KEY, `pin@${v}`], [FIXED, 'frame@0']]),
      };
    };
    const { measure } = measureFor(state);
    const report = await refineWalk('slide', 10, walk([0, 10, 20, 30, 40, 50], state), measure, 6);

    expect(report.movingPairs).toBe(1);
    expect(report.fixedPairs).toBe(1);
    expect(report.overlaps.map((p) => p.partA)).toEqual(['pin']);
    expect(report.overlaps[0].worstVolumeMm3).toBeLessThan(50);
  });

  it('does not call a pair fixed from one measured sample', async () => {
    const state = (v: number): PairState => ({ ...stateAt(v, 0, 5), poseKeys: new Map([[KEY, 'same']]) });
    const { measure } = measureFor(state);
    const report = await refineWalk('slide', 10, walk([0], state), measure, 6);
    expect(report.fixedPairs).toBe(0);
    expect(report.movingPairs).toBe(1);
    expect(report.overlaps).toHaveLength(1);
  });
});
