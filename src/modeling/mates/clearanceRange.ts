// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/clearanceRange.ts
//
// Per-pair clearance report: actual vs planned, at rest and across the joint
// range (#1590). It adds no sampler and no distance primitive of its own:
//   - poses come from `buildPoseEnvelopeSamples` (the pose-envelope sweep),
//   - each pose is placed by `solveMates` and re-posed on the cached lowered
//     scene with `reposedLoweredAssemblyScene`,
//   - each pair is measured with `measureDeclaredClearances`, the same exact
//     BREP distance the rest-pose `solvedModel({ clearances })` gate uses.
//
// A row is 'unknown' (never a silent pass) when a pose could not be solved
// or re-posed, a pair could not be measured, or a movable mate has no
// declared bound, so the range was not fully sampled.
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { Assembly } from '../capture/assembly';
import { pairKey } from '../runtime/detectInterferences';
import { measureDeclaredClearances, type PairClearanceTolerance } from '../runtime/pairTolerances';
import { matchingLoweredAssemblyScene, rememberedRestScene, reposedLoweredAssemblyScene } from './loweredAssemblyScene';
import { parseConnectorRef, type MateRecord } from './mate';
import { buildPoseEnvelopeSamples, type PoseEnvelopeSample } from './poseEnvelope';
import { solveMates } from './solver';

export type ClearanceRangeStatus = 'pass' | 'fail' | 'unknown';

export interface ClearanceRangeRow {
  readonly a: string;
  readonly b: string;
  /** Planned minimum clearance in mm. */
  readonly planned: number;
  /** 'declared' = `solvedModel({ clearances })`; 'spec' = the call-time or
   *  `dfmSpec({ minClearance })` value applied to a movable mate pair. */
  readonly plannedSource: 'declared' | 'spec';
  readonly at: 'rest' | 'range';
  /** Smallest measured distance in mm (0 for an overlap); null when no
   *  sample could be measured. */
  readonly actual: number | null;
  /** Sample where `actual` was measured. */
  readonly worstSample?: string;
  /** Samples measured for this row / samples the row covers. */
  readonly measuredSamples: number;
  readonly totalSamples: number;
  readonly status: ClearanceRangeStatus;
  readonly reason?: string;
}

export interface ClearanceRangeOptions {
  /** A lowered scene of the same assembly. Defaults to the remembered rest
   *  scene of the last full lower. */
  readonly loweredScene?: unknown;
  /** Planned clearance for every movable (non-fastened) mate pair that has no
   *  declared `clearances` entry. */
  readonly minClearanceMm?: number;
  /** Interior samples per limited mate, as in the pose-envelope review. */
  readonly samplesPerMate?: number;
  /** pairKey()-encoded pairs exempt from the spec-derived rows. */
  readonly ignoredPairs?: ReadonlySet<string>;
}

export interface ClearanceRangeReport {
  /** True only when every row passes. */
  readonly ok: boolean;
  readonly rows: ClearanceRangeRow[];
  readonly samples: ReadonlyArray<Pick<PoseEnvelopeSample, 'name' | 'reason'>>;
  /** Movable mates with no declared bound; their range is not sampled. */
  readonly unboundedMates: string[];
}

interface Requirement extends PairClearanceTolerance {
  readonly plannedSource: 'declared' | 'spec';
}

interface SampleMeasurement {
  readonly sample: string;
  /** pairKey -> distance (NaN = not measured). */
  readonly distances: ReadonlyMap<string, number>;
  /** Set when the whole sample could not be measured. */
  readonly failure?: string;
}

const REST_SAMPLE = 'current';

export async function reviewClearanceRange(
  arm: Assembly,
  opts: ClearanceRangeOptions = {},
): Promise<ClearanceRangeReport> {
  const requirements = clearanceRequirements(arm, opts);
  const samples = buildPoseEnvelopeSamples(arm, { samplesPerMate: opts.samplesPerMate });
  const unboundedMates = unboundedMovableMates(arm);
  const scene = matchingLoweredAssemblyScene(arm, opts.loweredScene) ?? rememberedRestScene(arm);
  const measurements: SampleMeasurement[] = [];
  if (requirements.length > 0) {
    for (const sample of samples) measurements.push(await measureSample(arm, scene, sample, requirements));
  }
  const rows: ClearanceRangeRow[] = [];
  for (const req of requirements) {
    const rest = measurements.filter((m) => m.sample === REST_SAMPLE);
    const range = measurements.filter((m) => m.sample !== REST_SAMPLE);
    rows.push(summarize(req, 'rest', rest, undefined));
    const rangeGap = unboundedMates.length > 0
      ? `movable mate(s) ${unboundedMates.map((m) => `'${m}'`).join(', ')} have no declared limits, so the joint range was not sampled`
      : range.length === 0
        ? 'the assembly has no limited movable mate, so there is no joint range to sample'
        : undefined;
    rows.push(summarize(req, 'range', [...rest, ...range], rangeGap));
  }
  return {
    ok: rows.length > 0 && rows.every((row) => row.status === 'pass'),
    rows,
    samples: samples.map(({ name, reason }) => ({ name, reason })),
    unboundedMates,
  };
}

/** Declared `clearances` first; the spec value then covers every movable mate
 *  pair that is not declared, ignored or a declared contact. */
function clearanceRequirements(arm: Assembly, opts: ClearanceRangeOptions): Requirement[] {
  const tolerances = arm.__pairTolerances();
  const out: Requirement[] = tolerances.clearances.map((c) => ({ ...c, plannedSource: 'declared' as const }));
  if (opts.minClearanceMm === undefined) return out;
  const seen = new Set(out.map((r) => pairKey(r.parts[0], r.parts[1])));
  const exempt = new Set<string>([
    ...(opts.ignoredPairs ?? []),
    ...arm.__ignoreInterference().map(([a, b]) => pairKey(a, b)),
    ...tolerances.contacts.map((c) => pairKey(c.parts[0], c.parts[1])),
  ]);
  for (const mate of arm.__mates()) {
    if (mate.type === 'fastened') continue;
    const a = parseConnectorRef(mate.a).partName;
    const b = parseConnectorRef(mate.b).partName;
    const key = pairKey(a, b);
    if (a === b || seen.has(key) || exempt.has(key)) continue;
    seen.add(key);
    out.push({ parts: [a, b], minMm: opts.minClearanceMm, plannedSource: 'spec' });
  }
  return out;
}

/** A movable mate is bounded by its own limits or by a coupling partner's. */
function unboundedMovableMates(arm: Assembly): string[] {
  const mates = arm.__mates();
  const limited = new Set(mates.filter(hasLimits).map((m) => m.name));
  const coupledToLimited = new Set<string>();
  for (const c of arm.__mateCouplings()) {
    if (limited.has(c.source)) coupledToLimited.add(c.driven);
    if (limited.has(c.driven)) coupledToLimited.add(c.source);
  }
  return mates
    .filter((m) => m.type !== 'fastened' && !limited.has(m.name) && !coupledToLimited.has(m.name))
    .map((m) => m.name);
}

function hasLimits(mate: MateRecord): boolean {
  return (mate.limitsDeg ?? mate.limitsMm) !== undefined;
}

async function measureSample(
  arm: Assembly,
  scene: SceneBackend | undefined,
  sample: PoseEnvelopeSample,
  requirements: readonly Requirement[],
): Promise<SampleMeasurement> {
  const empty = new Map<string, number>();
  if (scene === undefined) {
    return { sample: sample.name, distances: empty, failure: 'no lowered scene of this assembly is available' };
  }
  let posed: SceneBackend | undefined;
  try {
    const solved = await solveMates(arm, sample.poses);
    if (solved.status === 'over-constrained' || solved.status === 'did-not-converge') {
      return { sample: sample.name, distances: empty, failure: `sample '${sample.name}' solved as '${solved.status}'` };
    }
    posed = reposedLoweredAssemblyScene(arm, scene, solved.poses);
  } catch (e) {
    return { sample: sample.name, distances: empty, failure: `sample '${sample.name}' could not be solved: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (posed === undefined) {
    return { sample: sample.name, distances: empty, failure: `sample '${sample.name}' could not be re-posed on the lowered scene` };
  }
  const distances = new Map<string, number>();
  for (const result of measureDeclaredClearances(posed, requirements)) {
    distances.set(pairKey(result.a, result.b), result.status === 'unknown' ? Number.NaN : result.distanceMm);
  }
  return { sample: sample.name, distances };
}

function summarize(
  req: Requirement,
  at: 'rest' | 'range',
  measurements: readonly SampleMeasurement[],
  coverageGap: string | undefined,
): ClearanceRangeRow {
  const [a, b] = req.parts;
  const key = pairKey(a, b);
  let actual: number | null = null;
  let worstSample: string | undefined;
  let measured = 0;
  const misses: string[] = [];
  for (const m of measurements) {
    const d = m.distances.get(key);
    if (d === undefined || Number.isNaN(d)) {
      misses.push(m.failure ?? `sample '${m.sample}' could not measure the pair`);
      continue;
    }
    measured++;
    if (actual === null || d < actual) {
      actual = d;
      worstSample = m.sample;
    }
  }
  const base = {
    a, b,
    planned: req.minMm,
    plannedSource: req.plannedSource,
    at,
    actual,
    ...(worstSample !== undefined ? { worstSample } : {}),
    measuredSamples: measured,
    totalSamples: measurements.length,
  };
  // A measured value under spec fails even when coverage is incomplete: the
  // missing samples cannot make the measured one larger.
  if (actual !== null && actual < req.minMm) {
    return { ...base, status: 'fail', reason: `${actual.toFixed(3)} mm at '${worstSample}' is below the planned ${req.minMm} mm` };
  }
  const gap = misses[0] ?? coverageGap;
  if (gap !== undefined || actual === null) {
    return { ...base, status: 'unknown', reason: gap ?? 'no sample measured the pair' };
  }
  return { ...base, status: 'pass' };
}
