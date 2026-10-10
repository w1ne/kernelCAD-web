// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture-time feature-record builders for the tube() and tubeSpec() script
// functions. Validation throws `feature.invalid-args` with a stable
// `tube.*` / `tubeSpec:` message prefix; a tube rule that is silently
// ignored would disable the gate it declares.

import type { EditableVec3, Param, Vec3, Vec3Param } from '../../shared/intent/types';
import type { Editable } from '../../shared/runtime/paramRef';
import { toVec3Param, paramValue, resolveVec3Param } from '../../shared/runtime/editableHelpers';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { KernelError } from '../../shared/intent/kernelError';
import {
  TUBE_SPEC_DEFAULTS,
  type TubeEndMeta,
  type TubeMetadata,
  type TubeSpecMetadata,
} from '../../shared/intent/tubeRecord';
import { buildTubePath, isTubePathError, tubePathErrorMessage, type V3 } from '../../shared/tube/tubePath';
import { TUBE_FLUIDS } from '../../shared/tube/pressureDrop';
import { mm } from '../apiSupport';
import type { TubeEnd } from './assemblyTypes';
import type { AuthoringFeatureSpec } from './authoringFeatureRecords';

export interface TubeOptions {
  from: TubeEnd | { point: EditableVec3; axis?: Vec3 };
  to: TubeEnd | { point: EditableVec3; axis?: Vec3 };
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

export interface TubeSpec {
  minBendRadiusFactor?: number;
  minStraightBetweenBends?: number;
  minStraightAtEnd?: number;
  maxBendAngle?: number;
  clearance?: { default?: number; pairs?: Array<{ a: string; b: string; min: number }> };
}

const OD_MATCH_TOL_MM = 1e-6;

function fail(message: string, hint: string): never {
  throw new KernelError('feature.invalid-args', message, undefined, hint);
}

const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const isPositive = (n: unknown): n is number => isFiniteNum(n) && n > 0;

// ---------------------------------------------------------------------------
// tube()
// ---------------------------------------------------------------------------

function validateName(name: unknown, usedNames: readonly string[]): string {
  if (typeof name !== 'string' || name.length === 0) {
    fail(`tube.name.invalid: tube name must be a non-empty string; got ${JSON.stringify(name)}.`,
      'Pass a short unique name, for example tube("hyd-p", { ... }).');
  }
  if (/[,"\r\n]/.test(name)) {
    fail(`tube.name.invalid: tube name ${JSON.stringify(name)} contains a comma, a double quote or a line break.`,
      'Use letters, digits, dashes and underscores; the name is written into the bend-table CSV.');
  }
  if (usedNames.includes(name)) {
    fail(`tube.name.invalid: a tube named '${name}' already exists in this script.`,
      'Give every tube() a unique name.');
  }
  return name;
}

function unitAxis(axis: unknown, which: string): V3 {
  const ok = Array.isArray(axis) && axis.length === 3 && axis.every(isFiniteNum);
  const len = ok ? Math.hypot(axis[0], axis[1], axis[2]) : 0;
  if (!ok || len === 0) {
    fail(`tube.end.invalid: '${which}' axis ${JSON.stringify(axis)} must be a finite, non-zero [x, y, z].`,
      'Pass the direction the tube leaves the end along, for example axis: [0, 0, 1].');
  }
  return [axis[0] / len, axis[1] / len, axis[2] / len];
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
    fail(`tube.end.invalid: '${which}' must be part.port(name) or { point: [x, y, z], axis? }.`,
      "Example: from: pump.port('out'), to: { point: [0, 0, 100] }.");
  }
  return {
    point: { offset: toVec3Param(e.point, 'mm') },
    meta: e.axis !== undefined ? { axis: unitAxis(e.axis, which) } : {},
  };
}

function viaPoints(via: TubeOptions['via']): Array<{ offset: Vec3Param }> {
  if (via === undefined) return [];
  if (!Array.isArray(via)) {
    fail('tube.via.invalid: via must be an array of [x, y, z] corner points.',
      'Example: via: [[20, 20, 120], [100, 20, 120]].');
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
    fail(`tube.od.invalid: od must be a positive finite number in mm; got ${od}.`,
      'Pass od in millimetres, for example od: 9.525.');
  }
  if (od === undefined && portOds.length === 0) {
    fail('tube.od.required: no od given and neither end is a port.',
      'Pass od: <mm>, or use part.port(name) ends that declare the port size.');
  }
  const all = od !== undefined ? [...portOds, od] : portOds;
  const reference = all[0];
  const differs = all.some((o) => Math.abs(o - reference) > OD_MATCH_TOL_MM);
  if (differs) {
    fail(`tube.port.od-mismatch: the tube od and its port sizes disagree (${all.join(' vs ')} mm).`,
      'Use ports of the same size, or fix the od so it matches both ports.');
  }
  return { param: param ?? mm(reference), mm: reference };
}

function resolveWall(wall: Editable<number>, od: number, table: ParamTable): Param {
  const p = mm(wall);
  const v = paramValue(p, table);
  if (!isPositive(v) || v >= od / 2) {
    fail(`tube.wall.invalid: wall ${v} mm must be positive and below half the od (${od / 2} mm).`,
      'Pick a wall thickness between 0 and od / 2, for example 0.89 for 9.525 mm tube.');
  }
  return p;
}

function resolveBendRadius(radius: Editable<number>, table: ParamTable): { param: Param; mm: number } {
  const p = mm(radius);
  const v = paramValue(p, table);
  if (!isPositive(v)) {
    fail(`tube.bend-radius.invalid: bendRadius must be a positive finite number in mm; got ${v}.`,
      'Pass the centreline bend radius in millimetres, for example bendRadius: 28.6.');
  }
  return { param: p, mm: v };
}

function validateFlow(flow: TubeOptions['flow']): void {
  if (flow === undefined) return;
  if (!Object.prototype.hasOwnProperty.call(TUBE_FLUIDS, flow.fluid)) {
    fail(`tube.flow.unknown-fluid: fluid ${JSON.stringify(flow.fluid)} is not known.`,
      `Use one of: ${Object.keys(TUBE_FLUIDS).join(', ')}.`);
  }
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
    fail(`tube.end.invalid: tube '${name}' has a non-finite corner point.`,
      'Check the end points, the via corners and the part positions for NaN or Infinity.');
  }
  const path = buildTubePath(points, bendRadius);
  if (isTubePathError(path)) {
    fail(tubePathErrorMessage(name, path),
      'Move a corner, lower bendRadius, or add a via corner so every leg is long enough for the bends at its ends.');
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

function badSpec(field: string, why: string): never {
  throw new KernelError(
    'feature.invalid-args',
    `tubeSpec: ${field} ${why}.`,
    undefined,
    `invalid-args.tube-spec.${field} — fix the field; tubeSpec is an enforcement gate, malformed declarations fail the build rather than silently disabling checks.`,
  );
}

function positiveField(field: string, v: unknown, fallback: number): number {
  if (v === undefined) return fallback;
  if (!isPositive(v)) badSpec(field, `must be a positive finite number; got ${JSON.stringify(v)}`);
  return v;
}

function bendAngleField(v: unknown): number {
  if (v === undefined) return TUBE_SPEC_DEFAULTS.maxBendAngle;
  if (!isPositive(v) || v > 180) badSpec('maxBendAngle', `must be in (0, 180] degrees; got ${JSON.stringify(v)}`);
  return v;
}

function clearancePair(i: number, p: unknown): { a: string; b: string; min: number } {
  const pair = p as { a?: unknown; b?: unknown; min?: unknown } | null;
  const nameOk = (n: unknown): n is string => typeof n === 'string' && n.length > 0;
  if (typeof pair !== 'object' || pair === null || !nameOk(pair.a) || !nameOk(pair.b)) {
    badSpec(`clearance.pairs[${i}]`, `must be { a, b, min } with two non-empty system names; got ${JSON.stringify(p)}`);
  }
  const min = positiveField(`clearance.pairs[${i}].min`, pair.min, Number.NaN);
  if (Number.isNaN(min)) badSpec(`clearance.pairs[${i}].min`, 'is required and must be a positive finite number');
  return { a: pair.a as string, b: pair.b as string, min };
}

function clearanceField(v: unknown): TubeSpecMetadata['clearance'] {
  if (v === undefined) return { default: TUBE_SPEC_DEFAULTS.clearance.default, pairs: [] };
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    badSpec('clearance', `must be { default?, pairs? }; got ${JSON.stringify(v)}`);
  }
  const c = v as { default?: unknown; pairs?: unknown };
  if (c.pairs !== undefined && !Array.isArray(c.pairs)) {
    badSpec('clearance.pairs', `must be an array of { a, b, min }; got ${JSON.stringify(c.pairs)}`);
  }
  return {
    default: positiveField('clearance.default', c.default, TUBE_SPEC_DEFAULTS.clearance.default),
    pairs: ((c.pairs as unknown[] | undefined) ?? []).map((p, i) => clearancePair(i, p)),
  };
}

export function buildTubeSpecFeatureSpec(spec: TubeSpec): AuthoringFeatureSpec {
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
    badSpec('spec', `must be an object like { minBendRadiusFactor?, clearance? }; got ${JSON.stringify(spec)}`);
  }
  const metadata: TubeSpecMetadata = {
    virtual: true,
    minBendRadiusFactor: positiveField('minBendRadiusFactor', spec.minBendRadiusFactor, TUBE_SPEC_DEFAULTS.minBendRadiusFactor),
    minStraightBetweenBends: positiveField('minStraightBetweenBends', spec.minStraightBetweenBends, TUBE_SPEC_DEFAULTS.minStraightBetweenBends),
    minStraightAtEnd: positiveField('minStraightAtEnd', spec.minStraightAtEnd, TUBE_SPEC_DEFAULTS.minStraightAtEnd),
    maxBendAngle: bendAngleField(spec.maxBendAngle),
    clearance: clearanceField(spec.clearance),
  };
  return { kind: 'tubeSpec', params: {}, inputs: {}, metadata: metadata as unknown as Record<string, unknown> };
}
