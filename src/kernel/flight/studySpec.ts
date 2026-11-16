// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/flight/studySpec.ts
//
// One validator for a flight study, shared by `shape.flightStudy({...})` /
// `arm.flightStudy({...})` (capture time) and the inline fields of
// `run_flight`. Malformed fields throw the shared invalid-args KernelError,
// naming the field, what was received, and one correct call.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type {
  DeployEvent,
  FlightAxis,
  FlightFinSpec,
  FlightRecoveryMetadata,
  FlightStudyMetadata,
  FlightStudySpec,
} from '../../shared/intent/flightStudyRecord';
import { parseEngFile } from './motor';

export const FLIGHT_STUDY_EXAMPLE =
  "flightStudy({ motor: { thrustCurve: [[0, 0], [0.1, 30], [1.9, 12], [2.1, 0]], totalMassKg: 0.062, propellantKg: 0.03 }, " +
  "aero: { cd: 0.55, refDiameterMm: 42 }, launch: { railM: 1.5 }, recovery: [{ cd: 1.5, diameterMm: 450, deploy: 'apogee+1' }] })";

const AXES: readonly FlightAxis[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
const DEFAULT_MAX_TIME_S = 300;
const DEFAULT_DT_S = 0.001;

type Bad = (path: string, got: unknown, requires: string, unit?: string) => never;

function checker(api: string): Bad {
  return (path, got, requires, unit) =>
    invalidArgs({ api, path, got, requires, example: FLIGHT_STUDY_EXAMPLE, ...(unit !== undefined ? { unit } : {}) });
}

const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const nonNegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function optPositive(v: unknown, path: string, bad: Bad, unit?: string): number | undefined {
  if (v === undefined) return undefined;
  if (!positive(v)) bad(path, v, 'a positive number', unit);
  return v;
}

function optName(v: unknown, path: string, bad: Bad): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || v.length === 0) bad(path, v, 'a part name (non-empty string)');
  return v;
}

function normalizeCurve(curve: unknown, bad: Bad): Array<readonly [number, number]> {
  if (!Array.isArray(curve) || curve.length < 2) bad('motor.thrustCurve', curve, 'at least two [t s, thrust N] points');
  const out: Array<readonly [number, number]> = [];
  (curve as unknown[]).forEach((p, i) => {
    if (!Array.isArray(p) || p.length !== 2 || !nonNegative(p[0]) || !nonNegative(p[1])) {
      bad(`motor.thrustCurve[${i}]`, p, '[t, thrust] with t >= 0 s and thrust >= 0 N');
    }
    if (i > 0 && (p[0] as number) <= out[i - 1][0]) bad(`motor.thrustCurve[${i}][0]`, p[0], `a time after the previous point (${out[i - 1][0]} s)`);
    out.push([p[0] as number, p[1] as number]);
  });
  if (!out.some(p => p[1] > 0)) bad('motor.thrustCurve', curve, 'at least one point with thrust > 0 N');
  if (out[0][0] > 0) out.unshift([0, 0]);
  return out;
}

function motorCurve(spec: Record<string, unknown>, bad: Bad): { curve: Array<readonly [number, number]>; total: unknown; prop: unknown; designation?: string } {
  if (spec.engFile === undefined) return { curve: normalizeCurve(spec.thrustCurve, bad), total: spec.totalMassKg, prop: spec.propellantKg };
  if (typeof spec.engFile !== 'string') bad('motor.engFile', spec.engFile, 'the .eng file TEXT (a string)');
  if (spec.thrustCurve !== undefined) bad('motor.thrustCurve', spec.thrustCurve, 'absent when engFile is given (use one)');
  let eng: ReturnType<typeof parseEngFile>;
  try {
    eng = parseEngFile(spec.engFile);
  } catch (e) {
    return bad('motor.engFile', '<text>', `a RASP .eng file; ${(e as Error).message}`);
  }
  return {
    curve: normalizeCurve(eng.thrustCurve, bad),
    total: spec.totalMassKg ?? eng.totalMassKg,
    prop: spec.propellantKg ?? eng.propellantKg,
    designation: eng.designation,
  };
}

function normalizeMotor(spec: unknown, bad: Bad): FlightStudyMetadata['motor'] {
  if (!isObj(spec)) bad('motor', spec, 'an object { thrustCurve | engFile, totalMassKg, propellantKg }');
  const { curve, total, prop, designation } = motorCurve(spec, bad);
  if (!positive(total)) bad('motor.totalMassKg', total, 'the loaded motor mass, > 0', 'kg');
  if (!nonNegative(prop) || prop >= total) bad('motor.propellantKg', prop, `a propellant mass >= 0 and below totalMassKg (${total} kg)`, 'kg');
  const part = optName(spec.part, 'motor.part', bad);
  const cg = optPositive(spec.cgFromNoseMm, 'motor.cgFromNoseMm', bad, 'mm');
  return {
    thrustCurve: curve,
    totalMassKg: total,
    propellantKg: prop,
    ...(designation !== undefined ? { designation } : {}),
    ...(part !== undefined ? { part } : {}),
    ...(cg !== undefined ? { cgFromNoseMm: cg } : {}),
  };
}

function normalizeFins(f: unknown, bad: Bad): FlightFinSpec | undefined {
  if (f === undefined) return undefined;
  if (!isObj(f)) bad('aero.fins', f, 'an object { count, part? | rootChordMm, tipChordMm, spanMm, sweepMm, leadingEdgeFromNoseMm }');
  if (!(Number.isInteger(f.count) && (f.count as number) >= 1 && (f.count as number) <= 8)) bad('aero.fins.count', f.count, 'an integer 1..8', 'count');
  const out: FlightFinSpec = { count: f.count as number };
  const part = optName(f.part, 'aero.fins.part', bad);
  if (part !== undefined) out.part = part;
  for (const k of ['rootChordMm', 'spanMm', 'thicknessMm', 'leadingEdgeFromNoseMm'] as const) {
    const v = optPositive(f[k], `aero.fins.${k}`, bad, 'mm');
    if (v !== undefined) out[k] = v;
  }
  for (const k of ['tipChordMm', 'sweepMm'] as const) {
    const v = f[k];
    if (v === undefined) continue;
    if (!nonNegative(v)) bad(`aero.fins.${k}`, v, 'a number >= 0', 'mm');
    out[k] = v;
  }
  return out;
}

function normalizeNose(nose: unknown, bad: Bad): FlightStudyMetadata['aero']['nose'] {
  if (nose === undefined) return { shape: 'ogive' };
  if (!isObj(nose)) bad('aero.nose', nose, "an object { shape?: 'ogive' | 'cone', part?, lengthMm? }");
  const shape = nose.shape ?? 'ogive';
  if (shape !== 'ogive' && shape !== 'cone') bad('aero.nose.shape', shape, "'ogive' or 'cone'");
  const part = optName(nose.part, 'aero.nose.part', bad);
  const lengthMm = optPositive(nose.lengthMm, 'aero.nose.lengthMm', bad, 'mm');
  return { shape, ...(part !== undefined ? { part } : {}), ...(lengthMm !== undefined ? { lengthMm } : {}) };
}

function normalizeAero(a: unknown, bad: Bad): FlightStudyMetadata['aero'] {
  if (a === undefined) return { cd: 'auto', axis: '+Z', nose: { shape: 'ogive' } };
  if (!isObj(a)) bad('aero', a, "an object { cd: 'auto' | number, refDiameterMm, nose?, fins? }");
  const cd = a.cd ?? 'auto';
  if (cd !== 'auto' && !positive(cd)) bad('aero.cd', cd, "'auto' or a positive drag coefficient");
  const axis = a.axis ?? '+Z';
  if (!AXES.includes(axis as FlightAxis)) bad('aero.axis', axis, AXES.join(' | '));
  const fins = normalizeFins(a.fins, bad);
  const ref = optPositive(a.refDiameterMm, 'aero.refDiameterMm', bad, 'mm');
  const len = optPositive(a.lengthMm, 'aero.lengthMm', bad, 'mm');
  return {
    cd: cd as 'auto' | number,
    axis: axis as FlightAxis,
    nose: normalizeNose(a.nose, bad),
    ...(ref !== undefined ? { refDiameterMm: ref } : {}),
    ...(fins !== undefined ? { fins } : {}),
    ...(len !== undefined ? { lengthMm: len } : {}),
  };
}

function normalizeLaunch(l: unknown, bad: Bad): FlightStudyMetadata['launch'] {
  if (l === undefined) l = {};
  if (!isObj(l)) bad('launch', l, 'an object { railM, angleDeg, siteAltitudeM, windMs }');
  const railM = l.railM ?? 1;
  if (!nonNegative(railM)) bad('launch.railM', railM, 'a rail length >= 0 m');
  const angleDeg = l.angleDeg ?? 0;
  if (!finite(angleDeg) || Math.abs(angleDeg) > 45) bad('launch.angleDeg', angleDeg, 'a tilt from vertical in [-45, 45]', 'deg');
  const site = l.siteAltitudeM ?? 0;
  if (!finite(site) || site < -500 || site > 11000) bad('launch.siteAltitudeM', site, 'an elevation in [-500, 11000] m');
  const wind = l.windMs ?? 0;
  if (!finite(wind)) bad('launch.windMs', wind, 'a finite wind speed in m/s');
  return { railM, angleDeg, siteAltitudeM: site, windMs: wind };
}

/** 'apogee', 'apogee+1', 'apogee+1.5s', or { atS }. */
export function parseDeploy(d: unknown, path: string, bad: Bad): FlightRecoveryMetadata['deploy'] {
  if (d === undefined || d === 'apogee') return { kind: 'apogee', delayS: 0 };
  if (typeof d === 'string') {
    const m = /^apogee\s*\+\s*(\d+(?:\.\d+)?)\s*s?$/.exec(d.trim());
    if (m === null) bad(path, d, "'apogee', 'apogee+<seconds>' (e.g. 'apogee+1') or { atS }");
    return { kind: 'apogee', delayS: Number(m[1]) };
  }
  if (isObj(d) && nonNegative(d.atS)) return { kind: 'time', atS: d.atS };
  return bad(path, d, "'apogee', 'apogee+<seconds>' or { atS: seconds after ignition }");
}

function normalizeRecovery(r: unknown, bad: Bad): FlightRecoveryMetadata[] {
  if (r === undefined) return [];
  if (!Array.isArray(r)) bad('recovery', r, 'an array of { cd, diameterMm, deploy }');
  return (r as unknown[]).map((e, i) => {
    const p = `recovery[${i}]`;
    if (!isObj(e)) bad(p, e, 'an object { cd, diameterMm, deploy }');
    if (!positive(e.cd)) bad(`${p}.cd`, e.cd, 'a positive canopy drag coefficient (1.5 for a round chute)');
    if (!positive(e.diameterMm)) bad(`${p}.diameterMm`, e.diameterMm, 'a positive canopy diameter', 'mm');
    const inflateS = e.inflateS ?? 0;
    if (!nonNegative(inflateS)) bad(`${p}.inflateS`, inflateS, 'a time >= 0 s');
    const part = optName(e.part, `${p}.part`, bad);
    const sep = e.separates ?? [];
    if (!Array.isArray(sep) || sep.some(s => typeof s !== 'string' || s.length === 0)) bad(`${p}.separates`, sep, 'an array of part names');
    return {
      cd: e.cd,
      diameterMm: e.diameterMm,
      deploy: parseDeploy(e.deploy as DeployEvent | undefined, `${p}.deploy`, bad),
      inflateS,
      separates: sep as string[],
      ...(part !== undefined ? { part } : {}),
    };
  });
}

function normalizeLimits(s: Record<string, unknown>, bad: Bad): Pick<FlightStudyMetadata, 'maxTimeS' | 'dtS' | 'minStabilityCal'> {
  const minCal = s.minStabilityCal;
  if (minCal !== undefined && !finite(minCal)) bad('minStabilityCal', minCal, 'a margin in calibers (1 to 2 is typical)');
  const maxTimeS = s.maxTimeS ?? DEFAULT_MAX_TIME_S;
  if (!positive(maxTimeS) || maxTimeS > 3600) bad('maxTimeS', maxTimeS, 'a time in (0, 3600] s');
  const dtS = s.dtS ?? DEFAULT_DT_S;
  if (!positive(dtS) || dtS > 0.05) bad('dtS', dtS, 'a step in (0, 0.05] s');
  return { maxTimeS, dtS, ...(minCal !== undefined ? { minStabilityCal: minCal } : {}) };
}

/**
 * Validate and normalize a flight study. Throws the shared invalid-args
 * KernelError on the first malformed field. `api` names the surface in the
 * message ('flightStudy(spec)' or 'run_flight').
 */
export function normalizeFlightStudy(spec: FlightStudySpec, api = 'flightStudy(spec)'): FlightStudyMetadata {
  const bad = checker(api);
  if (!isObj(spec)) bad('', spec, 'an object { motor, aero, launch, recovery }');
  const s = spec as unknown as Record<string, unknown>;
  if (s.name !== undefined && (typeof s.name !== 'string' || s.name.length === 0)) bad('name', s.name, 'a non-empty string');
  const motor = normalizeMotor(s.motor, bad);
  const aero = normalizeAero(s.aero, bad);
  const launch = normalizeLaunch(s.launch, bad);
  const recovery = normalizeRecovery(s.recovery, bad);
  const dry = optPositive(s.dryMassKg, 'dryMassKg', bad, 'kg');
  const cg = optPositive(s.cgFromNoseMm, 'cgFromNoseMm', bad, 'mm');
  return {
    virtual: true,
    name: (s.name as string | undefined) ?? 'flight',
    motor,
    aero,
    launch,
    recovery,
    ...(dry !== undefined ? { dryMassKg: dry } : {}),
    ...(cg !== undefined ? { cgFromNoseMm: cg } : {}),
    ...normalizeLimits(s, bad),
  };
}
