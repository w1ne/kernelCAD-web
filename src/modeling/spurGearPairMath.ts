// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// External spur-mesh placement. Two gears of modules m1, m2 and tooth counts
// z1, z2 roll at centre distance (m1·z1 + m2·z2)/2. The speed ratio
// ω_driven/ω_driver is −z1/z2: opposite directions, driver angle twice the
// driven angle when z2 = 2·z1. Tooth 0 of each solid sits on +X before the
// mesh alignment below.

/**
 * Common volume (mm³) strictly above which a sampled pose is tooth
 * interference. `anyInterference` is that test over the aggregated poses,
 * and only then is `minClearanceMm` 0. A positive volume at or below this
 * floor is not interference and does not close the reported gap.
 */
export const SPUR_GEAR_INTERFERENCE_VOLUME_MM3 = 1e-3;

/** True when `volumeMm3` is strictly above {@link SPUR_GEAR_INTERFERENCE_VOLUME_MM3}. */
export function spurVolumeInterferes(volumeMm3: number): boolean {
  return volumeMm3 > SPUR_GEAR_INTERFERENCE_VOLUME_MM3;
}

export interface SpurClearanceReading {
  /** BREP distance, mm. Zero when the solids touch or overlap. */
  clearanceMm: number;
  /** Common volume, mm³. */
  interferenceVolumeMm3: number;
}

export interface SpurClearanceAggregate {
  anyInterference: boolean;
  /** Largest common volume, mm³, including volumes at or below the floor. */
  maxInterferenceVolumeMm3: number;
  /**
   * 0 when any reading is above the floor. Otherwise the minimum BREP
   * distance among readings that are not a positive common volume at or
   * below the floor. Null when every reading is in that band: the distance
   * collapsed, and the overlap is not interference.
   */
  minClearanceMm: number | null;
}

/**
 * `anyInterference` and `minClearanceMm` from sampled distances and common
 * volumes. A positive volume at or below the floor is omitted from the
 * minimum, so it cannot publish a closed gap beside `anyInterference: false`.
 * Exact contact (volume 0 and distance 0) still reports a clearance of 0.
 */
export function aggregateSpurClearance(
  samples: readonly SpurClearanceReading[],
): SpurClearanceAggregate {
  let anyInterference = false;
  let maxInterferenceVolumeMm3 = 0;
  let minClearanceMm = Number.POSITIVE_INFINITY;
  let sawMeasuredGap = false;
  for (const sample of samples) {
    if (sample.interferenceVolumeMm3 > maxInterferenceVolumeMm3) {
      maxInterferenceVolumeMm3 = sample.interferenceVolumeMm3;
    }
    if (spurVolumeInterferes(sample.interferenceVolumeMm3)) {
      anyInterference = true;
      continue;
    }
    if (sample.interferenceVolumeMm3 > 0 && sample.clearanceMm <= 0) continue;
    sawMeasuredGap = true;
    if (sample.clearanceMm < minClearanceMm) minClearanceMm = sample.clearanceMm;
  }
  if (anyInterference) {
    return { anyInterference: true, maxInterferenceVolumeMm3, minClearanceMm: 0 };
  }
  if (!sawMeasuredGap) {
    return { anyInterference: false, maxInterferenceVolumeMm3, minClearanceMm: null };
  }
  return { anyInterference: false, maxInterferenceVolumeMm3, minClearanceMm };
}

/** Distance (mm) at or below which a backlash probe counts as flank contact. */
export const SPUR_GEAR_CONTACT_EPS_MM = 5e-4;

/** Skip the common-volume boolean when the BREP distance is above this (mm). */
export const SPUR_GEAR_VOLUME_PROBE_DISTANCE_MM = 1e-4;

/** Bisections per flank. The reported arc can sit one step past first contact. */
export const SPUR_GEAR_BACKLASH_SEARCH_STEPS = 10;

/**
 * Midpoint samples added on each side of the lowest uniform clearance,
 * repeated this many times. The gap beside that pose shrinks by half each
 * step. Skipped when a uniform pose already interferes.
 */
export const SPUR_GEAR_CLEARANCE_REFINEMENT_STEPS = 2;

export const SPUR_GEAR_MIN_CYCLE_SAMPLES = 2;
export const SPUR_GEAR_MAX_CYCLE_SAMPLES = 36;
export const SPUR_GEAR_MIN_CUT_SAMPLES = 3;
export const SPUR_GEAR_MAX_CUT_SAMPLES = 24;

/** Pitch-circle centre distance of an external pair, mm. */
export function externalCenterDistanceMm(
  moduleMm: number,
  teeth: number,
  drivenModuleMm: number,
  drivenTeeth: number,
): number {
  return (moduleMm * teeth + drivenModuleMm * drivenTeeth) / 2;
}

/** ω_driven / ω_driver for an external mesh. Negative: the gears turn opposite ways. */
export function externalSpeedRatio(teeth: number, drivenTeeth: number): number {
  return -teeth / drivenTeeth;
}

/**
 * Rotation of the driven solid, degrees, so a tooth space faces the driver's
 * tooth 0. Half a tooth when z2 is even, none when z2 is odd.
 */
export function meshAlignDeg(drivenTeeth: number): number {
  if (drivenTeeth % 2 === 0) return 180 / drivenTeeth;
  return 0;
}

export function pitchRadiusMm(moduleMm: number, teeth: number): number {
  return (moduleMm * teeth) / 2;
}

/**
 * Pitch-circle arc (mm) of one remaining bisection bracket on the driven
 * gear. The reported flank can sit this far past first contact.
 */
export function backlashSearchStepMm(drivenTeeth: number, drivenPitchRadiusMm: number): number {
  const halfPitchDeg = 180 / drivenTeeth;
  const stepDeg = halfPitchDeg / 2 ** SPUR_GEAR_BACKLASH_SEARCH_STEPS;
  return stepDeg * (Math.PI / 180) * drivenPitchRadiusMm;
}

export function tipRadiusMm(moduleMm: number, teeth: number): number {
  return pitchRadiusMm(moduleMm, teeth) + moduleMm;
}

/** Degrees into [0, 360). */
export function wrapDegrees(deg: number): number {
  const turns = deg / 360;
  return (turns - Math.floor(turns)) * 360;
}

/** Smallest absolute difference of two headings, in [0, 180]. */
export function angularDeltaDeg(aDeg: number, bDeg: number): number {
  const d = Math.abs(wrapDegrees(aDeg) - wrapDegrees(bDeg));
  if (d > 180) return 360 - d;
  return d;
}

/**
 * Tooth whose centre is nearest `worldDeg`. `placementDeg` is the world
 * heading of tooth 0. A heading exactly halfway between two teeth rounds
 * half away from −∞ (`Math.round`), so a caller that sits on the boundary
 * must accept either neighbour.
 */
export function toothIndex(worldDeg: number, placementDeg: number, teeth: number): number {
  const pitch = 360 / teeth;
  const local = wrapDegrees(worldDeg - placementDeg);
  return Math.round(local / pitch) % teeth;
}

/** Tooth indices whose centres lie within `pitchFactor` pitches of `facingDeg`. */
export function teethNearFacing(
  facingDeg: number,
  placementDeg: number,
  teeth: number,
  pitchFactor: number,
): number[] {
  const pitch = 360 / teeth;
  const limit = pitchFactor * pitch;
  const out: number[] = [];
  for (let k = 0; k < teeth; k += 1) {
    const centre = wrapDegrees(placementDeg + k * pitch);
    if (angularDeltaDeg(centre, facingDeg) <= limit + 1e-9) out.push(k);
  }
  return out;
}

export interface DriverInDrivenFrame {
  /** Driver rotation in the driven blank's frame, degrees. */
  rotationDeg: number;
  xMm: number;
  yMm: number;
}

/**
 * Rigid pose of the driver in the driven blank's frame (blank fixed at the
 * origin, before the mesh placement rotateZ(align+phase) then translate).
 * `driverDeg` is the driver's extra rotation about its own axis.
 */
export function driverInDrivenFrame(
  driverDeg: number,
  alignDeg: number,
  phaseDeg: number,
  ratio: number,
  centerMm: number,
): DriverInDrivenFrame {
  const psi = alignDeg + phaseDeg + ratio * driverDeg;
  const psiRad = (psi * Math.PI) / 180;
  return {
    rotationDeg: driverDeg - psi,
    xMm: -centerMm * Math.cos(psiRad),
    yMm: centerMm * Math.sin(psiRad),
  };
}

export interface ScallopInput {
  moduleMm: number;
  teeth: number;
  drivenTeeth: number;
  centerDistanceMm: number;
  samples: number;
}

/**
 * Chordal sagitta (mm) of the driver tip about the ratio's instantaneous
 * centre, for one step of a one-tooth cycle split into `samples` poses.
 * This is an upper bound on the path of that tip, not a measured flank error.
 * The step is the relative rotation θ = 2π(z1+z2)/(z1·z2·N).
 */
export function generatingScallopMm(input: ScallopInput): number {
  const d1 = (input.centerDistanceMm * input.teeth) / (input.teeth + input.drivenTeeth);
  const pathRadius = d1 + tipRadiusMm(input.moduleMm, input.teeth);
  const theta = (2 * Math.PI * (input.teeth + input.drivenTeeth))
    / (input.teeth * input.drivenTeeth * input.samples);
  return pathRadius * (1 - Math.cos(theta / 2));
}

/**
 * How far the driver tip circle reaches into the driven tip circle, mm.
 * Zero or negative means the cutter never enters the blank.
 */
export function tipPenetrationMm(
  moduleMm: number,
  teeth: number,
  drivenModuleMm: number,
  drivenTeeth: number,
  centerDistanceMm: number,
): number {
  return tipRadiusMm(moduleMm, teeth) + tipRadiusMm(drivenModuleMm, drivenTeeth) - centerDistanceMm;
}
