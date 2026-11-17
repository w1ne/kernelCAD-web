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
import { brepExtremaClosestBetween, wrappedShape } from './runtime/brepDistance';
import {
  SPUR_GEAR_BACKLASH_SEARCH_STEPS,
  SPUR_GEAR_CONTACT_EPS_MM,
  SPUR_GEAR_INTERFERENCE_VOLUME_MM3,
  SPUR_GEAR_MAX_CYCLE_SAMPLES,
  SPUR_GEAR_MIN_CYCLE_SAMPLES,
  SPUR_GEAR_VOLUME_PROBE_DISTANCE_MM,
  teethNearFacing,
  toothIndex,
} from './spurGearPairMath';

export interface SpurGearToothPair {
  driver: number;
  driven: number;
}

export interface SpurGearToothSample {
  driverDeg: number;
  drivenDeg: number;
  /** Exact BREP distance, mm. Zero when the solids touch or overlap. */
  clearanceMm: number;
  /** Exact common volume, mm³. Computed only when the distance is at most 1e-4 mm. */
  interferenceVolumeMm3: number;
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
  anyInterference: boolean;
  maxInterferenceVolumeMm3: number;
  minClearanceMm: number;
  /**
   * Pitch-circle arc of the driven gear between the two flank-contact poses,
   * driver held fixed. Equals the authored circular backlash when the flanks
   * are free. Zero when the authored phase already touches.
   */
  backlashMm: number;
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
}

const GEOMETRY_NOTE =
  'Geometry only. Clearance is the exact BREP distance and interference volume is the exact common solid at each sampled pose. This is not a tooth-strength, stress, or load-capacity result.';

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

function measurePose(driver: OcctBackend, driven: OcctBackend): PoseHit {
  const hit = brepExtremaClosestBetween(wrappedShape(driver), wrappedShape(driven));
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
): Promise<SpurGearToothSample> {
  await Promise.resolve();
  const drivenDeg = spec.ratio * driverDeg;
  const hit = measurePose(
    poseAround(driver, driverDeg, 0),
    poseAround(driven, drivenDeg, spec.centerDistanceMm),
  );
  return {
    driverDeg,
    drivenDeg,
    clearanceMm: hit.distanceMm,
    interferenceVolumeMm3: hit.volumeMm3,
    interfering: hit.volumeMm3 > SPUR_GEAR_INTERFERENCE_VOLUME_MM3,
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
): Promise<SpurGearToothSample[]> {
  const out: SpurGearToothSample[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(await sampleAt(driver, driven, spec, (i * driverSpanDeg) / count));
  }
  return out;
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
    return measurePose(driver, poseAround(driven, sign * deg, spec.centerDistanceMm));
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

function totals(samples: readonly SpurGearToothSample[]): {
  anyInterference: boolean;
  maxInterferenceVolumeMm3: number;
  minClearanceMm: number;
} {
  let anyInterference = false;
  let maxInterferenceVolumeMm3 = 0;
  let minClearanceMm = Number.POSITIVE_INFINITY;
  for (const sample of samples) {
    if (sample.interfering) anyInterference = true;
    if (sample.interferenceVolumeMm3 > maxInterferenceVolumeMm3) {
      maxInterferenceVolumeMm3 = sample.interferenceVolumeMm3;
    }
    if (sample.clearanceMm < minClearanceMm) minClearanceMm = sample.clearanceMm;
  }
  if (!Number.isFinite(minClearanceMm)) minClearanceMm = 0;
  return { anyInterference, maxInterferenceVolumeMm3, minClearanceMm };
}

export async function measureToothInterference(
  driver: OcctBackend,
  driven: OcctBackend,
  spec: SpurGearPairMeasureSpec,
  drivenPitchRadiusMm: number,
  opts: SpurGearToothInterferenceOptions | undefined,
): Promise<SpurGearToothInterferenceReport> {
  const cycleSamples = sampleCount(opts?.cycleSamples, 8, 'opts.cycleSamples');
  const whole = opts?.wholeRevolution === true;
  const revolutionSamples = whole
    ? sampleCount(opts?.revolutionSamples, 4, 'opts.revolutionSamples')
    : 0;
  const rest = measurePose(driver, driven);
  const positive = await searchFlankAt(driver, driven, spec, 1, rest, 180 / spec.drivenTeeth, drivenPitchRadiusMm);
  const negative = await searchFlankAt(driver, driven, spec, -1, rest, 180 / spec.drivenTeeth, drivenPitchRadiusMm);
  const play = backlashOf(positive, negative, 180 / spec.drivenTeeth);
  const samples = await samplesOver(driver, driven, spec, cycleSamples, 360 / spec.teeth);
  const revolution = whole
    ? await samplesOver(driver, driven, spec, revolutionSamples, 360)
    : undefined;
  const rolled = revolution === undefined ? samples : samples.concat(revolution);
  const sum = totals(rolled);
  return {
    kind: 'geometry',
    centerDistanceMm: spec.centerDistanceMm,
    pitchCenterDistanceMm: spec.pitchCenterDistanceMm,
    ratio: spec.ratio,
    authoredBacklashMm: spec.backlashMm,
    samples,
    ...(revolution !== undefined ? { revolutionSamples: revolution } : {}),
    ...sum,
    ...play,
    positiveFlank: positive.flank,
    negativeFlank: negative.flank,
    note: GEOMETRY_NOTE,
  };
}
