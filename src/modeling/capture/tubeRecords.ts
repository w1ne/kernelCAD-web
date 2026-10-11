// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture-time feature-record builders for the tube() and tubeSpec() script
// functions. Validation throws `feature.invalid-args` with a stable
// `tube.*` / `tubeSpec:` message prefix; a tube rule that is silently
// ignored would disable the gate it declares.

import type { EditableVec3, Param, Vec3, Vec3Param } from '../../shared/intent/types';
import type { Editable } from '../../shared/runtime/paramRef';
import { isParamRef } from '../../shared/runtime/paramRef';
import { toParam, toVec3Param, paramValue, resolveVec3Param } from '../../shared/runtime/editableHelpers';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import {
  TUBE_RULE_KEYS,
  TUBE_SPEC_DEFAULTS,
  type TubeEndMeta,
  type TubeMetadata,
  type TubeRuleKey,
  type TubeRuleValue,
  type TubeSpecMetadata,
} from '../../shared/intent/tubeRecord';
import { buildTubePath, isTubePathError, tubePathErrorArgs, type V3 } from '../../shared/tube/tubePath';
import { TUBE_FLUIDS } from '../../shared/tube/pressureDrop';
import { mm } from '../apiSupport';
import type { TubeEnd } from './assemblyTypes';
import type { AuthoringFeatureSpec } from './authoringFeatureRecords';

/** A tube end that is not a port. `part` names the assembly part the end
 *  sits on, which excuses the end straight from clearance against that part. */
export interface TubePointEnd {
  point: EditableVec3;
  axis?: Vec3;
  part?: string;
}

export interface TubeOptions {
  from: TubeEnd | TubePointEnd;
  to: TubeEnd | TubePointEnd;
  via?: EditableVec3[];
  od?: Editable<number>;
  wall: Editable<number>;
  bendRadius: Editable<number>;
  system?: string;
  material?: string;
  /** kg/m^3 */
  density?: number;
  flow?: { lpm: number; fluid: string };
}

/** Every number may be a plain number or a param. */
export interface TubeSpec {
  minBendRadiusFactor?: Editable<number>;
  minStraightBetweenBends?: Editable<number>;
  minStraightAtEnd?: Editable<number>;
  maxBendAngle?: Editable<number>;
  clearance?: { default?: Editable<number>; pairs?: Array<{ a: string; b: string; min: Editable<number> }> };
  /** Rule overrides for the tubes of one system; a rule left out falls back
   *  to the top level. Clearance between systems stays in `clearance.pairs`. */
  systems?: Record<string, TubeSystemRules>;
}

export type TubeSystemRules = Partial<Record<TubeRuleKey, Editable<number>>>;

const OD_MATCH_TOL_MM = 1e-6;

const TUBE_EXAMPLE =
  "tube('hyd-p', { from: pump.port('out'), to: { point: [0, 0, 100] }, via: [[20, 20, 120]], wall: 0.89, bendRadius: 28.6 })";

/** What differs between the tube() argument errors. `reason` completes the
 *  stable `tube.<reason>` message prefix; `hint` is the recovery step. */
interface TubeFault {
  reason: string;
  path: string;
  got?: unknown;
  gotText?: string;
  requires: string;
  unit?: string;
  example?: string;
  hint: string;
}

function fail({ reason, example, ...rest }: TubeFault): never {
  invalidArgs({ api: `tube.${reason}`, example: example ?? TUBE_EXAMPLE, ...rest });
}

const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const isPositive = (n: unknown): n is number => isFiniteNum(n) && n > 0;

// ---------------------------------------------------------------------------
// tube()
// ---------------------------------------------------------------------------

function validateName(name: unknown, usedNames: readonly string[]): string {
  if (typeof name !== 'string' || name.length === 0) {
    fail({ reason: 'name.invalid', path: 'name', gotText: json(name), requires: 'a non-empty string',
      hint: 'Pass a short unique name, for example tube("hyd-p", { ... }).' });
  }
  if (/[,"\r\n]/.test(name)) {
    fail({ reason: 'name.invalid', path: 'name', gotText: json(name),
      requires: 'a name with no comma, double quote or line break',
      hint: 'Use letters, digits, dashes and underscores; the name is written into the bend-table CSV.' });
  }
  if (usedNames.includes(name)) {
    fail({ reason: 'name.invalid', path: 'name', gotText: `'${name}', which another tube in this script already uses`,
      requires: 'a name no other tube() has', hint: 'Give every tube() a unique name.' });
  }
  return name;
}

function unitAxis(axis: unknown, which: string): V3 {
  const ok = Array.isArray(axis) && axis.length === 3 && axis.every(isFiniteNum);
  const len = ok ? Math.hypot(axis[0], axis[1], axis[2]) : 0;
  if (!ok || len === 0) {
    fail({ reason: 'end.invalid', path: `${which}.axis`, gotText: json(axis),
      requires: 'a finite, non-zero [x, y, z]', example: `${which}: { point: [0, 0, 100], axis: [0, 0, 1] }`,
      hint: 'Pass the direction the tube leaves the end along, for example axis: [0, 0, 1].' });
  }
  return [axis[0] / len, axis[1] / len, axis[2] / len];
}

/** The assembly part a plain end sits on: a non-empty name. */
function endPartName(part: unknown, which: string): string {
  if (typeof part !== 'string' || part.length === 0) {
    fail({ reason: 'end.invalid', path: `${which}.part`, gotText: json(part),
      requires: 'the name of the assembly part the end sits on, as a non-empty string',
      example: `${which}: { point: [0, 0, 100], axis: [0, 0, 1], part: 'pump' }`,
      hint: "Pass the name the part was added under, for example part: 'pump', or leave part out for an end in free space." });
  }
  return part;
}

interface ResolvedEnd {
  point: { base?: Vec3Param; offset: Vec3Param };
  meta: TubeEndMeta;
  od?: number;
}

function portEnd(e: TubeEnd): ResolvedEnd {
  return {
    point: { ...(e.base !== undefined ? { base: e.base } : {}), offset: toVec3Param(e.offset, 'mm') },
    meta: {
      ...(e.part !== undefined ? { part: e.part } : {}),
      ...(e.connector !== undefined ? { connector: e.connector } : {}),
      axis: e.axis,
      ...(e.minStraight !== undefined ? { minStraight: e.minStraight } : {}),
      ...(e.system !== undefined ? { system: e.system } : {}),
    },
    ...(e.od !== undefined ? { od: e.od } : {}),
  };
}

function endOf(e: TubeOptions['from'], which: string): ResolvedEnd {
  if (typeof e === 'object' && e !== null && 'offset' in e) return portEnd(e);
  if (typeof e !== 'object' || e === null || !('point' in e)) {
    fail({ reason: 'end.invalid', path: which, got: e, requires: 'part.port(name) or { point: [x, y, z], axis?, part? }',
      hint: "Example: from: pump.port('out'), to: { point: [0, 0, 100] }." });
  }
  return {
    point: { offset: toVec3Param(e.point, 'mm') },
    meta: {
      ...(e.part !== undefined ? { part: endPartName(e.part, which) } : {}),
      ...(e.axis !== undefined ? { axis: unitAxis(e.axis, which) } : {}),
    },
  };
}

function viaPoints(via: TubeOptions['via']): Array<{ offset: Vec3Param }> {
  if (via === undefined) return [];
  if (!Array.isArray(via)) {
    fail({ reason: 'via.invalid', path: 'via', got: via, requires: 'an array of [x, y, z] corner points',
      hint: 'Example: via: [[20, 20, 120], [100, 20, 120]].' });
  }
  return via.map((p) => ({ offset: toVec3Param(p, 'mm') }));
}

function resolveOd(
  explicit: Editable<number> | undefined, from: ResolvedEnd, to: ResolvedEnd, table: ParamTable,
): { param: Param; mm: number } {
  const portOds = [from.od, to.od].filter((o): o is number => o !== undefined);
  const param = explicit !== undefined ? mm(explicit) : undefined;
  const od = param !== undefined ? paramValue(param, table) : undefined;
  if (od !== undefined && !isPositive(od)) {
    fail({ reason: 'od.invalid', path: 'od', got: od, requires: 'a positive finite number', unit: 'mm',
      hint: 'Pass od in millimetres, for example od: 9.525.' });
  }
  if (od === undefined && portOds.length === 0) {
    fail({ reason: 'od.required', path: 'od', gotText: 'no od, and neither end is a port',
      requires: 'od: <mm>, or a part.port(name) end that declares the port size',
      hint: 'Pass od: <mm>, or use part.port(name) ends that declare the port size.' });
  }
  const all = od !== undefined ? [...portOds, od] : portOds;
  const reference = all[0];
  const differs = all.some((o) => Math.abs(o - reference) > OD_MATCH_TOL_MM);
  if (differs) {
    fail({ reason: 'port.od-mismatch', path: 'od', gotText: `${all.join(' vs ')} mm across the tube od and its port sizes`,
      requires: 'one outer diameter shared by the tube and every port it ends on',
      hint: 'Use ports of the same size, or fix the od so it matches both ports.' });
  }
  return { param: param ?? mm(reference), mm: reference };
}

function resolveWall(wall: Editable<number>, od: number, table: ParamTable): Param {
  const p = mm(wall);
  const v = paramValue(p, table);
  if (!isPositive(v) || v >= od / 2) {
    fail({ reason: 'wall.invalid', path: 'wall', got: v, requires: `a positive number below half the od (${od / 2} mm)`,
      unit: 'mm', hint: 'Pick a wall thickness between 0 and od / 2, for example 0.89 for 9.525 mm tube.' });
  }
  return p;
}

function resolveBendRadius(radius: Editable<number>, table: ParamTable): { param: Param; mm: number } {
  const p = mm(radius);
  const v = paramValue(p, table);
  if (!isPositive(v)) {
    fail({ reason: 'bend-radius.invalid', path: 'bendRadius', got: v, requires: 'a positive finite number', unit: 'mm',
      hint: 'Pass the centreline bend radius in millimetres, for example bendRadius: 28.6.' });
  }
  return { param: p, mm: v };
}

const FLOW_EXAMPLE = "flow: { lpm: 6, fluid: 'water' }";

function validateFlow(flow: TubeOptions['flow']): void {
  if (flow === undefined) return;
  if (typeof flow !== 'object' || flow === null || Array.isArray(flow)) {
    fail({ reason: 'flow.invalid', path: 'flow', gotText: json(flow), requires: 'an object { lpm, fluid }',
      example: FLOW_EXAMPLE, hint: "Example: flow: { lpm: 6, fluid: 'water' }." });
  }
  if (!isPositive(flow.lpm)) {
    fail({ reason: 'flow.invalid', path: 'flow.lpm', got: flow.lpm, requires: 'a positive finite number', unit: 'L/min',
      example: FLOW_EXAMPLE,
      hint: 'Pass the flow rate in L/min, for example flow: { lpm: 6, fluid }; leave flow out for a line with no flow estimate.' });
  }
  if (!Object.prototype.hasOwnProperty.call(TUBE_FLUIDS, flow.fluid)) {
    fail({ reason: 'flow.unknown-fluid', path: 'flow.fluid', gotText: json(flow.fluid),
      requires: `one of ${Object.keys(TUBE_FLUIDS).join(', ')}`, example: FLOW_EXAMPLE,
      hint: `Use one of: ${Object.keys(TUBE_FLUIDS).join(', ')}.` });
  }
}

function validateDensity(density: TubeOptions['density']): void {
  if (density === undefined || isPositive(density)) return;
  fail({ reason: 'density.invalid', path: 'density', got: density, requires: 'a positive finite number', unit: 'kg/m^3',
    example: 'density: 7850',
    hint: 'Pass the tube material density in kg/m^3, for example density: 7850, or name a material instead.' });
}

/** Corner points in mm, read through the ParamTable: a symbolic Param's
 *  `evaluated` is a placeholder (0) at capture time. */
function resolvedCorners(meta: TubeMetadata, table: ParamTable): V3[] {
  const zero: V3 = [0, 0, 0];
  return meta.points.map((p) => {
    const b = p.base !== undefined ? resolveVec3Param(p.base, table) : zero;
    const o = resolveVec3Param(p.offset, table);
    return [b[0] + o[0], b[1] + o[1], b[2] + o[2]];
  });
}

function checkPath(name: string, meta: TubeMetadata, bendRadius: number, table: ParamTable): void {
  const points = resolvedCorners(meta, table);
  if (!points.every((p) => p.every(isFiniteNum))) {
    fail({ reason: 'end.invalid', path: `tube '${name}' corner points`, gotText: 'a non-finite coordinate (NaN or Infinity)',
      requires: 'finite [x, y, z] for the ends, the via corners and the part positions',
      hint: 'Check the end points, the via corners and the part positions for NaN or Infinity.' });
  }
  const path = buildTubePath(points, bendRadius);
  if (isTubePathError(path)) {
    invalidArgs({ ...tubePathErrorArgs(name, path),
      hint: 'Move a corner, lower bendRadius, or add a via corner so every leg is long enough for the bends at its ends.' });
  }
}

function buildTubeMetadata(
  name: string, opts: TubeOptions, from: ResolvedEnd, to: ResolvedEnd, via: Array<{ offset: Vec3Param }>,
): TubeMetadata {
  const system = opts.system ?? from.meta.system ?? to.meta.system;
  return {
    name,
    points: [from.point, ...via, to.point],
    from: from.meta,
    to: to.meta,
    ...(system !== undefined ? { system } : {}),
    ...(opts.material !== undefined ? { material: opts.material } : {}),
    ...(opts.density !== undefined ? { densityKgM3: opts.density } : {}),
    ...(opts.flow !== undefined ? { flow: { lpm: opts.flow.lpm, fluid: opts.flow.fluid } } : {}),
  };
}

export function buildTubeFeatureSpec(
  name: string, opts: TubeOptions, usedNames: readonly string[], table: ParamTable,
): AuthoringFeatureSpec {
  validateName(name, usedNames);
  const from = endOf(opts.from, 'from');
  const to = endOf(opts.to, 'to');
  const via = viaPoints(opts.via);
  const od = resolveOd(opts.od, from, to, table);
  const wall = resolveWall(opts.wall, od.mm, table);
  const bendRadius = resolveBendRadius(opts.bendRadius, table);
  validateFlow(opts.flow);
  validateDensity(opts.density);
  const metadata = buildTubeMetadata(name, opts, from, to, via);
  checkPath(name, metadata, bendRadius.mm, table);
  return {
    kind: 'tube',
    params: { od: od.param, wall, bendRadius: bendRadius.param },
    inputs: {},
    metadata: { tube: metadata } as unknown as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// tubeSpec()
// ---------------------------------------------------------------------------

const SPEC_EXAMPLE = "tubeSpec({ minBendRadiusFactor: 3, clearance: { default: 6, pairs: [{ a: 'fuel', b: 'bleed', min: 25 }] } })";

const json = (v: unknown): string => String(JSON.stringify(v));

function badSpec(field: string, gotText: string, requires: string): never {
  invalidArgs({
    api: 'tubeSpec',
    path: field,
    gotText,
    requires,
    example: SPEC_EXAMPLE,
    hint: `invalid-args.tube-spec.${field} — fix the field; tubeSpec is an enforcement gate, malformed declarations fail the build rather than silently disabling checks.`,
  });
}

/** What a spec number is: a multiple of the OD, a bend angle, or a distance. */
type RuleKind = 'factor' | 'angle' | 'distance';
const RULE_UNIT = { factor: 'unitless', angle: 'deg', distance: 'mm' } as const;
const kindOf = (key: TubeRuleKey): RuleKind => (key === 'maxBendAngle' ? 'angle' : 'factor');

/** One spec number as a Param: a number or a param, checked at its current value. */
function ruleParam(field: string, kind: RuleKind, v: unknown, table: ParamTable): Param {
  const requires = kind === 'angle' ? 'a number in (0, 180] degrees' : 'a positive finite number';
  if (!isParamRef(v) && typeof v !== 'number') badSpec(field, json(v), requires);
  const p = toParam(v as Editable<number>, RULE_UNIT[kind]);
  const value = paramValue(p, table);
  if (!isPositive(value) || (kind === 'angle' && value > 180)) badSpec(field, json(value), requires);
  return p;
}

/** A top-level number as stored: a plain number stays the number it was (the
 *  record a spec without params always had), a param is stored as a Param. */
function ruleValue(field: string, kind: RuleKind, v: unknown, table: ParamTable): TubeRuleValue {
  const p = ruleParam(field, kind, v, table);
  return isParamRef(v) ? p : (v as number);
}

function clearancePair(i: number, p: unknown, table: ParamTable): TubeSpecMetadata['clearance']['pairs'][number] {
  const pair = p as { a?: unknown; b?: unknown; min?: unknown } | null;
  const nameOk = (n: unknown): n is string => typeof n === 'string' && n.length > 0;
  if (typeof pair !== 'object' || pair === null || !nameOk(pair.a) || !nameOk(pair.b)) {
    badSpec(`clearance.pairs[${i}]`, json(p), '{ a, b, min } with two non-empty system names');
  }
  const field = `clearance.pairs[${i}].min`;
  if (pair.min === undefined) badSpec(field, 'no min', 'a positive finite number (the field is required)');
  return { a: pair.a as string, b: pair.b as string, min: ruleValue(field, 'distance', pair.min, table) };
}

const SPEC_FIELDS = [...TUBE_RULE_KEYS, 'clearance', 'systems'];
const CLEARANCE_FIELDS = ['default', 'pairs'];

/** A misspelt rule would be dropped and its default enforced instead: refuse it. */
function rejectUnknownKeys(obj: object, allowed: readonly string[], prefix: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      badSpec(`${prefix}${key}`, 'a field tubeSpec does not have', `one of ${allowed.map((k) => prefix + k).join(', ')}`);
    }
  }
}

function clearanceField(v: unknown, table: ParamTable): TubeSpecMetadata['clearance'] {
  if (v === undefined) return { default: TUBE_SPEC_DEFAULTS.clearance.default, pairs: [] };
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    badSpec('clearance', json(v), 'an object { default?, pairs? }');
  }
  rejectUnknownKeys(v, CLEARANCE_FIELDS, 'clearance.');
  const c = v as { default?: unknown; pairs?: unknown };
  if (c.pairs !== undefined && !Array.isArray(c.pairs)) {
    badSpec('clearance.pairs', json(c.pairs), 'an array of { a, b, min }');
  }
  return {
    default: c.default === undefined ? TUBE_SPEC_DEFAULTS.clearance.default :
      ruleValue('clearance.default', 'distance', c.default, table),
    pairs: ((c.pairs as unknown[] | undefined) ?? []).map((p, i) => clearancePair(i, p, table)),
  };
}

function systemEntry(name: string, entry: unknown, table: ParamTable): Partial<Record<TubeRuleKey, Param>> {
  const prefix = `systems.${name}.`;
  const fields = TUBE_RULE_KEYS.map((k) => prefix + k).join(', ');
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    badSpec(`systems.${name}`, json(entry), `an object with any of ${TUBE_RULE_KEYS.join(', ')}`);
  }
  if ('clearance' in entry) {
    badSpec(`${prefix}clearance`, 'a field a systems entry does not have',
      `clearance between systems in clearance.pairs, and one of ${fields}`);
  }
  rejectUnknownKeys(entry, TUBE_RULE_KEYS, prefix);
  const rules = entry as Partial<Record<TubeRuleKey, unknown>>;
  const out: Partial<Record<TubeRuleKey, Param>> = {};
  for (const key of TUBE_RULE_KEYS) {
    if (rules[key] !== undefined) out[key] = ruleParam(prefix + key, kindOf(key), rules[key], table);
  }
  return out;
}

function systemsField(v: unknown, table: ParamTable): TubeSpecMetadata['systems'] {
  if (v === undefined) return undefined;
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    badSpec('systems', json(v), "an object keyed by system name, like { 'hot-gas': { minBendRadiusFactor: 1.5 } }");
  }
  const out: NonNullable<TubeSpecMetadata['systems']> = {};
  for (const [name, entry] of Object.entries(v)) {
    if (name.length === 0) badSpec('systems', 'an entry with an empty name', 'a non-empty system name for every entry');
    out[name] = systemEntry(name, entry, table);
  }
  return out;
}

export function buildTubeSpecFeatureSpec(spec: TubeSpec, table: ParamTable): AuthoringFeatureSpec {
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
    badSpec('spec', json(spec), 'an object like { minBendRadiusFactor?, clearance? }');
  }
  rejectUnknownKeys(spec, SPEC_FIELDS, '');
  const systems = systemsField(spec.systems, table);
  const rule = (key: TubeRuleKey): TubeRuleValue =>
    (spec[key] === undefined ? TUBE_SPEC_DEFAULTS[key] : ruleValue(key, kindOf(key), spec[key], table));
  const metadata: TubeSpecMetadata = {
    virtual: true,
    minBendRadiusFactor: rule('minBendRadiusFactor'),
    minStraightBetweenBends: rule('minStraightBetweenBends'),
    minStraightAtEnd: rule('minStraightAtEnd'),
    maxBendAngle: rule('maxBendAngle'),
    clearance: clearanceField(spec.clearance, table),
    ...(systems !== undefined ? { systems } : {}),
  };
  return { kind: 'tubeSpec', params: {}, inputs: {}, metadata: metadata as unknown as Record<string, unknown> };
}
