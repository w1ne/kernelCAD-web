// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/suggestJointRanges.ts
//
// Geometry-backed mate-limit suggestion. For each revolute or prismatic
// scalar joint, hold every other mate at its resolved authored pose and
// walk this joint from that rest value toward each finite search bound.
// The first non-exempt pair whose exact BREP distance drops to the
// clearance (default 0.3 mm) is that side's stop. A coarse step finds a
// bracket; bisection shrinks it to the requested resolution and reports
// the clear side, so the suggested limit keeps the requested clearance.
//
// The result is a suggestion. Nothing here writes limits back onto the
// mate. A side that was not measured — no finite bound, the shared BREP
// sweep budget, or a failed distance — is `unknown`, never `no-stop`.
//
// Parent/child parts of a mate or joint-graph joint, declared contact
// pairs, and disableCollision pairs are neighbours or intentional
// contacts. They do not count as a stop. `no-stop` means no crossing
// was found at the sampled poses. It is not continuous proof that the
// interval is clear: a contact narrower than the coarse step can be
// stepped over. The result records that limit.

import type { Assembly } from '../modeling/capture/assembly';
import { forwardKinematics, jointGraphHasLoops, type NumericPoses } from '../modeling/capture/forwardKinematics';
import { createOcctLowerer } from '../modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../modeling/compute/recomputeEngine';
import { parseConnectorRef, type MateRecord } from '../modeling/mates/mate';
import { reposedLoweredAssemblyScene } from '../modeling/mates/loweredAssemblyScene';
import { solveMates } from '../modeling/mates/solver';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend } from '../kernel/backends/sceneBackend';
import type { Transform } from '../shared/runtime/se3';
import { currentValue } from '../shared/runtime/editableHelpers';
import type { Editable } from '../shared/runtime/paramRef';
import { minDistanceBetweenShapes, wrappedShape } from '../modeling/runtime/brepDistance';
import { pairKey } from '../modeling/runtime/detectInterferences';
import { bboxGap, transformScenePart, type TransformedPart } from '../modeling/runtime/dfm/clearance';
import { BREP_SWEEP_BUDGET } from '../modeling/runtime/mechanismTruth';
import { buildSweepProxies, relativePoseKey } from '../modeling/runtime/sweepCollisionProxy';

/** Default surface clearance a suggested stop protects, in millimetres. */
export const DEFAULT_JOINT_RANGE_CLEARANCE_MM = 0.3;

const DEFAULT_REVOLUTE_STEP_DEG = 5;
const DEFAULT_PRISMATIC_STEP_MM = 2;
const DEFAULT_REVOLUTE_RESOLUTION_DEG = 0.1;
const DEFAULT_PRISMATIC_RESOLUTION_MM = 0.05;
const MAX_BISECTION_STEPS = 32;
/**
 * A running fit modeled at exactly the clearance must not flip between
 * poses. 1e-6 mm is a nanometre, far below the bisection resolution.
 */
export const CLEARANCE_COMPARE_EPSILON_MM = 1e-6;

export type JointRangeSideStatus = 'stop' | 'no-stop' | 'unknown';

export type JointRangeUnknownReason =
  | 'budget'
  | 'unmeasured'
  | 'unbounded'
  | 'rest-outside-bounds'
  | 'invalid-bounds'
  | 'solve-failed';

export interface JointRangePair {
  readonly a: string;
  readonly b: string;
}

/** One direction of travel, from the authored rest toward a search bound. */
export interface JointRangeSide {
  readonly status: JointRangeSideStatus;
  /** Stop coordinate, or the search bound when the side stays clear. */
  readonly value?: number;
  readonly pair?: JointRangePair;
  /** Width of the bisection bracket, in the joint's units. */
  readonly resolution?: number;
  readonly reason?: JointRangeUnknownReason;
}

export interface JointLimitPatch {
  readonly joint: string;
  readonly limitsField: 'limitsDeg' | 'limitsMm';
  /** Suggested [lower, upper]. A `bound` side is the search window, not a geometric stop. */
  readonly limits: readonly [number, number];
  readonly lower: 'stop' | 'bound';
  readonly upper: 'stop' | 'bound';
  /** Paste-ready fragment. Applying it is the caller's edit. */
  readonly snippet: string;
}

export interface JointRangeSuggestion {
  readonly joint: string;
  readonly kind: 'revolute' | 'prismatic';
  readonly units: 'deg' | 'mm';
  readonly limitsField: 'limitsDeg' | 'limitsMm';
  readonly rest: number;
  readonly authoredLimits: readonly [number, number] | null;
  readonly search: readonly [number, number] | null;
  readonly step: number;
  /** True when a non-exempt pair is already within clearance at the authored pose. */
  readonly restWithinClearance: boolean;
  readonly lower: JointRangeSide;
  readonly upper: JointRangeSide;
}

export interface SuggestJointRangesOpts {
  /** Measure only this revolute or prismatic joint. */
  readonly joint?: string;
  /**
   * Search window [min, max] in the joint's units. Overrides authored
   * limits. A joint with neither a finite authored range nor this window
   * is `unknown` (`unbounded`) — the walk does not invent a bound.
   */
  readonly search?: readonly [number, number];
  /** Stop clearance in mm. Default {@link DEFAULT_JOINT_RANGE_CLEARANCE_MM}. */
  readonly clearanceMm?: number;
  /** Coarse step in the joint's units. Default 5 degrees or 2 mm. */
  readonly step?: number;
  /** Bisection tolerance in the joint's units. Default 0.1 degrees or 0.05 mm. */
  readonly resolution?: number;
  /**
   * Face-weighted exact-distance budget. Defaults to {@link BREP_SWEEP_BUDGET}
   * (40,000). `0` skips measurement and returns `unknown`. A probe that
   * would pass the budget stops that side as `unknown`, never `no-stop`.
   */
  readonly sweepBudget?: number;
}

export interface SuggestJointRangesResult {
  readonly ok: boolean;
  readonly source: 'local';
  readonly clearanceMm: number;
  readonly sweepBudget: number;
  /** Face-weighted exact BREP distance probes actually run. */
  readonly workUsed: number;
  readonly joints: readonly JointRangeSuggestion[];
  /** Joints with a measured geometric stop on at least one side and no unknown side. */
  readonly patch: readonly JointLimitPatch[];
  /**
   * One snippet covering `patch`. A comment states that the text is not
   * applied to the model.
   */
  readonly limitsSnippet: string;
  /**
   * What the walk measured. `no-stop` means no crossing was found at the
   * sampled poses, not continuous proof that the interval is clear. A
   * contact thinner than one coarse step can be missed and still come
   * back as `no-stop`. A stop that is found is the clear side of an
   * exact-distance bracket.
   */
  readonly samplingNote: string;
  readonly error?: string;
}

const SAMPLING_NOTE =
  'Each joint is walked from its authored rest in coarse steps, then the clearance crossing is bisected with exact BREP distance. The reported stop is the clear side of that bracket, so the suggested limit keeps the requested clearance. no-stop means no crossing was found at the sampled poses, not continuous proof that the interval is clear. A contact thinner than one coarse step can be missed. An unmeasured side is unknown, not clear.';

interface ScalarJoint {
  readonly name: string;
  readonly kind: 'revolute' | 'prismatic';
  readonly limits: readonly [number, number] | null;
  readonly rest: number;
}

interface Budget {
  used: number;
  readonly limit: number;
}

type PoseReading =
  | { readonly kind: 'clear' }
  | { readonly kind: 'close'; readonly pair: JointRangePair }
  | { readonly kind: 'unknown'; readonly reason: 'budget' | 'unmeasured' | 'solve-failed' };

function isUsableClearance(clearance: number): boolean {
  return Number.isFinite(clearance) && clearance >= 0;
}

function isUsableBudget(budgetLimit: number): boolean {
  return budgetLimit === Infinity || (Number.isFinite(budgetLimit) && budgetLimit >= 0);
}

function isUsableWindow(search: readonly [number, number] | undefined): boolean {
  return search === undefined || isFiniteWindow(search);
}

/** An omitted step or resolution keeps the default. A provided one must be a finite number above zero. */
function isPositiveOverride(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value > 0);
}

function requestError(
  opts: SuggestJointRangesOpts | undefined,
  clearance: number,
  budgetLimit: number,
): string | undefined {
  if (!isUsableClearance(clearance)) {
    return 'suggestJointRanges: clearanceMm must be a finite number >= 0.';
  }
  if (!isUsableBudget(budgetLimit)) {
    return 'suggestJointRanges: sweepBudget must be a finite number >= 0, or Infinity.';
  }
  if (!isUsableWindow(opts?.search)) {
    return 'suggestJointRanges: search must be a finite [min, max] with min <= max.';
  }
  if (!isPositiveOverride(opts?.step)) {
    return 'suggestJointRanges: step must be a finite number > 0.';
  }
  if (!isPositiveOverride(opts?.resolution)) {
    return 'suggestJointRanges: resolution must be a finite number > 0.';
  }
  return undefined;
}

function namedJoints(
  scalars: readonly ScalarJoint[],
  name: string | undefined,
): readonly ScalarJoint[] | undefined {
  if (name === undefined) return scalars;
  const selected = scalars.filter((joint) => joint.name === name);
  if (selected.length === 0) return undefined;
  return selected;
}

function failedResult(clearance: number, budgetLimit: number, error: string): SuggestJointRangesResult {
  return {
    ok: false,
    source: 'local',
    clearanceMm: clearance,
    sweepBudget: budgetLimit,
    workUsed: 0,
    joints: [],
    patch: [],
    limitsSnippet: '',
    samplingNote: SAMPLING_NOTE,
    error,
  };
}

function jointWindowIsKnown(joint: JointRangeSuggestion): boolean {
  return joint.lower.status !== 'unknown'
    && joint.upper.status !== 'unknown'
    && !joint.restWithinClearance;
}

function measuredResult(
  joints: readonly JointRangeSuggestion[],
  clearance: number,
  budgetLimit: number,
  workUsed: number,
): SuggestJointRangesResult {
  const patch = joints.flatMap(patchFor);
  return {
    ok: joints.every(jointWindowIsKnown),
    source: 'local',
    clearanceMm: clearance,
    sweepBudget: budgetLimit,
    workUsed,
    joints,
    patch,
    limitsSnippet: formatSnippet(patch),
    samplingNote: SAMPLING_NOTE,
  };
}

function sessionFor(
  prepared: readonly PreparedJoint[],
  arm: Assembly,
  clearance: number,
  budget: Budget,
): MeasureSession | undefined {
  if (!prepared.some((joint) => joint.measure)) return undefined;
  return new MeasureSession(arm, clearance, budget);
}

async function readAnchor(
  session: MeasureSession | undefined,
  anchor: ScalarJoint | undefined,
): Promise<PoseReading | undefined> {
  if (session === undefined || anchor === undefined) return undefined;
  return session.read(anchor.name, anchor.rest);
}

/**
 * Suggest revolute and prismatic limits from geometry. Does not modify
 * the assembly. Other mates stay at their resolved authored poses while
 * one joint moves.
 */
export async function suggestJointRanges(
  arm: Assembly,
  opts?: SuggestJointRangesOpts,
): Promise<SuggestJointRangesResult> {
  const clearance = opts?.clearanceMm ?? DEFAULT_JOINT_RANGE_CLEARANCE_MM;
  const budgetLimit = opts?.sweepBudget === undefined ? BREP_SWEEP_BUDGET : opts.sweepBudget;
  const problem = requestError(opts, clearance, budgetLimit);
  if (problem !== undefined) return failedResult(clearance, budgetLimit, problem);

  const requested = opts?.joint;
  const selected = namedJoints(listScalarJoints(arm), requested);
  if (selected === undefined) {
    return failedResult(
      clearance,
      budgetLimit,
      `suggestJointRanges: unknown joint '${requested}' — not a revolute or prismatic mate or joint on this assembly.`,
    );
  }

  const budget: Budget = { used: 0, limit: budgetLimit };
  const prepared = selected.map((joint) => prepareJoint(joint, opts, budgetLimit));
  const session = sessionFor(prepared, arm, clearance, budget);
  const restReading = await readAnchor(session, selected[0]);
  const joints: JointRangeSuggestion[] = [];
  for (const joint of prepared) {
    joints.push(await suggestOne(joint, restReading, session, opts));
  }
  return measuredResult(joints, clearance, budgetLimit, budget.used);
}

interface PreparedJoint extends ScalarJoint {
  readonly search: readonly [number, number] | null;
  readonly blocked?: JointRangeSide;
  readonly measure: boolean;
  readonly step: number;
  readonly resolution: number;
}

function jointStep(kind: ScalarJoint['kind'], opts: SuggestJointRangesOpts | undefined): number {
  return opts?.step ?? (kind === 'revolute' ? DEFAULT_REVOLUTE_STEP_DEG : DEFAULT_PRISMATIC_STEP_MM);
}

function jointResolution(kind: ScalarJoint['kind'], opts: SuggestJointRangesOpts | undefined): number {
  return opts?.resolution ?? (kind === 'revolute' ? DEFAULT_REVOLUTE_RESOLUTION_DEG : DEFAULT_PRISMATIC_RESOLUTION_MM);
}

function searchWindow(joint: ScalarJoint, opts: SuggestJointRangesOpts | undefined): readonly [number, number] | null {
  return opts?.search ?? joint.limits ?? null;
}

function blockedReason(
  joint: ScalarJoint,
  search: readonly [number, number] | null,
  budgetLimit: number,
): JointRangeUnknownReason | undefined {
  if (search === null) return 'unbounded';
  if (!isFiniteWindow(search)) return 'invalid-bounds';
  if (joint.rest < search[0] || joint.rest > search[1]) return 'rest-outside-bounds';
  if (budgetLimit <= 0) return 'budget';
  return undefined;
}

function prepareJoint(joint: ScalarJoint, opts: SuggestJointRangesOpts | undefined, budgetLimit: number): PreparedJoint {
  const step = jointStep(joint.kind, opts);
  const resolution = jointResolution(joint.kind, opts);
  const search = searchWindow(joint, opts);
  const reason = blockedReason(joint, search, budgetLimit);
  const window = reason === 'invalid-bounds' ? null : search;
  const base = { ...joint, step, resolution, search: window, measure: false };
  if (reason !== undefined) return { ...base, blocked: unknownSide(reason) };
  return { ...base, measure: true };
}

async function suggestOne(
  joint: PreparedJoint,
  restReading: PoseReading | undefined,
  session: MeasureSession | undefined,
  opts: SuggestJointRangesOpts | undefined,
): Promise<JointRangeSuggestion> {
  const shell = (lower: JointRangeSide, upper: JointRangeSide, restWithinClearance: boolean): JointRangeSuggestion => ({
    joint: joint.name,
    kind: joint.kind,
    units: joint.kind === 'revolute' ? 'deg' : 'mm',
    limitsField: joint.kind === 'revolute' ? 'limitsDeg' : 'limitsMm',
    rest: joint.rest,
    authoredLimits: joint.limits,
    search: joint.search,
    step: joint.step,
    restWithinClearance,
    lower,
    upper,
  });

  if (joint.blocked !== undefined || joint.search === null) {
    const side = joint.blocked ?? unknownSide('unbounded');
    return shell(side, side, false);
  }
  if (restReading === undefined || restReading.kind === 'unknown') {
    const side = unknownSide(restReading?.reason ?? 'solve-failed');
    return shell(side, side, false);
  }
  if (restReading.kind === 'close') {
    const side: JointRangeSide = {
      status: 'stop',
      value: joint.rest,
      pair: restReading.pair,
      resolution: 0,
    };
    return shell(side, side, true);
  }

  if (session === undefined) {
    const side = unknownSide('solve-failed');
    return shell(side, side, false);
  }
  const lower = await walkSide(session, joint, joint.search[0], -1, opts);
  const upper = await walkSide(session, joint, joint.search[1], 1, opts);
  return shell(lower, upper, false);
}

async function walkSide(
  session: MeasureSession,
  joint: PreparedJoint,
  bound: number,
  direction: -1 | 1,
  opts: SuggestJointRangesOpts | undefined,
): Promise<JointRangeSide> {
  if (Math.abs(bound - joint.rest) <= 1e-12) {
    return { status: 'no-stop', value: bound };
  }
  const step = opts?.step ?? joint.step;
  const resolution = opts?.resolution ?? joint.resolution;
  const span = Math.abs(bound - joint.rest);
  const steps = Math.max(0, Math.floor((span - 1e-9) / step));
  let previous = joint.rest;
  for (let i = 1; i <= steps; i++) {
    const value = joint.rest + direction * i * step;
    const reading = await session.read(joint.name, value);
    if (reading.kind === 'unknown') return unknownSide(reading.reason);
    if (reading.kind === 'close') return bisect(session, joint.name, previous, value, reading.pair, resolution);
    previous = value;
  }
  if (Math.abs(previous - bound) > 1e-9) {
    const reading = await session.read(joint.name, bound);
    if (reading.kind === 'unknown') return unknownSide(reading.reason);
    if (reading.kind === 'close') return bisect(session, joint.name, previous, bound, reading.pair, resolution);
  }
  return { status: 'no-stop', value: bound };
}

async function bisect(
  session: MeasureSession,
  jointName: string,
  clearValue: number,
  closeValue: number,
  closePair: JointRangePair,
  resolution: number,
): Promise<JointRangeSide> {
  let lo = clearValue;
  let hi = closeValue;
  let pair = closePair;
  for (let i = 0; i < MAX_BISECTION_STEPS && Math.abs(hi - lo) > resolution; i++) {
    const mid = (lo + hi) / 2;
    const reading = await session.read(jointName, mid);
    if (reading.kind === 'unknown') return unknownSide(reading.reason);
    if (reading.kind === 'close') {
      hi = mid;
      pair = reading.pair;
    } else {
      lo = mid;
    }
  }
  // `lo` is the last pose whose exact distance was still outside the
  // clearance. `hi` is already inside it, by up to one resolution step.
  // Publishing `hi` would make the paste-ready limit miss the requested gap.
  return {
    status: 'stop',
    value: lo,
    pair,
    resolution: Math.abs(hi - lo),
  };
}

type MeasuredPart = TransformedPart & {
  readonly shape: NonNullable<TransformedPart['shape']>;
  readonly bbox: NonNullable<TransformedPart['bbox']>;
};

type PairDistance =
  | { readonly kind: 'stop'; readonly reading: PoseReading }
  | { readonly kind: 'distance'; readonly distance: number; readonly pair: JointRangePair };

function isMeasuredPart(part: TransformedPart): part is MeasuredPart {
  return part.shape !== undefined && part.bbox !== undefined;
}

function stoppedReading(reason: 'budget' | 'unmeasured'): PairDistance {
  return { kind: 'stop', reading: { kind: 'unknown', reason } };
}

function poseMemoKey(
  a: string,
  b: string,
  ta: Transform | undefined,
  tb: Transform | undefined,
): string | undefined {
  if (ta === undefined || tb === undefined) return undefined;
  return `${pairKey(a, b)}|${relativePoseKey(ta, tb)}`;
}

function finiteDistance(a: MeasuredPart, b: MeasuredPart): number | undefined {
  try {
    const distance = minDistanceBetweenShapes(wrappedShape(a.shape), wrappedShape(b.shape));
    if (distance === undefined || !Number.isFinite(distance)) return undefined;
    return distance;
  } catch {
    return undefined;
  }
}

function closestReading(
  closest: { readonly pair: JointRangePair; readonly distance: number } | undefined,
  clearance: number,
): PoseReading {
  if (closest !== undefined && closest.distance <= clearance + CLEARANCE_COMPARE_EPSILON_MM) {
    return { kind: 'close', pair: closest.pair };
  }
  return { kind: 'clear' };
}

class MeasureSession {
  private cache: SceneBackend | undefined;
  private faces = new Map<string, number>();
  private readonly distances = new Map<string, number | 'fail'>();
  private readonly exempt: ReadonlySet<string>;
  private readonly arm: Assembly;
  private readonly clearance: number;
  private readonly budget: Budget;

  constructor(arm: Assembly, clearance: number, budget: Budget) {
    this.arm = arm;
    this.clearance = clearance;
    this.budget = budget;
    this.exempt = exemptPairs(arm);
  }

  async read(jointName: string, value: number): Promise<PoseReading> {
    let scene: SceneBackend | undefined;
    try {
      scene = await sceneAt(this.arm, poseFor(this.arm, jointName, value), this.cache);
    } catch {
      return { kind: 'unknown', reason: 'solve-failed' };
    }
    if (scene === undefined) return { kind: 'unknown', reason: 'solve-failed' };
    if (this.cache === undefined) {
      this.cache = scene;
      this.faces = new Map(buildSweepProxies(scene).map((proxy) => [proxy.name, proxy.faces]));
    }
    return this.readingOf(scene);
  }

  private readingOf(scene: SceneBackend): PoseReading {
    const posed = scene.parts.map((part) => transformScenePart(part, []));
    const transforms = new Map(scene.parts.map((part) => [part.name, part.worldTransform]));
    let closest: { readonly pair: JointRangePair; readonly distance: number } | undefined;

    for (let i = 0; i < posed.length; i++) {
      for (let j = i + 1; j < posed.length; j++) {
        const pair = this.scanPair(posed[i]!, posed[j]!, transforms);
        if (pair === undefined) continue;
        if (pair.kind === 'stop') return pair.reading;
        if (closest === undefined || pair.distance < closest.distance) {
          closest = { pair: pair.pair, distance: pair.distance };
        }
      }
    }
    return closestReading(closest, this.clearance);
  }

  private scanPair(
    a: TransformedPart,
    b: TransformedPart,
    transforms: ReadonlyMap<string, Transform>,
  ): PairDistance | undefined {
    if (this.exempt.has(pairKey(a.name, b.name))) return undefined;
    if (!isMeasuredPart(a) || !isMeasuredPart(b)) return stoppedReading('unmeasured');
    if (bboxGap(a.bbox, b.bbox) > this.clearance + CLEARANCE_COMPARE_EPSILON_MM) return undefined;
    return this.measuredPair(a, b, transforms);
  }

  private measuredPair(
    a: MeasuredPart,
    b: MeasuredPart,
    transforms: ReadonlyMap<string, Transform>,
  ): PairDistance {
    const memoKey = poseMemoKey(a.name, b.name, transforms.get(a.name), transforms.get(b.name));
    if (memoKey !== undefined) {
      const cached = this.distances.get(memoKey);
      if (cached === 'fail') return stoppedReading('unmeasured');
      if (typeof cached === 'number') {
        return { kind: 'distance', distance: cached, pair: orderedPair(a.name, b.name) };
      }
    }
    return this.spendDistance(a, b, memoKey);
  }

  private spendDistance(a: MeasuredPart, b: MeasuredPart, memoKey: string | undefined): PairDistance {
    const weight = faceWeight(this.faces, a.name, b.name);
    if (!(this.budget.used + weight <= this.budget.limit)) return stoppedReading('budget');
    this.budget.used += weight;
    const distance = finiteDistance(a, b);
    this.rememberDistance(memoKey, distance);
    if (distance === undefined) return stoppedReading('unmeasured');
    return { kind: 'distance', distance, pair: orderedPair(a.name, b.name) };
  }

  private rememberDistance(memoKey: string | undefined, distance: number | undefined): void {
    if (memoKey === undefined) return;
    this.distances.set(memoKey, distance === undefined ? 'fail' : distance);
  }
}

function faceWeight(faces: ReadonlyMap<string, number>, a: string, b: string): number {
  const sum = (faces.get(a) ?? Number.POSITIVE_INFINITY) + (faces.get(b) ?? Number.POSITIVE_INFINITY);
  return Number.isFinite(sum) && sum > 0 ? sum : Number.POSITIVE_INFINITY;
}

function exemptPairs(arm: Assembly): Set<string> {
  const exempt = new Set<string>();
  const nameById = new Map(arm.__parts().map((part) => [part.id, part.name]));
  for (const mate of arm.__mates()) {
    const a = partOf(mate.a);
    const b = partOf(mate.b);
    if (a !== undefined && b !== undefined && a !== b) exempt.add(pairKey(a, b));
  }
  for (const joint of arm.__joints()) {
    const a = nameById.get(joint.parentPartId);
    const b = nameById.get(joint.childPartId);
    if (a !== undefined && b !== undefined && a !== b) exempt.add(pairKey(a, b));
  }
  for (const contact of arm.__pairTolerances().contacts) {
    exempt.add(pairKey(contact.parts[0], contact.parts[1]));
  }
  for (const disabled of arm.__disabledCollisions()) {
    exempt.add(pairKey(disabled.link1, disabled.link2));
  }
  return exempt;
}

function partOf(ref: string): string | undefined {
  try {
    return parseConnectorRef(ref).partName;
  } catch {
    return undefined;
  }
}

function listScalarJoints(arm: Assembly): ScalarJoint[] {
  const out: ScalarJoint[] = [];
  const seen = new Set<string>();
  for (const joint of arm.__joints()) {
    if (joint.kind !== 'revolute' && joint.kind !== 'prismatic') continue;
    seen.add(joint.name);
    out.push({
      name: joint.name,
      kind: joint.kind,
      limits: joint.kind === 'revolute' ? joint.limitsDeg ?? null : joint.limitsMm ?? null,
      rest: 0,
    });
  }
  for (const mate of arm.__mates()) {
    if (mate.type !== 'revolute' && mate.type !== 'prismatic') continue;
    if (seen.has(mate.name)) continue;
    out.push({
      name: mate.name,
      kind: mate.type,
      limits: mate.type === 'revolute' ? mate.limitsDeg ?? null : mate.limitsMm ?? null,
      rest: mateRest(mate, arm),
    });
  }
  return out;
}

function mateRest(mate: MateRecord, arm: Assembly): number {
  if (mate.pose === undefined || Array.isArray(mate.pose)) return 0;
  const value = currentValue(mate.pose as Editable<number>, arm.__session().paramTable);
  return Number.isFinite(value) ? value : 0;
}

/** Authored pose of every independent scalar mate, with one joint overridden.
 *  Coupled driven mates are left unset so they follow their source. */
function poseFor(arm: Assembly, jointName: string, value: number): NumericPoses {
  const driven = new Set(arm.__mateCouplings().map((coupling) => coupling.driven));
  const poses: NumericPoses = {};
  if (!jointGraphHasLoops(arm.__joints())) {
    for (const joint of arm.__joints()) {
      if (joint.kind === 'fixed') continue;
      poses[joint.name] = joint.kind === 'ball' ? [0, 0, 0] : 0;
    }
  }
  for (const mate of arm.__mates()) {
    if (mate.type !== 'revolute' && mate.type !== 'prismatic') continue;
    if (driven.has(mate.name) && mate.name !== jointName) continue;
    poses[mate.name] = mateRest(mate, arm);
  }
  poses[jointName] = value;
  return poses;
}

async function sceneAt(
  arm: Assembly,
  poses: NumericPoses,
  cache: SceneBackend | undefined,
): Promise<SceneBackend | undefined> {
  if (cache !== undefined) {
    const transforms = await transformsFor(arm, poses);
    if (transforms !== undefined) {
      const reposed = reposedLoweredAssemblyScene(arm, cache, transforms);
      if (reposed !== undefined) return reposed;
    }
  }
  return lowerAssembly(arm, poses);
}

async function transformsFor(
  arm: Assembly,
  poses: NumericPoses,
): Promise<ReadonlyMap<string, Transform> | undefined> {
  const articulated = arm.__joints().some((joint) => joint.kind !== 'fixed');
  const mates = arm.__mates().length > 0;
  if (articulated && mates) return undefined;
  if (articulated) {
    const fk = forwardKinematics(arm.__parts(), arm.__joints(), poses);
    const byName = new Map<string, Transform>();
    for (const part of arm.__parts()) {
      const placement = fk.get(part.id);
      if (placement === undefined) return undefined;
      byName.set(part.name, placement);
    }
    return byName;
  }
  const solved = await solveMates(arm, poses);
  if (solved.status !== 'solved' && solved.status !== 'under-constrained' && solved.status !== 'redundant-ok') {
    return undefined;
  }
  return solved.poses;
}

async function lowerAssembly(arm: Assembly, poses: NumericPoses): Promise<SceneBackend | undefined> {
  await initOcct();
  const scene = await arm.solvedModel(poses, { validate: 'off' });
  const engine = new RecomputeEngine(createOcctLowerer(arm.__session()));
  const result = await engine.run(arm.__session().getRecords(), {
    paramTable: arm.__session().paramTable,
    gatedFeatureNames: arm.__session().gatedFeatureNames,
    seedShapes: arm.__session().reusableLoweredPrefix(),
  });
  const sourceId = scene.__sourceFeatureId();
  arm.__session().discardProbeRecord(sourceId);
  if (sourceId === undefined) return undefined;
  const lowered = result.shapes.get(sourceId);
  if (!lowered || !isSceneBackend(lowered)) return undefined;
  return lowered;
}

function patchFor(joint: JointRangeSuggestion): JointLimitPatch[] {
  if (joint.restWithinClearance) return [];
  if (joint.lower.status === 'unknown' || joint.upper.status === 'unknown') return [];
  if (joint.lower.status !== 'stop' && joint.upper.status !== 'stop') return [];
  if (joint.lower.value === undefined || joint.upper.value === undefined) return [];
  const limits: readonly [number, number] = [joint.lower.value, joint.upper.value];
  const lower = joint.lower.status === 'stop' ? 'stop' : 'bound';
  const upper = joint.upper.status === 'stop' ? 'stop' : 'bound';
  return [{
    joint: joint.joint,
    limitsField: joint.limitsField,
    limits,
    lower,
    upper,
    snippet: `${joint.limitsField}: [${formatValue(limits[0])}, ${formatValue(limits[1])}]`,
  }];
}

function formatSnippet(patch: readonly JointLimitPatch[]): string {
  if (patch.length === 0) return '';
  const lines = ['// Suggested mate limits from geometry. Not applied.'];
  for (const entry of patch) {
    const lower = entry.lower === 'stop' ? 'lower stop is geometric' : 'lower is the search bound';
    const upper = entry.upper === 'stop' ? 'upper stop is geometric' : 'upper is the search bound';
    lines.push(`// ${entry.joint}: ${lower}; ${upper}`);
    lines.push(`// ${entry.snippet}`);
  }
  return lines.join('\n');
}

function formatValue(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded);
}

function unknownSide(reason: JointRangeUnknownReason): JointRangeSide {
  return { status: 'unknown', reason };
}

function orderedPair(a: string, b: string): JointRangePair {
  return a < b ? { a, b } : { a: b, b: a };
}

function isFiniteWindow(search: readonly [number, number]): boolean {
  return Number.isFinite(search[0]) && Number.isFinite(search[1]) && search[0] <= search[1];
}
