// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/sweptOverlapRefine.ts
//
// Overlap report for one swept-joint walk (#1680). The walk samples the
// joint at a fixed step; between two samples it knows nothing. Where a pair
// changes between overlap and no overlap from one sample to the next, this
// module bisects that step (a bounded number of rounds) and reports where
// each overlap stretch starts and ends, with the bracket width left over.
// It also keeps the largest measured overlap per pair and every position
// that could not be measured, so an unmeasured position never reads clear.
//
// Pure orchestration: the caller supplies `measure`, which solves and
// measures one joint value. `S` is the caller's walk state at a sample (a
// loop-continuation fork), handed on so a bisection step continues from the
// lower end of its bracket.

import type {
  SweptOverlapPair,
  SweptOverlapStretch,
  SweptUnknownPose,
  SweptWalkReport,
} from './types';

/** One measured pair overlap at one position. */
export interface PairHit {
  readonly a: string;
  readonly b: string;
  readonly volumeMm3: number;
  readonly overlapBounds?: { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] };
}

/** Pair results at one position. `unknownReason` set means nothing at this
 *  position was measured; `unknownPairs` lists single pairs whose exact
 *  check failed. */
export interface PairState {
  readonly hits: ReadonlyMap<string, PairHit>;
  readonly unknownPairs: ReadonlyMap<string, { readonly a: string; readonly b: string }>;
  readonly unknownReason?: string;
  /** Relative pose key per BRep pair (the overlap memo's key). A pair whose
   *  key is the same at every measured sample keeps its place on the walk. */
  readonly poseKeys?: ReadonlyMap<string, string>;
}

export interface WalkSample<S> extends PairState {
  readonly value: number;
  readonly seed: S;
}

/** Measure one joint value, continuing from `seed`. `undefined` means the
 *  walk cannot reach that value (loop stop); the bracket stays unrefined. */
export type MeasureAt<S> = (value: number, seed: S) => Promise<{ state: PairState; seed: S } | undefined>;

export const DEFAULT_REFINE_ROUNDS = 6;

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

interface Boundary {
  /** Bracket end on the overlap side. */
  readonly hit: number;
  /** Bracket end on the clear side. */
  readonly clear: number;
}

interface Worst {
  hit: PairHit;
  value: number;
}

/**
 * Refine and summarise one single-joint walk. `samples` are in walk order
 * (the order the joint was stepped). Bisection rounds run only where both
 * bracket ends were measured for the pair and its state changes.
 */
export async function refineWalk<S>(
  joint: string,
  step: number,
  samples: ReadonlyArray<WalkSample<S>>,
  measure: MeasureAt<S>,
  rounds: number = DEFAULT_REFINE_ROUNDS,
): Promise<SweptWalkReport> {
  const fixed = fixedPairs(samples);
  if (fixed.keys.size > 0) samples = samples.map((s) => withoutPairs(s, fixed.keys));
  const worst = new Map<string, Worst>();
  const names = new Map<string, { a: string; b: string }>();
  const unknown: SweptUnknownPose[] = [];
  const noteHits = (state: PairState, value: number): void => {
    for (const [key, hit] of state.hits) {
      if (fixed.keys.has(key)) continue;
      names.set(key, { a: hit.a, b: hit.b });
      const prev = worst.get(key);
      if (prev === undefined || hit.volumeMm3 > prev.hit.volumeMm3) worst.set(key, { hit, value });
    }
  };
  const noteUnknown = (state: PairState, value: number): void => {
    if (state.unknownReason !== undefined) {
      unknown.push({ pose: { [joint]: value }, reason: state.unknownReason });
    } else if (state.unknownPairs.size > 0) {
      unknown.push({
        pose: { [joint]: value },
        reason: 'exact interference check failed',
        pairs: [...state.unknownPairs.values()].map((p) => ({ partA: p.a, partB: p.b })),
      });
    }
  };
  for (const s of samples) {
    noteHits(s, s.value);
    noteUnknown(s, s.value);
  }

  const { boundaries, refinementSamples } = await refineBrackets(samples, measure, rounds, noteHits, noteUnknown);

  const overlaps = [...worst].map(([key, w]) =>
    overlapPair(joint, names.get(key)!, w, stretchesFor(key, samples, boundaries.get(key), step)));
  overlaps.sort((x, y) => y.worstVolumeMm3 - x.worstVolumeMm3);

  const values = samples.map((s) => s.value);
  return {
    joint,
    from: values[0] ?? Number.NaN,
    to: values[values.length - 1] ?? Number.NaN,
    step,
    samples: samples.length,
    refineRounds: rounds,
    refinementSamples,
    ...(fixed.total === undefined ? {} : { movingPairs: fixed.total - fixed.keys.size, fixedPairs: fixed.keys.size }),
    overlaps,
    unknown,
    clearNote:
      `Pairs not listed in overlaps were clear at every position checked (step ${step}). ` +
      'An overlap shorter than one step with no state change at a sample can be missed; ' +
      'positions in unknown were not measured.' +
      (fixed.keys.size > 0
        ? ` ${fixed.keys.size} pair(s) keep their relative pose along the walk and are left to the static interference check.`
        : ''),
  };
}

/** Bisect every step where a pair changes state. `boundaries.get(key).get(i)`
 *  is the refined bracket between samples i and i+1. */
async function refineBrackets<S>(
  samples: ReadonlyArray<WalkSample<S>>,
  measure: MeasureAt<S>,
  rounds: number,
  noteHits: (state: PairState, value: number) => void,
  noteUnknown: (state: PairState, value: number) => void,
): Promise<{ boundaries: Map<string, Map<number, Boundary>>; refinementSamples: number }> {
  const boundaries = new Map<string, Map<number, Boundary>>();
  let refinementSamples = 0;
  for (let i = 0; i + 1 < samples.length; i++) {
    const lo = samples[i];
    const hi = samples[i + 1];
    if (lo.unknownReason !== undefined || hi.unknownReason !== undefined) continue;
    const keys = new Set([...lo.hits.keys(), ...hi.hits.keys()]);
    for (const key of keys) {
      if (lo.unknownPairs.has(key) || hi.unknownPairs.has(key)) continue;
      if (lo.hits.has(key) === hi.hits.has(key)) continue;
      const { boundary, samplesTaken } = await bisectBracket(key, lo, hi, measure, rounds, noteHits, noteUnknown);
      refinementSamples += samplesTaken;
      const byIndex = boundaries.get(key) ?? new Map<number, Boundary>();
      byIndex.set(i, boundary);
      boundaries.set(key, byIndex);
    }
  }
  return { boundaries, refinementSamples };
}

/** Pairs whose relative pose key is the same at every measured sample.
 *  `total` is the number of pairs keyed, or undefined when the samples
 *  carry no keys. Fewer than two measured samples prove nothing fixed. */
function fixedPairs(samples: ReadonlyArray<PairState>): { keys: Set<string>; total?: number } {
  const keyed = samples.filter((s) => s.unknownReason === undefined && s.poseKeys !== undefined);
  if (keyed.length === 0) return { keys: new Set() };
  const maps = keyed.map((s) => s.poseKeys!);
  const [first, ...rest] = maps;
  const total = new Set(maps.flatMap((k) => [...k.keys()])).size;
  if (rest.length === 0) return { keys: new Set(), total };
  const keys = new Set<string>();
  for (const [pair, pose] of first) {
    if (rest.every((k) => k.get(pair) === pose)) keys.add(pair);
  }
  return { keys, total };
}

/** A fixed pair's overlap is the static check's finding. A failed exact
 *  check stays in `unknown`: it is not a clear result for any check. */
function withoutPairs<T extends PairState>(state: T, drop: ReadonlySet<string>): T {
  return { ...state, hits: new Map([...state.hits].filter(([key]) => !drop.has(key))) };
}

/** Bisect one bracket where `key` changes state. The lower end (walk
 *  order) moves forward only, so its seed stays a continuation of it. */
async function bisectBracket<S>(
  key: string,
  lo: WalkSample<S>,
  hi: WalkSample<S>,
  measure: MeasureAt<S>,
  rounds: number,
  noteHits: (state: PairState, value: number) => void,
  noteUnknown: (state: PairState, value: number) => void,
): Promise<{ boundary: Boundary; samplesTaken: number }> {
  const hitLo = lo.hits.has(key);
  let a = lo.value;
  let b = hi.value;
  let seed = lo.seed;
  let samplesTaken = 0;
  for (let round = 0; round < rounds; round++) {
    const mid = (a + b) / 2;
    const measured = await measure(mid, seed);
    samplesTaken++;
    if (measured === undefined) break;
    const { state } = measured;
    noteHits(state, mid);
    if (state.unknownReason !== undefined || state.unknownPairs.has(key)) {
      noteUnknown(state, mid);
      break;
    }
    if (state.hits.has(key) === hitLo) {
      a = mid;
      seed = measured.seed;
    } else {
      b = mid;
    }
  }
  return { boundary: hitLo ? { hit: a, clear: b } : { hit: b, clear: a }, samplesTaken };
}

function overlapPair(
  joint: string,
  names: { readonly a: string; readonly b: string },
  w: Worst,
  stretches: SweptOverlapStretch[],
): SweptOverlapPair {
  const bounds = w.hit.overlapBounds;
  return {
    partA: names.a,
    partB: names.b,
    stretches,
    worstVolumeMm3: w.hit.volumeMm3,
    worstPose: { [joint]: w.value },
    ...(bounds === undefined
      ? {}
      : {
        witness: [0, 1, 2].map((k) => (bounds.min[k] + bounds.max[k]) / 2) as [number, number, number],
        overlapBounds: bounds,
      }),
  };
}

/** Contiguous overlap runs over the walk samples, with refined ends. A
 *  bisection hit between two clear samples cannot happen (no state change),
 *  so runs are read from the samples alone. */
function stretchesFor<S>(
  key: string,
  samples: ReadonlyArray<WalkSample<S>>,
  bounds: ReadonlyMap<number, Boundary> | undefined,
  step: number,
): SweptOverlapStretch[] {
  const out: SweptOverlapStretch[] = [];
  let i = 0;
  while (i < samples.length) {
    if (!samples[i].hits.has(key)) {
      i++;
      continue;
    }
    const first = i;
    while (i + 1 < samples.length && samples[i + 1].hits.has(key)) i++;
    const last = i;
    const start = stretchEnd(samples[first].value, first === 0, bounds?.get(first - 1), step);
    const end = stretchEnd(samples[last].value, last === samples.length - 1, bounds?.get(last), step);
    out.push({
      start: start.value,
      end: end.value,
      startResolution: start.resolution,
      endResolution: end.resolution,
      startsAtFirstSample: first === 0,
      endsAtLastSample: last === samples.length - 1,
    });
    i++;
  }
  return out;
}

/** One stretch end: the walk end itself, the refined bracket, or the
 *  overlapping sample with one step of doubt when no bracket was refined. */
function stretchEnd(
  sampled: number,
  atWalkEnd: boolean,
  bound: Boundary | undefined,
  step: number,
): { value: number; resolution: number } {
  if (atWalkEnd) return { value: sampled, resolution: 0 };
  if (bound === undefined) return { value: sampled, resolution: Math.abs(step) };
  return { value: bound.hit, resolution: Math.abs(bound.hit - bound.clear) };
}
