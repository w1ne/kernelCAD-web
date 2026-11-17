// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/flightStudyRecord.ts
//
// Types for `shape.flightStudy({...})` / `arm.flightStudy({...})` and the
// `run_flight` tool. A flightStudy is a capture-only (virtual) record: it
// never produces geometry. It declares a model-rocket flight: the motor, the
// aerodynamics, the launch and the recovery. The runner takes mass and CG
// from the lowered parts, the Barrowman centre of pressure from the nose and
// fin geometry (or declared dimensions), and integrates the trajectory.
//
// Declaring `minStabilityCal` turns the study into an evaluate-time gate:
// a static margin below it fails evaluate with `flight.stability.below-min`.

/** Rocket axis direction in model coordinates: the way the nose points. */
export type FlightAxis = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

export type NoseShape = 'ogive' | 'cone';

/** When a recovery device opens. 'apogee+1.5' (or 'apogee+1.5s') is 1.5 s
 *  after apogee; `{ atS }` is a time after ignition. */
export type DeployEvent = 'apogee' | `apogee+${string}` | { atS: number };

export interface FlightMotorSpec {
  /** Thrust table [[t s, thrust N], ...], t ascending. */
  thrustCurve?: ReadonlyArray<readonly [number, number]>;
  /** RASP .eng file TEXT (not a path). Supplies the curve and, unless given
   *  here, totalMassKg and propellantKg. */
  engFile?: string;
  /** Loaded motor mass, kg. */
  totalMassKg?: number;
  /** Propellant mass, kg. Burns in proportion to delivered impulse. */
  propellantKg?: number;
  /** Assembly part that stands in for the motor: its position sets the motor
   *  CG and its own mass is replaced by totalMassKg. */
  part?: string;
  /** Motor CG measured from the nose tip, mm, when no part is named. */
  cgFromNoseMm?: number;
}

export interface FlightNoseSpec {
  /** Default 'ogive' (tangent ogive). */
  shape?: NoseShape;
  /** Part whose geometry is the nose cone (length and diameter derived). */
  part?: string;
  /** Nose length tip to shoulder, mm. Derived from the geometry when absent. */
  lengthMm?: number;
}

export interface FlightFinSpec {
  /** Number of fins (3 or 4 typical). */
  count: number;
  /** Part whose geometry holds the fins (a fin can or a fin set). */
  part?: string;
  rootChordMm?: number;
  tipChordMm?: number;
  /** Semi-span, body surface to tip, mm. */
  spanMm?: number;
  /** Leading-edge sweep: axial distance root LE to tip LE, mm. */
  sweepMm?: number;
  /** Axial distance nose tip to the fin root leading edge, mm. */
  leadingEdgeFromNoseMm?: number;
  /** Fin thickness, mm (Cd 'auto' only). Default 3. */
  thicknessMm?: number;
}

export interface FlightAeroSpec {
  /** Zero-lift drag coefficient on the body cross-section, or 'auto' for a
   *  body + fin + base estimate. Default 'auto'. */
  cd?: 'auto' | number;
  /** Reference (body) diameter, mm. Derived from the nose geometry when absent. */
  refDiameterMm?: number;
  /** The direction the nose points in the model. Default '+Z'. */
  axis?: FlightAxis;
  nose?: FlightNoseSpec;
  fins?: FlightFinSpec;
  /** Overall length nose tip to tail, mm. Derived from the geometry when absent. */
  lengthMm?: number;
}

export interface FlightLaunchSpec {
  /** Launch rail / rod length, m. Default 1. */
  railM?: number;
  /** Rail tilt from vertical, deg, toward +downrange. Default 0. */
  angleDeg?: number;
  /** Launch site elevation above sea level, m (ISA). Default 0. */
  siteAltitudeM?: number;
  /** Horizontal wind speed blowing toward +downrange, m/s. Default 0. */
  windMs?: number;
}

export interface FlightRecoverySpec {
  /** Assembly part that is the device (animation only; its mass is already
   *  in the vehicle). */
  part?: string;
  /** Drag coefficient on the canopy disc area. */
  cd: number;
  /** Nominal canopy diameter, mm. */
  diameterMm: number;
  /** Default 'apogee'. */
  deploy?: DeployEvent;
  /** Time from deploy to full area, s (linear). Default 0. */
  inflateS?: number;
  /** Parts that separate at deploy (animation only; they stay tethered). */
  separates?: readonly string[];
}

export interface FlightStudySpec {
  /** Study name; defaults to `flight`. */
  name?: string;
  motor: FlightMotorSpec;
  aero?: FlightAeroSpec;
  launch?: FlightLaunchSpec;
  recovery?: readonly FlightRecoverySpec[];
  /** Vehicle mass without the motor, kg. Overrides the part masses. */
  dryMassKg?: number;
  /** Dry CG from the nose tip, mm. Overrides the part CG. */
  cgFromNoseMm?: number;
  /** Minimum static margin, calibers. Declaring it makes evaluate fail with
   *  `flight.stability.below-min` when the margin is lower. */
  minStabilityCal?: number;
  /** Simulation cut-off, s. Default 300. */
  maxTimeS?: number;
  /** Integrator step, s. Default 0.001. */
  dtS?: number;
}

/** Normalized recovery entry stored on the record. */
export interface FlightRecoveryMetadata {
  part?: string;
  cd: number;
  diameterMm: number;
  deploy: { kind: 'apogee'; delayS: number } | { kind: 'time'; atS: number };
  inflateS: number;
  separates: readonly string[];
}

/** Normalized study stored on the record and consumed by the runner. */
export interface FlightStudyMetadata {
  name: string;
  motor: {
    thrustCurve: ReadonlyArray<readonly [number, number]>;
    totalMassKg: number;
    propellantKg: number;
    designation?: string;
    part?: string;
    cgFromNoseMm?: number;
  };
  aero: {
    cd: 'auto' | number;
    refDiameterMm?: number;
    axis: FlightAxis;
    nose: { shape: NoseShape; part?: string; lengthMm?: number };
    fins?: FlightFinSpec;
    lengthMm?: number;
  };
  launch: { railM: number; angleDeg: number; siteAltitudeM: number; windMs: number };
  recovery: readonly FlightRecoveryMetadata[];
  dryMassKg?: number;
  cgFromNoseMm?: number;
  minStabilityCal?: number;
  maxTimeS: number;
  dtS: number;
  /** Set when declared on an assembly: the assembly name. */
  assembly?: string;
  virtual: true;
}

export interface FlightStudyHandle {
  readonly id: string;
  readonly metadata: FlightStudyMetadata;
}
