// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/flight/runFlight.ts
//
// One flight study, end to end, on bodies already in world coordinates:
// mass and CG from the bodies (the motor part replaced by the declared
// motor), Barrowman CP and static margin, the drag coefficient, the
// trajectory, and the summary / series / animation track the tool returns.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, type DiagnosticCode } from '../../shared/diagnostics/registry';
import type { FlightStudyMetadata } from '../../shared/intent/flightStudyRecord';
import { G0 } from './atmosphere';
import { barrowmanCp, estimateCd, type CpResult, type FinGeometry, type VehicleAero } from './barrowman';
import {
  aftOfTip,
  deriveFins,
  maxRadius,
  noseLength,
  overallLength,
  rocketFrame,
  type FlightBody,
  type RocketFrame,
} from './geometry';
import { Motor } from './motor';
import { simulateFlight, type FlightEvent, type FlightRow, type SimResult } from './simulate';

/** Default motor CG when neither motor.part nor motor.cgFromNoseMm is given:
 *  this far forward of the tail (half a 70 mm 24 mm-class motor). */
const DEFAULT_MOTOR_CG_FROM_TAIL_MM = 35;
const MIN_RAIL_EXIT_MS = 15;

export interface FlightStability {
  /** Margin in calibers at liftoff (full motor). */
  liftoffCal: number;
  /** Margin at burnout (empty motor). */
  burnoutCal: number;
  /** Smaller of the two. */
  minCal: number;
  cpFromNoseMm: number;
  cgLiftoffFromNoseMm: number;
  cgBurnoutFromNoseMm: number;
  cnAlpha: number;
  components: Array<{ name: string; cnAlpha: number; cpFromNoseMm: number }>;
}

export interface FlightSummary {
  study: string;
  apogeeM: number;
  apogeeAslM: number;
  apogeeTimeS: number;
  maxSpeedMs: number;
  maxMach: number;
  maxAccelMs2: number;
  maxAccelG: number;
  railExitSpeedMs: number;
  railExitTimeS: number;
  burnoutTimeS: number;
  descentRateMs: number;
  landingTimeS: number;
  landed: boolean;
  downrangeM: number;
  liftoffMassKg: number;
  burnoutMassKg: number;
  dryMassKg: number;
  thrustToWeight: number;
  cd: number;
  cdSource: 'declared' | 'auto';
  cdBreakdown?: { bodyFriction: number; finFriction: number; base: number };
  refDiameterMm: number;
  lengthMm?: number;
  motor: { designation?: string; totalImpulseNs: number; impulseClass: string; burnTimeS: number; peakThrustN: number; averageThrustN: number };
  stability?: FlightStability;
  aero?: { noseShape: string; noseLengthMm: number; fins?: { count: number; rootChordMm: number; tipChordMm: number; spanMm: number; sweepMm: number; leadingEdgeFromNoseMm: number; source: 'geometry' | 'declared' | 'mixed' } };
  massBreakdown: Array<{ part: string; massKg: number; source: string; cgFromNoseMm?: number }>;
  events: FlightEvent[];
  assumptions: string[];
  disclaimer: string;
}

export interface FlightAnimation {
  durationMs: number;
  speed: number;
  tracks: Array<{ param: string; keys: Array<{ atMs: number; value: number; ease?: 'linear' | 'step' }> }>;
  /** Ready-to-paste param declarations + animationView call. */
  scriptFragment: string;
}

/** What is known without a trajectory: masses, motor, aero, stability. */
export type FlightVehicle = Pick<FlightSummary, 'study' | 'burnoutTimeS' | 'liftoffMassKg' | 'burnoutMassKg' | 'dryMassKg' | 'thrustToWeight' | 'lengthMm' | 'motor' | 'stability' | 'aero' | 'massBreakdown' | 'assumptions' | 'disclaimer'>;

export interface FlightRunResult {
  ok: boolean;
  /** Full summary; absent when the trajectory was skipped or could not run. */
  summary?: FlightSummary;
  vehicle?: FlightVehicle;
  rows: FlightRow[];
  diagnostics: CompilerDiagnostic[];
}

export const FLIGHT_DISCLAIMER =
  'Point-mass trajectory (zero angle of attack, ISA atmosphere, Barrowman CP); an engineering estimate, not OpenRocket and not a certification.';

function diag(code: DiagnosticCode, severity: 'error' | 'warn', message: string, featureId?: string): CompilerDiagnostic {
  return { target: 'export-occt', code, severity, message, hint: HINT_TEMPLATES[code].template, ...(featureId !== undefined ? { featureId } : {}) };
}

export interface RunFlightOptions {
  /** The study record id, attached to diagnostics. */
  featureId?: string;
  /** Skip the trajectory: stability (and mass) only, for the evaluate gate. */
  stabilityOnly?: boolean;
}

interface AeroResolution {
  aero?: VehicleAero;
  frame?: RocketFrame;
  finSource?: 'geometry' | 'declared' | 'mixed';
  refDiameterMm?: number;
  missing: string[];
}

function byName(bodies: readonly FlightBody[], name: string | undefined): FlightBody[] {
  return name === undefined ? [] : bodies.filter(b => b.name === name);
}

function resolveFins(
  m: FlightStudyMetadata,
  frame: RocketFrame | undefined,
  finBodies: readonly FlightBody[],
  R: number,
  missing: string[],
): { fins?: FinGeometry; source?: 'geometry' | 'declared' | 'mixed' } {
  const f = m.aero.fins;
  if (f === undefined) return {};
  const keys = ['rootChordMm', 'tipChordMm', 'spanMm', 'sweepMm', 'leadingEdgeFromNoseMm'] as const;
  const declared = keys.filter(k => f[k] !== undefined);
  const derived = declared.length < keys.length && frame !== undefined && finBodies.length > 0 ? deriveFins(frame, finBodies, R) : undefined;
  const pick = (k: (typeof keys)[number]) => f[k] ?? derived?.[k];
  const vals = keys.map(pick);
  if (vals.some(v => v === undefined)) {
    missing.push(`fin dimensions (${keys.filter((_, i) => vals[i] === undefined).join(', ')})`);
    return {};
  }
  const [cr, ct, s, sw, le] = vals as number[];
  return {
    fins: { count: f.count, rootChordM: cr / 1000, tipChordM: ct / 1000, spanM: s / 1000, sweepM: sw / 1000, leadingEdgeM: le / 1000, thicknessM: (f.thicknessMm ?? 3) / 1000 },
    source: declared.length === keys.length ? 'declared' : declared.length === 0 ? 'geometry' : 'mixed',
  };
}

function refDiameter(m: FlightStudyMetadata, frame: RocketFrame | undefined, noseBodies: readonly FlightBody[]): number | undefined {
  if (m.aero.refDiameterMm !== undefined) return m.aero.refDiameterMm;
  if (frame === undefined || noseBodies.length === 0) return undefined;
  const d = 2 * maxRadius(frame, noseBodies);
  return d > 0 ? d : undefined;
}

/** Nose and overall length, declared or read off the geometry. */
function lengths(m: FlightStudyMetadata, frame: RocketFrame | undefined, noseBodies: readonly FlightBody[], bodies: readonly FlightBody[], R: number): { noseMm?: number; lengthMm?: number } {
  if (frame === undefined) return { ...(m.aero.nose.lengthMm !== undefined ? { noseMm: m.aero.nose.lengthMm } : {}), ...(m.aero.lengthMm !== undefined ? { lengthMm: m.aero.lengthMm } : {}) };
  const noseMm = m.aero.nose.lengthMm ?? noseLength(frame, noseBodies.length > 0 ? noseBodies : bodies, R);
  return { ...(noseMm !== undefined ? { noseMm } : {}), lengthMm: m.aero.lengthMm ?? overallLength(frame, bodies) };
}

function resolveAero(m: FlightStudyMetadata, bodies: readonly FlightBody[]): AeroResolution {
  const missing: string[] = [];
  const noseBodies = byName(bodies, m.aero.nose.part);
  const frame = bodies.length > 0 ? rocketFrame(bodies, noseBodies, m.aero.axis) : undefined;
  const withFrame = frame !== undefined ? { frame } : {};
  const refMm = refDiameter(m, frame, noseBodies);
  if (refMm === undefined) {
    missing.push('the reference diameter (aero.refDiameterMm or aero.nose.part)');
    return { missing, ...withFrame };
  }
  const R = refMm / 2;
  const { noseMm, lengthMm } = lengths(m, frame, noseBodies, bodies, R);
  const fins = resolveFins(m, frame, m.aero.fins?.part !== undefined ? byName(bodies, m.aero.fins.part) : bodies, R, missing);
  if (noseMm === undefined) missing.push('the nose length (aero.nose.lengthMm or aero.nose.part)');
  if (lengthMm === undefined) missing.push('the overall length (aero.lengthMm or geometry)');
  if (m.aero.fins === undefined) missing.push('the fin set (aero.fins: { count, part? })');
  if (noseMm === undefined || lengthMm === undefined) return { missing, refDiameterMm: refMm, ...withFrame };
  const aero: VehicleAero = { refDiameterM: refMm / 1000, lengthM: lengthMm / 1000, nose: { shape: m.aero.nose.shape, lengthM: noseMm / 1000 } };
  if (fins.fins !== undefined) aero.fins = fins.fins;
  return { aero, ...withFrame, ...(fins.source !== undefined ? { finSource: fins.source } : {}), refDiameterMm: refMm, missing };
}

interface MassModel {
  dryKg: number;
  dryCgMm?: number;
  motorCgMm?: number;
  breakdown: FlightSummary['massBreakdown'];
  assumptions: string[];
}

function resolveMass(m: FlightStudyMetadata, bodies: readonly FlightBody[], frame: RocketFrame | undefined, lengthMm: number | undefined): MassModel {
  const assumptions: string[] = [];
  const motorPart = m.motor.part;
  const airframe = bodies.filter(b => b.name !== motorPart);
  const breakdown = bodies.map(b => ({
    part: b.name,
    massKg: b.name === motorPart ? m.motor.totalMassKg : b.massKg,
    source: b.name === motorPart ? 'motor.totalMassKg' : b.massSource,
    ...(frame !== undefined ? { cgFromNoseMm: aftOfTip(frame, b.comMm) } : {}),
  }));
  const partsKg = airframe.reduce((a, b) => a + b.massKg, 0);
  let dryCgMm = m.cgFromNoseMm;
  if (dryCgMm === undefined && frame !== undefined && partsKg > 0) {
    dryCgMm = airframe.reduce((a, b) => a + b.massKg * aftOfTip(frame, b.comMm), 0) / partsKg;
  }
  const dryKg = m.dryMassKg ?? partsKg;
  if (m.dryMassKg !== undefined && airframe.length > 0) {
    assumptions.push(`dryMassKg ${m.dryMassKg} kg overrides the part masses (${partsKg.toFixed(3)} kg); the CG still comes from the parts unless cgFromNoseMm is declared.`);
  }
  let motorCgMm = m.motor.cgFromNoseMm;
  const motorBody = byName(bodies, motorPart)[0];
  if (motorCgMm === undefined && motorBody !== undefined && frame !== undefined) motorCgMm = aftOfTip(frame, motorBody.comMm);
  if (motorCgMm === undefined && lengthMm !== undefined) {
    motorCgMm = lengthMm - DEFAULT_MOTOR_CG_FROM_TAIL_MM;
    assumptions.push(`Motor CG assumed ${DEFAULT_MOTOR_CG_FROM_TAIL_MM} mm forward of the tail; name motor.part or declare motor.cgFromNoseMm.`);
  }
  return { dryKg, ...(dryCgMm !== undefined ? { dryCgMm } : {}), ...(motorCgMm !== undefined ? { motorCgMm } : {}), breakdown, assumptions };
}

function stabilityOf(cp: CpResult, mass: MassModel, motor: Motor, refMm: number): FlightStability | undefined {
  if (mass.dryCgMm === undefined || mass.motorCgMm === undefined) return undefined;
  const cg = (motorKg: number) => (mass.dryKg * mass.dryCgMm! + motorKg * mass.motorCgMm!) / (mass.dryKg + motorKg);
  const cpMm = cp.xM * 1000;
  const cgL = cg(motor.totalMassKg);
  const cgB = cg(motor.totalMassKg - motor.propellantKg);
  const liftoffCal = (cpMm - cgL) / refMm;
  const burnoutCal = (cpMm - cgB) / refMm;
  return {
    liftoffCal,
    burnoutCal,
    minCal: Math.min(liftoffCal, burnoutCal),
    cpFromNoseMm: cpMm,
    cgLiftoffFromNoseMm: cgL,
    cgBurnoutFromNoseMm: cgB,
    cnAlpha: cp.cnAlpha,
    components: cp.components.map(c => ({ name: c.name, cnAlpha: c.cnAlpha, cpFromNoseMm: c.xM * 1000 })),
  };
}

function finsSummary(aero: VehicleAero, source: AeroResolution['finSource']): NonNullable<FlightSummary['aero']>['fins'] {
  const f = aero.fins;
  if (f === undefined) return undefined;
  const mm = (v: number) => Math.round(v * 1e4) / 10;
  return { count: f.count, rootChordMm: mm(f.rootChordM), tipChordMm: mm(f.tipChordM), spanMm: mm(f.spanM), sweepMm: mm(f.sweepM), leadingEdgeFromNoseMm: mm(f.leadingEdgeM), source: source ?? 'declared' };
}

/** Stability diagnostics and assumptions for a computed (or missing) margin. */
function stabilityDiagnostics(
  m: FlightStudyMetadata,
  stability: FlightStability | undefined,
  aeroRes: AeroResolution,
  cpKnown: boolean,
  fid: string | undefined,
): { diagnostics: CompilerDiagnostic[]; assumptions: string[] } {
  const diagnostics: CompilerDiagnostic[] = [];
  const assumptions: string[] = [];
  if (m.aero.fins === undefined && aeroRes.aero !== undefined) assumptions.push('No fin set declared: the CP is the nose alone. Declare aero.fins: { count, part? }.');
  if (stability !== undefined && m.aero.fins !== undefined) {
    if (m.minStabilityCal !== undefined && stability.minCal < m.minStabilityCal) {
      diagnostics.push(diag('flight.stability.below-min', 'error',
        `flightStudy '${m.name}': static margin ${stability.minCal.toFixed(2)} cal is below minStabilityCal ${m.minStabilityCal} ` +
        `(CP ${stability.cpFromNoseMm.toFixed(0)} mm, CG ${stability.cgLiftoffFromNoseMm.toFixed(0)} mm from the nose at liftoff, ${aeroRes.refDiameterMm!.toFixed(1)} mm body).`, fid));
    }
    return { diagnostics, assumptions };
  }
  const why = [...aeroRes.missing, ...(stability === undefined && cpKnown ? ['the CG (part geometry or cgFromNoseMm)'] : [])];
  if (m.minStabilityCal !== undefined) {
    diagnostics.push(diag('flight.stability.unresolved', 'error', `flightStudy '${m.name}' declares minStabilityCal ${m.minStabilityCal} but the margin could not be computed: missing ${why.join('; ')}.`, fid));
  } else if (why.length > 0) {
    assumptions.push(`Stability margin not computed: missing ${why.join('; ')}.`);
  }
  return { diagnostics, assumptions };
}

function vehicleSummary(m: FlightStudyMetadata, motor: Motor, mass: MassModel, aeroRes: AeroResolution, stability: FlightStability | undefined, assumptions: string[]): FlightVehicle {
  const lengthMm = aeroRes.aero !== undefined ? aeroRes.aero.lengthM * 1000 : m.aero.lengthMm;
  const liftoff = mass.dryKg + motor.totalMassKg;
  const v: FlightVehicle = {
    study: m.name,
    burnoutTimeS: motor.burnTimeS,
    liftoffMassKg: liftoff,
    burnoutMassKg: liftoff - motor.propellantKg,
    dryMassKg: mass.dryKg,
    thrustToWeight: motor.peakThrustN / (liftoff * G0),
    motor: {
      totalImpulseNs: motor.totalImpulseNs,
      impulseClass: motor.impulseClass(),
      burnTimeS: motor.burnTimeS,
      peakThrustN: motor.peakThrustN,
      averageThrustN: motor.totalImpulseNs / motor.burnTimeS,
    },
    massBreakdown: mass.breakdown,
    assumptions,
    disclaimer: FLIGHT_DISCLAIMER,
  };
  if (m.motor.designation !== undefined) v.motor.designation = m.motor.designation;
  if (lengthMm !== undefined) v.lengthMm = lengthMm;
  if (stability !== undefined) v.stability = stability;
  const a = aeroRes.aero;
  if (a !== undefined) {
    v.aero = { noseShape: a.nose.shape, noseLengthMm: a.nose.lengthM * 1000 };
    if (a.fins !== undefined) v.aero.fins = finsSummary(a, aeroRes.finSource);
  }
  return v;
}

/** The drag coefficient to fly with, or undefined when 'auto' lacks dimensions. */
function resolveCd(m: FlightStudyMetadata, aeroRes: AeroResolution, assumptions: string[]): { cd: number; breakdown?: FlightSummary['cdBreakdown'] } | undefined {
  if (m.aero.cd !== 'auto') return { cd: m.aero.cd };
  if (aeroRes.aero === undefined) return undefined;
  const est = estimateCd(aeroRes.aero);
  assumptions.push(`Cd 'auto' = ${est.cd.toFixed(3)} (turbulent skin friction at Re ${est.reynolds.toExponential(1)} + base drag 0.12); declare a measured or OpenRocket Cd for better numbers.`);
  return { cd: est.cd, breakdown: est.parts };
}

function simDiagnostics(m: FlightStudyMetadata, sim: SimResult, motor: Motor, liftoffKg: number, fid: string | undefined): CompilerDiagnostic[] {
  if (!sim.liftedOff) {
    return [diag('flight.sim.no-liftoff', 'error', `flightStudy '${m.name}': peak thrust ${motor.peakThrustN.toFixed(1)} N never exceeds the ${(liftoffKg * G0).toFixed(1)} N weight.`, fid)];
  }
  const out: CompilerDiagnostic[] = [];
  if (m.launch.railM > 0 && sim.railExitSpeedMs < MIN_RAIL_EXIT_MS) {
    out.push(diag('flight.rail.exit-speed-low', 'warn', `flightStudy '${m.name}': rail-exit speed ${sim.railExitSpeedMs.toFixed(1)} m/s is below ${MIN_RAIL_EXIT_MS} m/s.`, fid));
  }
  if (!sim.landed) out.push(diag('flight.sim.timeout', 'warn', `flightStudy '${m.name}': still airborne at maxTimeS ${m.maxTimeS} s.`, fid));
  return out;
}

const SPEED_OF_SOUND = 340.3;

function flightSummary(m: FlightStudyMetadata, vehicle: FlightVehicle, sim: SimResult, cd: { cd: number; breakdown?: FlightSummary['cdBreakdown'] }, refMm: number): FlightSummary {
  if (sim.maxSpeedMs / SPEED_OF_SOUND > 0.3) vehicle.assumptions.push(`Peak Mach ${(sim.maxSpeedMs / SPEED_OF_SOUND).toFixed(2)}: compressibility is not modelled.`);
  return {
    ...vehicle,
    apogeeM: sim.apogeeM,
    apogeeAslM: sim.apogeeM + m.launch.siteAltitudeM,
    apogeeTimeS: sim.apogeeTimeS,
    maxSpeedMs: sim.maxSpeedMs,
    maxMach: sim.maxSpeedMs / SPEED_OF_SOUND,
    maxAccelMs2: sim.maxAccelMs2,
    maxAccelG: sim.maxAccelMs2 / G0,
    railExitSpeedMs: sim.railExitSpeedMs,
    railExitTimeS: sim.railExitTimeS,
    descentRateMs: sim.descentRateMs,
    landingTimeS: sim.landingTimeS,
    landed: sim.landed,
    downrangeM: sim.downrangeM,
    events: sim.events,
    cd: cd.cd,
    cdSource: m.aero.cd === 'auto' ? 'auto' : 'declared',
    ...(cd.breakdown !== undefined ? { cdBreakdown: cd.breakdown } : {}),
    refDiameterMm: refMm,
  };
}

const hasError = (d: readonly CompilerDiagnostic[]) => d.some(x => x.severity === 'error');

/** Run one flight study. `bodies` may be empty when the study declares dryMassKg / cgFromNoseMm / dimensions. */
export function runFlightStudy(m: FlightStudyMetadata, bodies: readonly FlightBody[], opts: RunFlightOptions = {}): FlightRunResult {
  const fid = opts.featureId;
  const aeroRes = resolveAero(m, bodies);
  const motor = new Motor(m.motor.thrustCurve, m.motor.totalMassKg, m.motor.propellantKg);
  const mass = resolveMass(m, bodies, aeroRes.frame, aeroRes.aero !== undefined ? aeroRes.aero.lengthM * 1000 : m.aero.lengthMm);
  if (!(mass.dryKg > 0)) {
    return { ok: false, rows: [], diagnostics: [diag('flight.mass.unavailable', 'error', `flightStudy '${m.name}': no part mass and no dryMassKg; the vehicle mass is unknown.`, fid)] };
  }
  const diagnostics: CompilerDiagnostic[] = [];
  const defaulted = bodies.filter(b => b.massSource === 'default' && b.name !== m.motor.part).map(b => b.name);
  if (defaulted.length > 0 && m.dryMassKg === undefined) {
    diagnostics.push(diag('flight.mass.density-defaulted', 'warn', `flightStudy '${m.name}': ${defaulted.join(', ')} assume water density (1000 kg/m^3).`, fid));
  }
  const cp = aeroRes.aero !== undefined ? barrowmanCp(aeroRes.aero) : undefined;
  const stability = cp !== undefined ? stabilityOf(cp, mass, motor, aeroRes.refDiameterMm!) : undefined;
  const stab = stabilityDiagnostics(m, stability, aeroRes, cp !== undefined, fid);
  diagnostics.push(...stab.diagnostics);
  const vehicle = vehicleSummary(m, motor, mass, aeroRes, stability, [...mass.assumptions, ...stab.assumptions]);
  if (opts.stabilityOnly === true) return { ok: !hasError(diagnostics), rows: [], diagnostics, vehicle };

  const refMm = aeroRes.refDiameterMm;
  const cd = refMm !== undefined ? resolveCd(m, aeroRes, vehicle.assumptions) : undefined;
  if (refMm === undefined || cd === undefined) {
    const need = refMm === undefined ? 'a reference diameter (aero.refDiameterMm or aero.nose.part)' : `the nose and body dimensions for cd 'auto' (missing ${aeroRes.missing.join('; ')}), or a numeric aero.cd`;
    diagnostics.push(diag('flight.stability.unresolved', 'error', `flightStudy '${m.name}': drag cannot be computed without ${need}.`, fid));
    return { ok: false, rows: [], diagnostics, vehicle };
  }
  const sim = simulateFlight({
    dryMassKg: mass.dryKg,
    motor,
    cdA: cd.cd * Math.PI * (refMm / 2000) ** 2,
    recovery: m.recovery.map(r => ({ cdA: r.cd * Math.PI * (r.diameterMm / 2000) ** 2, deploy: r.deploy, inflateS: r.inflateS })),
    railM: m.launch.railM,
    angleDeg: m.launch.angleDeg,
    siteAltitudeM: m.launch.siteAltitudeM,
    windMs: m.launch.windMs,
    maxTimeS: m.maxTimeS,
    dtS: m.dtS,
  });
  diagnostics.push(...simDiagnostics(m, sim, motor, vehicle.liftoffMassKg, fid));
  const summary = flightSummary(m, vehicle, sim, cd, refMm);
  return { ok: !hasError(diagnostics), summary, vehicle, rows: sim.rows, diagnostics };
}

// ---- outputs -------------------------------------------------------------

export const SERIES_COLUMNS = ['t', 'x_m', 'z_m', 'v_ms', 'vz_ms', 'a_ms2', 'a_axial_ms2', 'p_static_hpa', 'temp_c', 'mass_kg', 'thrust_n', 'chute'] as const;

/** Rows thinned to one per `sampleS` (events and the last row kept), as column arrays. */
export function seriesRows(rows: readonly FlightRow[], sampleS: number): number[][] {
  const out: number[][] = [];
  let next = 0;
  const r6 = (v: number) => Math.round(v * 1e4) / 1e4;
  rows.forEach((r, i) => {
    if (r.t + 1e-9 < next && i !== rows.length - 1) return;
    next = r.t + sampleS;
    out.push([r.t, r.x, r.z, r.v, r.vz, r.az, r.aAxial, r.pHpa, r.tempC, r.massKg, r.thrustN, r.chute].map(r6));
  });
  return out;
}

export function seriesCsv(rows: readonly FlightRow[], sampleS: number): string {
  return [SERIES_COLUMNS.join(','), ...seriesRows(rows, sampleS).map(r => r.join(','))].join('\n') + '\n';
}

export interface AnimationOptions {
  /** Playback speed-up (flight seconds per playback second). Default 1. */
  speed?: number;
  /** Key spacing in flight time, s. Default 0.25. */
  keyEveryS?: number;
  /** Param name prefix. Default 'flight'. */
  prefix?: string;
}

/**
 * animationView-compatible tracks: altitude and downrange in mm (bind them to
 * a translate of the parts), chute deploy 0..1 (step), and the separation
 * distance of `separates` parts (mm, ramps over 0.5 s after deploy).
 */
export function flightAnimation(summary: FlightSummary, rows: readonly FlightRow[], m: FlightStudyMetadata, opts: AnimationOptions = {}): FlightAnimation {
  const speed = opts.speed ?? 1;
  const every = opts.keyEveryS ?? 0.25;
  const p = opts.prefix ?? 'flight';
  const atMs = (t: number) => Math.round((t * 1000) / speed);
  const alt: Array<{ atMs: number; value: number }> = [];
  const down: Array<{ atMs: number; value: number }> = [];
  let next = 0;
  const eventTimes = new Set(summary.events.map(e => e.t.toFixed(3)));
  rows.forEach((r, i) => {
    const isEvent = eventTimes.has(r.t.toFixed(3));
    if (r.t + 1e-9 < next && !isEvent && i !== rows.length - 1) return;
    if (r.t + 1e-9 >= next) next = r.t + every;
    alt.push({ atMs: atMs(r.t), value: Math.round(r.z * 1000) });
    down.push({ atMs: atMs(r.t), value: Math.round(r.x * 1000) });
  });
  const deploy = summary.events.find(e => e.name === 'deploy');
  const tracks: FlightAnimation['tracks'] = [
    { param: `${p}_altitude_mm`, keys: alt },
    { param: `${p}_downrange_mm`, keys: down },
  ];
  if (deploy !== undefined) {
    tracks.push({ param: `${p}_chute`, keys: [{ atMs: 0, value: 0 }, { atMs: atMs(deploy.t), value: 1, ease: 'step' }] });
    if (m.recovery.some(r => r.separates.length > 0)) {
      tracks.push({ param: `${p}_separation_mm`, keys: [{ atMs: 0, value: 0 }, { atMs: atMs(deploy.t), value: 0 }, { atMs: atMs(deploy.t + 0.5), value: 300 }] });
    }
  }
  const maxAlt = Math.max(1, ...alt.map(k => k.value));
  const maxDown = Math.max(1, ...down.map(k => Math.abs(k.value)));
  const decl = [
    `const ${camel(p)}Altitude = param('${p}_altitude_mm', 0, { min: 0, max: ${maxAlt}, unit: 'mm' });`,
    `const ${camel(p)}Downrange = param('${p}_downrange_mm', 0, { min: ${-maxDown}, max: ${maxDown}, unit: 'mm' });`,
    ...(deploy !== undefined ? [`const ${camel(p)}Chute = param('${p}_chute', 0, { min: 0, max: 1 });`] : []),
    ...(tracks.some(t => t.param.endsWith('_separation_mm')) ? [`const ${camel(p)}Separation = param('${p}_separation_mm', 0, { min: 0, max: 300, unit: 'mm' });`] : []),
  ];
  const durationMs = Math.max(...tracks.flatMap(t => t.keys.map(k => k.atMs)));
  const fragment = [
    ...decl,
    `// Move each flying part: part.translate([${camel(p)}Downrange, 0, ${camel(p)}Altitude]) (rocket axis +Z).`,
    `animationView({ name: '${m.name}', fps: 30, tracks: ${JSON.stringify(tracks)} });`,
  ].join('\n');
  return { durationMs, speed, tracks, scriptFragment: fragment };
}

function camel(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase());
}
