// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Per-pose tooth geometry of an external spur pair. Distance and common
// volume come from the BREP kernel (BRepExtrema and BRepAlgoAPI_Common).
// Nothing here rates bending strength or load capacity.

import type { OcctBackend } from '../kernel/backends/occt/occtBackend';
import { Transform } from '../shared/runtime/se3';
import { KernelError } from '../shared/intent/kernelError';
import { invalidArgs } from '../shared/intent/invalidArgs';
import { wrappedShape } from './runtime/brepDistance';
import { closestSpurGearFaces } from './spurGearLateralDistance';
import {
  SPUR_GEAR_BACKLASH_SEARCH_STEPS,
  SPUR_GEAR_CLEARANCE_REFINEMENT_STEPS,
  SPUR_GEAR_CONTACT_EPS_MM,
  SPUR_GEAR_INTERFERENCE_VOLUME_MM3,
  SPUR_GEAR_MAX_CYCLE_SAMPLES,
  SPUR_GEAR_MIN_CYCLE_SAMPLES,
  SPUR_GEAR_VOLUME_PROBE_DISTANCE_MM,
  aggregateSpurClearance,
  backlashSearchStepMm,
  spurVolumeInterferes,
  teethNearFacing,
  toothIndex,
} from './spurGearPairMath';

export interface SpurGearToothPair {
  driver: number;
  driven: number;
}

export type SpurGearSampleOrigin = 'uniform' | 'revolution' | 'refined';

export interface SpurGearToothSample {
  driverDeg: number;
  drivenDeg: number;
  /** Where this pose came from. `refined` was inserted beside the minimum. */
  sampledBy: SpurGearSampleOrigin;
  /** Exact BREP distance, mm. Zero when the solids touch or overlap. */
  clearanceMm: number;
  /** Exact common volume, mm³. Computed only when the distance is at most 1e-4 mm. */
  interferenceVolumeMm3: number;
  /** True when `interferenceVolumeMm3` is strictly above the report floor, 0.001 mm³. */
  interfering: boolean;
  /** The single nearest BREP point pair, labelled by tooth. Not every simultaneous contact. */
  nearestToothPair: SpurGearToothPair;
  /** Teeth within 1.5 pitches of the line of centres. Analytic, not measured. */
  candidateToothPairs: SpurGearToothPair[];
}

export interface SpurGearBacklashFlank {
  drivenDeg: number;
  /** Pitch-circle arc from the authored phase to this flank, mm. */
  arcMm: number;
  driverTooth: number;
  drivenTooth: number;
  reached: boolean;
}

export interface SpurGearToothInterferenceReport {
  kind: 'geometry';
  centerDistanceMm: number;
  pitchCenterDistanceMm: number;
  ratio: number;
  /** Authored circular backlash, mm. Not a measured value. */
  authoredBacklashMm: number;
  samples: SpurGearToothSample[];
  revolutionSamples?: SpurGearToothSample[];
  /**
   * Poses inserted beside the lowest uniform clearance. Empty when a uniform
   * pose already interferes: that pose already fixes the aggregate.
   */
  refinedSamples: SpurGearToothSample[];
  /**
   * Always true. `anyInterference`, `maxInterferenceVolumeMm3` and
   * `minClearanceMm` are aggregates of `aggregatedPoseCount` poses. They do
   * not prove the driver-angle gaps between those poses.
   */
  sampleLimited: true;
  /** The only scope those three aggregates have. */
  clearanceScope: 'sampled-poses';
  /** Uniform tooth poses, optional revolution poses, and refined poses. */
  aggregatedPoseCount: number;
  /** Driver degrees between the requested tooth-cycle poses. */
  uniformToothStepDeg: number;
  /** Refinement rounds run beside the minimum. Zero when a pose already interferes. */
  refinementSteps: number;
  /**
   * Largest driver-angle gap that still touches the minimum-clearance pose,
   * degrees. Clearance inside that gap was not measured.
   */
  unresolvedStepDeg: number;
  /**
   * Driver angle of the lowest BREP distance. When `minClearanceMm` is null,
   * that pose's distance collapsed on a common volume at or below the floor.
   */
  minClearanceDriverDeg: number;
  /** States that the clearance aggregates are sample-limited. */
  aggregateNote: string;
  /**
   * Common volume, mm³, strictly above which a pose is tooth interference.
   * Same value as `SPUR_GEAR_INTERFERENCE_VOLUME_MM3`. A fixed absolute
   * volume for every module and face width.
   */
  interferenceVolumeFloorMm3: number;
  /** True when any aggregated pose is above `interferenceVolumeFloorMm3`. */
  anyInterference: boolean;
  /** Largest common volume, mm³, including volumes at or below the floor. */
  maxInterferenceVolumeMm3: number;
  /**
   * 0 when `anyInterference` is true. Also 0 for zero-volume contact
   * (distance 0 and common volume 0) while `anyInterference` stays false.
   * Otherwise the minimum BREP distance among poses that are not a positive
   * common volume at or below the floor. Null when every aggregated pose is
   * in that band.
   */
  minClearanceMm: number | null;
  /**
   * Pitch-circle arc of the driven gear between the two flank-contact poses,
   * driver held fixed. Equals the authored circular backlash when the flanks
   * are free. Zero when the authored phase already touches.
   */
  backlashMm: number;
  /**
   * Pitch-circle arc of one remaining bisection bracket on one flank, mm.
   * Each reported flank can sit this far past first contact, so the sum can
   * differ from the true free arc by up to twice this step.
   */
  backlashStepMm: number;
  backlashReached: boolean;
  backlashNote: string;
  positiveFlank: SpurGearBacklashFlank;
  negativeFlank: SpurGearBacklashFlank;
  note: string;
}

export interface SpurGearToothInterferenceOptions {
  /** Poses across one driver tooth. Default 8. Integer in [2, 36]. */
  cycleSamples?: number;
  /** Also sample a full driver revolution. Default false. */
  wholeRevolution?: boolean;
  /** Poses across 360° of the driver when `wholeRevolution` is set. Default 4. */
  revolutionSamples?: number;
}

export interface SpurGearPairMeasureSpec {
  teeth: number;
  drivenTeeth: number;
  module: number;
  alignDeg: number;
  phaseDeg: number;
  centerDistanceMm: number;
  pitchCenterDistanceMm: number;
  ratio: number;
  backlashMm: number;
  /** Tip radius of the driver solid, mm. Used to reject a buried-gear pose. */
  driverTipRadiusMm: number;
  /** Tip radius of the driven solid, mm. */
  drivenTipRadiusMm: number;
}

/** Distance 0 and common volume 0: clearance closes, the interference flag stays false. */
const EXACT_CONTACT_CLEARANCE_TEXT =
  'Zero-volume contact (common volume 0 and distance 0) sets minClearanceMm to 0 while anyInterference stays false.';

/**
 * The cutoff is absolute mm³. Similar teeth grow transverse overlap area
 * with the square of the module, and volume is that area times face width.
 */
const VOLUME_FLOOR_SCALE_TEXT =
  `The ${SPUR_GEAR_INTERFERENCE_VOLUME_MM3} mm³ floor is a fixed absolute volume for every module and face width. Overlap volume is the transverse overlap area times the face width, and similar teeth grow that area with the square of the module, so this floor is a larger share of a tooth on a fine module and a smaller share on a coarse module or a wide face.`;

const GEOMETRY_NOTE =
  `Geometry only. anyInterference, maxInterferenceVolumeMm3 and minClearanceMm aggregate the listed sampled poses, including poses refined beside the minimum. They do not prove clearance between those poses. A common volume strictly above interferenceVolumeFloorMm3 (${SPUR_GEAR_INTERFERENCE_VOLUME_MM3} mm³) is tooth interference: anyInterference is then true and minClearanceMm is 0. A positive common volume at or below that floor is not interference and does not set minClearanceMm to 0. When every sampled pose is in that band, minClearanceMm is null. ${EXACT_CONTACT_CLEARANCE_TEXT} ${VOLUME_FLOOR_SCALE_TEXT} Clearance on each pose is the exact BREP distance and interference volume is the exact common solid at each sampled pose. This is not a tooth-strength, stress, or load-capacity result, and it is not a continuous no-interference certificate.`;

interface PoseHit {
  distanceMm: number;
  volumeMm3: number;
  onDriver: [number, number, number];
  onDriven: [number, number, number];
}

function poseAround(solid: OcctBackend, deg: number, pivotX: number): OcctBackend {
  if (Math.abs(deg) < 1e-12) return solid;
  return solid.located(Transform.rotationAroundPivot([0, 0, 1], deg, [pivotX, 0, 0]));
}

function measurePose(driver: OcctBackend, driven: OcctBackend, spec: SpurGearPairMeasureSpec): PoseHit {
  const hit = closestSpurGearFaces(
    wrappedShape(driver),
    wrappedShape(driven),
    spec.centerDistanceMm,
    spec.driverTipRadiusMm,
    spec.drivenTipRadiusMm,
  );
  if (hit === undefined) {
    throw new KernelError(
      'feature.kernel-failed',
      'spurGearPair tooth interference could not measure the BREP distance between the posed gears.',
      'spurGearPair',
      'The distance query failed. The solids may be empty.',
    );
  }
  const volumeMm3 = hit.distance <= SPUR_GEAR_VOLUME_PROBE_DISTANCE_MM
    ? driver.intersectionVolume(driven)
    : 0;
  return {
    distanceMm: hit.distance,
    volumeMm3,
    onDriver: hit.onA,
    onDriven: hit.onB,
  };
}

function labelledTeeth(
  hit: PoseHit,
  spec: SpurGearPairMeasureSpec,
  driverDeg: number,
  drivenDeg: number,
): SpurGearToothPair {
  const driverWorld = Math.atan2(hit.onDriver[1], hit.onDriver[0]) * (180 / Math.PI);
  const drivenWorld = Math.atan2(hit.onDriven[1], hit.onDriven[0] - spec.centerDistanceMm) * (180 / Math.PI);
  return {
    driver: toothIndex(driverWorld, driverDeg, spec.teeth),
    driven: toothIndex(drivenWorld, spec.alignDeg + spec.phaseDeg + drivenDeg, spec.drivenTeeth),
  };
}

function candidateToothPairs(
  spec: SpurGearPairMeasureSpec,
  driverDeg: number,
  drivenDeg: number,
): SpurGearToothPair[] {
  const drivers = teethNearFacing(0, driverDeg, spec.teeth, 1.5);
  const drivenPlacement = spec.alignDeg + spec.phaseDeg + drivenDeg;
  const drivens = teethNearFacing(180, drivenPlacement, spec.drivenTeeth, 1.5);
  const out: SpurGearToothPair[] = [];
  for (const driver of drivers) {
    for (const driven of drivens) out.push({ driver, driven });
  }
  return out;
}

async function sampleAt(
  driver: OcctBackend,
  driven: OcctBackend,
  spec: SpurGearPairMeasureSpec,
  driverDeg: number,
  sampledBy: SpurGearSampleOrigin,
): Promise<SpurGearToothSample> {
  await Promise.resolve();
  const drivenDeg = spec.ratio * driverDeg;
  const hit = measurePose(
    poseAround(driver, driverDeg, 0),
    poseAround(driven, drivenDeg, spec.centerDistanceMm),
    spec,
  );
  return {
    driverDeg,
    drivenDeg,
    sampledBy,
    clearanceMm: hit.distanceMm,
    interferenceVolumeMm3: hit.volumeMm3,
    interfering: spurVolumeInterferes(hit.volumeMm3),
    nearestToothPair: labelledTeeth(hit, spec, driverDeg, drivenDeg),
    candidateToothPairs: candidateToothPairs(spec, driverDeg, drivenDeg),
  };
}

function sampleCount(value: number | undefined, fallback: number, label: string): number {
  const n = value ?? fallback;
  if (!Number.isInteger(n) || n < SPUR_GEAR_MIN_CYCLE_SAMPLES || n > SPUR_GEAR_MAX_CYCLE_SAMPLES) {
    invalidArgs({
      api: 'spurGearPair(...).toothInterference(opts)',
      path: label,
      got: value,
      showType: true,
      requires: `an integer in [${SPUR_GEAR_MIN_CYCLE_SAMPLES}, ${SPUR_GEAR_MAX_CYCLE_SAMPLES}] — each pose is an exact BREP distance`,
      example: 'pair.toothInterference({ cycleSamples: 8 })',
      featureId: 'spurGearPair',
    });
  }
  return n;
}

async function samplesOver(
  driver: OcctBackend,
  driven: OcctBackend,
  spec: SpurGearPairMeasureSpec,
  count: number,
  driverSpanDeg: number,
  sampledBy: 'uniform' | 'revolution',
): Promise<SpurGearToothSample[]> {
  const out: SpurGearToothSample[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(await sampleAt(driver, driven, spec, (i * driverSpanDeg) / count, sampledBy));
  }
  return out;
}

function lowestClearance(samples: readonly SpurGearToothSample[]): SpurGearToothSample {
  let best = samples[0];
  if (best === undefined) {
    throw new KernelError(
      'feature.kernel-failed',
      'spurGearPair tooth interference had no sampled poses to aggregate.',
      'spurGearPair',
      'cycleSamples must be at least 2.',
    );
  }
  for (const sample of samples) {
    if (sample.clearanceMm < best.clearanceMm) best = sample;
  }
  return best;
}

/** Forward distance from `fromDeg` to `toDeg` along a circle of `spanDeg`. */
function circularDistance(fromDeg: number, toDeg: number, spanDeg: number): number {
  const d = (toDeg - fromDeg) % spanDeg;
  return d < 0 ? d + spanDeg : d;
}

function wrapSpan(deg: number, spanDeg: number): number {
  const wrapped = deg % spanDeg;
  return wrapped < 0 ? wrapped + spanDeg : wrapped;
}

function neighborDeg(
  pool: readonly SpurGearToothSample[],
  atDeg: number,
  spanDeg: number,
  direction: 'forward' | 'back',
): number {
  let best = spanDeg;
  let angle = atDeg;
  for (const other of pool) {
    const delta = direction === 'forward'
      ? circularDistance(atDeg, other.driverDeg, spanDeg)
      : circularDistance(other.driverDeg, atDeg, spanDeg);
    if (delta > 1e-9 && delta < best) {
      best = delta;
      angle = other.driverDeg;
    }
  }
  return angle;
}

/** Largest driver-angle gap that still touches `sample` inside `pool`. */
function gapBeside(
  sample: SpurGearToothSample,
  pool: readonly SpurGearToothSample[],
  spanDeg: number,
): number {
  const left = circularDistance(neighborDeg(pool, sample.driverDeg, spanDeg, 'back'), sample.driverDeg, spanDeg);
  const right = circularDistance(sample.driverDeg, neighborDeg(pool, sample.driverDeg, spanDeg, 'forward'), spanDeg);
  return Math.max(left, right);
}

/**
 * Sample the midpoint on each side of the current minimum, then follow
 * whichever pose is lower. `steps` rounds halve the gap beside that pose.
 */
async function refineBesideMinimum(
  driver: OcctBackend,
  driven: OcctBackend,
  spec: SpurGearPairMeasureSpec,
  pool: readonly SpurGearToothSample[],
  spanDeg: number,
  steps: number,
): Promise<SpurGearToothSample[]> {
  const known = [...pool];
  let best = lowestClearance(known);
  const added: SpurGearToothSample[] = [];
  for (let i = 0; i < steps; i += 1) {
    const leftDeg = neighborDeg(known, best.driverDeg, spanDeg, 'back');
    const rightDeg = neighborDeg(known, best.driverDeg, spanDeg, 'forward');
    const leftMid = wrapSpan(
      leftDeg + circularDistance(leftDeg, best.driverDeg, spanDeg) / 2,
      spanDeg,
    );
    const rightMid = wrapSpan(
      best.driverDeg + circularDistance(best.driverDeg, rightDeg, spanDeg) / 2,
      spanDeg,
    );
    const leftSample = await sampleAt(driver, driven, spec, leftMid, 'refined');
    const rightSample = await sampleAt(driver, driven, spec, rightMid, 'refined');
    added.push(leftSample, rightSample);
    known.push(leftSample, rightSample);
    best = lowestClearance([best, leftSample, rightSample]);
  }
  return added;
}

function aggregateNoteOf(
  poseCount: number,
  unresolvedStepDeg: number,
  refinementSteps: number,
): string {
  const refined = refinementSteps === 0
    ? 'Refinement was skipped because a sampled pose already interferes.'
    : `Refinement added ${refinementSteps * 2} poses beside the minimum, ${refinementSteps} steps on each side.`;
  return `anyInterference, maxInterferenceVolumeMm3 and minClearanceMm aggregate ${poseCount} sampled poses. The largest driver-angle gap still touching the minimum-clearance pose is ${unresolvedStepDeg.toFixed(4)}°. ${refined} These fields do not prove clearance between samples. anyInterference is a common volume strictly above ${SPUR_GEAR_INTERFERENCE_VOLUME_MM3} mm³, and that case sets minClearanceMm to 0. A smaller positive volume does not set minClearanceMm to 0. ${EXACT_CONTACT_CLEARANCE_TEXT} ${VOLUME_FLOOR_SCALE_TEXT}`;
}

interface FlankSearch {
  flank: SpurGearBacklashFlank;
  overlapping: boolean;
}

async function searchFlankAt(
  driver: OcctBackend,
  driven: OcctBackend,
  spec: SpurGearPairMeasureSpec,
  sign: 1 | -1,
  rest: PoseHit,
  halfPitchDeg: number,
  pitchRadius: number,
): Promise<FlankSearch> {
  const restTeeth = labelledTeeth(rest, spec, 0, 0);
  if (rest.distanceMm <= SPUR_GEAR_CONTACT_EPS_MM) {
    return {
      overlapping: true,
      flank: {
        drivenDeg: 0,
        arcMm: 0,
        driverTooth: restTeeth.driver,
        drivenTooth: restTeeth.driven,
        reached: false,
      },
    };
  }
  const at = async (deg: number): Promise<PoseHit> => {
    await Promise.resolve();
    return measurePose(driver, poseAround(driven, sign * deg, spec.centerDistanceMm), spec);
  };
  const bound = await at(halfPitchDeg);
  if (bound.distanceMm > SPUR_GEAR_CONTACT_EPS_MM) {
    const teeth = labelledTeeth(bound, spec, 0, sign * halfPitchDeg);
    return {
      overlapping: false,
      flank: {
        drivenDeg: sign * halfPitchDeg,
        arcMm: halfPitchDeg * (Math.PI / 180) * pitchRadius,
        driverTooth: teeth.driver,
        drivenTooth: teeth.driven,
        reached: false,
      },
    };
  }
  let lo = 0;
  let hi = halfPitchDeg;
  let contact = bound;
  for (let i = 0; i < SPUR_GEAR_BACKLASH_SEARCH_STEPS; i += 1) {
    const mid = (lo + hi) / 2;
    const hit = await at(mid);
    if (hit.distanceMm <= SPUR_GEAR_CONTACT_EPS_MM) {
      hi = mid;
      contact = hit;
    } else {
      lo = mid;
    }
  }
  const teeth = labelledTeeth(contact, spec, 0, sign * hi);
  return {
    overlapping: false,
    flank: {
      drivenDeg: sign * hi,
      arcMm: hi * (Math.PI / 180) * pitchRadius,
      driverTooth: teeth.driver,
      drivenTooth: teeth.driven,
      reached: true,
    },
  };
}

function backlashOf(
  positive: FlankSearch,
  negative: FlankSearch,
  halfPitchDeg: number,
): { backlashMm: number; backlashReached: boolean; backlashNote: string } {
  if (positive.overlapping || negative.overlapping) {
    return {
      backlashMm: 0,
      backlashReached: false,
      backlashNote: 'At the authored phase the flanks already touch or overlap, so the free arc was not searched.',
    };
  }
  const backlashMm = positive.flank.arcMm + negative.flank.arcMm;
  const reached = positive.flank.reached && negative.flank.reached;
  const step = halfPitchDeg / 2 ** SPUR_GEAR_BACKLASH_SEARCH_STEPS;
  if (!reached) {
    return {
      backlashMm,
      backlashReached: false,
      backlashNote: `A flank stayed clear inside half a driven tooth (${halfPitchDeg}°). backlashMm is the searched arc, not a measured contact-to-contact play.`,
    };
  }
  return {
    backlashMm,
    backlashReached: true,
    backlashNote: `Pitch-circle arc of the driven gear from one flank contact to the other, driver held fixed. ${SPUR_GEAR_BACKLASH_SEARCH_STEPS} bisections; the arc can sit up to one step (${step.toFixed(4)}°) past first contact. Geometry only.`,
  };
}

interface SamplePlan {
  cycleSamples: number;
  whole: boolean;
  revolutionCount: number;
}

function samplePlan(opts: SpurGearToothInterferenceOptions | undefined): SamplePlan {
  const whole = opts?.wholeRevolution === true;
  return {
    cycleSamples: sampleCount(opts?.cycleSamples, 8, 'opts.cycleSamples'),
    whole,
    revolutionCount: whole
      ? sampleCount(opts?.revolutionSamples, 4, 'opts.revolutionSamples')
      : 0,
  };
}

interface RefinementDomain {
  spanDeg: number;
  pool: readonly SpurGearToothSample[];
  /** True when the revolution set is lower, so refinement stays on that circle. */
  usesRevolution: boolean;
}

function refinementDomain(
  samples: readonly SpurGearToothSample[],
  revolution: readonly SpurGearToothSample[] | undefined,
  toothSpanDeg: number,
): RefinementDomain {
  if (revolution === undefined) {
    return { spanDeg: toothSpanDeg, pool: samples, usesRevolution: false };
  }
  const toothMin = lowestClearance(samples);
  const revolutionMin = lowestClearance(revolution);
  if (revolutionMin.clearanceMm < toothMin.clearanceMm - 1e-4) {
    return { spanDeg: 360, pool: revolution, usesRevolution: true };
  }
  return { spanDeg: toothSpanDeg, pool: samples, usesRevolution: false };
}

async function refinedPoses(
  driver: OcctBackend,
  driven: OcctBackend,
  spec: SpurGearPairMeasureSpec,
  uniform: readonly SpurGearToothSample[],
  domain: RefinementDomain,
): Promise<{ refinedSamples: SpurGearToothSample[]; refinementSteps: number }> {
  if (uniform.some((sample) => sample.interfering)) {
    return { refinedSamples: [], refinementSteps: 0 };
  }
  const refinedSamples = await refineBesideMinimum(
    driver,
    driven,
    spec,
    domain.pool,
    domain.spanDeg,
    SPUR_GEAR_CLEARANCE_REFINEMENT_STEPS,
  );
  return { refinedSamples, refinementSteps: SPUR_GEAR_CLEARANCE_REFINEMENT_STEPS };
}

function poseListedIn(
  pool: readonly SpurGearToothSample[] | undefined,
  sample: SpurGearToothSample,
): boolean {
  return pool !== undefined && pool.includes(sample);
}

/**
 * Driver-angle gap that still touches the minimum. A revolution minimum is
 * measured on the 360° set. A tooth-cycle minimum ignores revolution inserts.
 */
function unresolvedBesideMinimum(
  samples: readonly SpurGearToothSample[],
  revolution: readonly SpurGearToothSample[] | undefined,
  refinedSamples: readonly SpurGearToothSample[],
  toothSpanDeg: number,
  usesRevolution: boolean,
  aggregated: readonly SpurGearToothSample[],
): { minSample: SpurGearToothSample; unresolvedStepDeg: number } {
  const minSample = lowestClearance(aggregated);
  const minInRevolution = poseListedIn(revolution, minSample)
    || (usesRevolution && poseListedIn(refinedSamples, minSample));
  if (minInRevolution) {
    const revolutionPool = revolution ?? [];
    const pool = usesRevolution ? revolutionPool.concat(refinedSamples) : revolutionPool;
    return { minSample, unresolvedStepDeg: gapBeside(minSample, pool, 360) };
  }
  const pool = usesRevolution ? [...samples] : samples.concat(refinedSamples);
  return { minSample, unresolvedStepDeg: gapBeside(minSample, pool, toothSpanDeg) };
}

export async function measureToothInterference(
  driver: OcctBackend,
  driven: OcctBackend,
  spec: SpurGearPairMeasureSpec,
  drivenPitchRadiusMm: number,
  opts: SpurGearToothInterferenceOptions | undefined,
): Promise<SpurGearToothInterferenceReport> {
  const plan = samplePlan(opts);
  const halfPitchDeg = 180 / spec.drivenTeeth;
  const rest = measurePose(driver, driven, spec);
  const positive = await searchFlankAt(driver, driven, spec, 1, rest, halfPitchDeg, drivenPitchRadiusMm);
  const negative = await searchFlankAt(driver, driven, spec, -1, rest, halfPitchDeg, drivenPitchRadiusMm);
  const play = backlashOf(positive, negative, halfPitchDeg);
  const toothSpanDeg = 360 / spec.teeth;
  const samples = await samplesOver(driver, driven, spec, plan.cycleSamples, toothSpanDeg, 'uniform');
  const revolution = plan.whole
    ? await samplesOver(driver, driven, spec, plan.revolutionCount, 360, 'revolution')
    : undefined;
  const domain = refinementDomain(samples, revolution, toothSpanDeg);
  const uniform = revolution === undefined ? samples : samples.concat(revolution);
  const { refinedSamples, refinementSteps } = await refinedPoses(driver, driven, spec, uniform, domain);
  const aggregated = uniform.concat(refinedSamples);
  const { minSample, unresolvedStepDeg } = unresolvedBesideMinimum(
    samples,
    revolution,
    refinedSamples,
    toothSpanDeg,
    domain.usesRevolution,
    aggregated,
  );
  const sum = aggregateSpurClearance(aggregated);
  return {
    kind: 'geometry',
    centerDistanceMm: spec.centerDistanceMm,
    pitchCenterDistanceMm: spec.pitchCenterDistanceMm,
    ratio: spec.ratio,
    authoredBacklashMm: spec.backlashMm,
    samples,
    ...(revolution !== undefined ? { revolutionSamples: revolution } : {}),
    refinedSamples,
    sampleLimited: true,
    clearanceScope: 'sampled-poses',
    aggregatedPoseCount: aggregated.length,
    uniformToothStepDeg: toothSpanDeg / plan.cycleSamples,
    refinementSteps,
    unresolvedStepDeg,
    minClearanceDriverDeg: minSample.driverDeg,
    aggregateNote: aggregateNoteOf(aggregated.length, unresolvedStepDeg, refinementSteps),
    interferenceVolumeFloorMm3: SPUR_GEAR_INTERFERENCE_VOLUME_MM3,
    ...sum,
    ...play,
    backlashStepMm: backlashSearchStepMm(spec.drivenTeeth, drivenPitchRadiusMm),
    positiveFlank: positive.flank,
    negativeFlank: negative.flank,
    note: GEOMETRY_NOTE,
  };
}
