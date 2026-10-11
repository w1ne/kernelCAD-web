// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bend and straight rules on one tube path, in the frame the tube was
// captured in. Pure math over the path; no kernel calls. The rules come from
// `tubeSpec({...})` (or its defaults) and from the ports the tube ends on.
// A spec number may be a param: `resolveTubeSpec` reads every one through the
// param table, and the gates read only the resolved `TubeRuleSpec`.
// A `systems` entry of the spec overrides rules for the tubes of one system:
// every rule number is read through `effectiveRules`, never off the spec.

import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics/registry';
import {
  TUBE_RULE_KEYS, TUBE_SPEC_DEFAULTS,
  type TubeEndMeta, type TubeMetadata, type TubeRuleKey, type TubeRuleNumbers, type TubeRuleValue, type TubeSpecMetadata,
} from '../../../shared/intent/tubeRecord';
import type { ParamTable } from '../../../shared/runtime/paramTable';
import { resolveParams } from '../../../shared/runtime/resolveParams';
import { add, dot, scale, sub, type TubePath, type V3 } from '../../../shared/tube/tubePath';

export interface TubeRuleFinding {
  code: 'tube.bend.radius-too-small' | 'tube.straight.between-bends-too-short' |
        'tube.straight.end-too-short' | 'tube.bend.angle-exceeded' | 'tube.port.misaligned';
  message: string;
  hint: string;
}

/** A tube spec with every number resolved: what the gates read. */
export interface TubeRuleSpec extends TubeRuleNumbers {
  clearance: { default: number; pairs: Array<{ a: string; b: string; min: number }> };
  systems?: Record<string, Partial<TubeRuleNumbers>>;
}

/** A `systems` value that resolved to a number its rule cannot be. */
export interface InvalidSystemRule { system: string; key: TubeRuleKey; value: number; applied: number }

/** A top-level rule or clearance number that resolved to a number it cannot
 *  be. `rule` is the field as the script writes it; `applied` is the sentence
 *  saying what the gate used in its place. */
export interface InvalidRule { rule: string; value: number; must: string; applied: string }

const isUsableRule = (key: TubeRuleKey, v: number): boolean =>
  Number.isFinite(v) && v > 0 && (key !== 'maxBendAngle' || v <= 180);

const POSITIVE = 'a positive finite number';
export const ruleMust = (key: TubeRuleKey): string => (key === 'maxBendAngle' ? 'a number in (0, 180] degrees' : POSITIVE);

const numberOf = (v: TubeRuleValue): number => (typeof v === 'number' ? v : v.evaluated);

/** The spec's clearance numbers. A default that is not usable falls back to
 *  the built-in default; a pair whose `min` is not usable is left out, so the
 *  default clearance applies to that pair. */
function resolveClearance(clearance: TubeSpecMetadata['clearance'], invalid: InvalidRule[]): TubeRuleSpec['clearance'] {
  const fallback = TUBE_SPEC_DEFAULTS.clearance.default;
  let def = numberOf(clearance.default);
  if (!(Number.isFinite(def) && def > 0)) {
    invalid.push({ rule: 'clearance.default', value: def, must: POSITIVE, applied: `The default ${fallback} was applied.` });
    def = fallback;
  }
  const pairs = clearance.pairs.flatMap((p, i) => {
    const min = numberOf(p.min);
    if (Number.isFinite(min) && min > 0) return [{ a: p.a, b: p.b, min }];
    invalid.push({ rule: `clearance.pairs[${i}].min ('${p.a}' / '${p.b}')`, value: min, must: POSITIVE,
      applied: 'The pair was left out, so clearance.default applies to it.' });
    return [];
  });
  return { default: def, pairs };
}

/** The captured spec with every param read through the param table (a
 *  captured Param that references a script parameter has `evaluated: 0`).
 *  Capture checks every value, but a param can change afterwards. A value
 *  that is no longer usable is replaced and listed for the gate to report:
 *  a top-level rule by its default (`invalidRules`), a `systems` value by the
 *  top-level rule (`invalid`). */
export function resolveTubeSpec(
  meta: TubeSpecMetadata, table: ParamTable,
): { spec: TubeRuleSpec; invalid: InvalidSystemRule[]; invalidRules: InvalidRule[] } {
  const { systems, clearance, ...rules } = resolveParams(meta, table);
  const invalid: InvalidSystemRule[] = [];
  const invalidRules: InvalidRule[] = [];
  const top = {} as TubeRuleNumbers;
  for (const key of TUBE_RULE_KEYS) {
    const value = numberOf(rules[key]);
    top[key] = isUsableRule(key, value) ? value : TUBE_SPEC_DEFAULTS[key];
    if (!isUsableRule(key, value)) {
      invalidRules.push({ rule: key, value, must: ruleMust(key), applied: `The default ${TUBE_SPEC_DEFAULTS[key]} was applied.` });
    }
  }
  const spec: TubeRuleSpec = { ...top, clearance: resolveClearance(clearance, invalidRules) };
  if (systems === undefined) return { spec, invalid, invalidRules };
  const resolved: NonNullable<TubeRuleSpec['systems']> = {};
  for (const [system, entry] of Object.entries(systems)) {
    const overrides: Partial<TubeRuleNumbers> = {};
    for (const key of TUBE_RULE_KEYS) {
      const value = entry[key]?.evaluated;
      if (value === undefined) continue;
      if (isUsableRule(key, value)) overrides[key] = value;
      else invalid.push({ system, key, value, applied: top[key] });
    }
    resolved[system] = overrides;
  }
  return { spec: { ...spec, systems: resolved }, invalid, invalidRules };
}

/** The rules one tube is held to. `overridden` lists the rules that came from
 *  the spec's entry for `system`; `system` is set only when there are any. */
export interface EffectiveRules extends TubeRuleNumbers {
  system?: string;
  overridden: TubeRuleKey[];
}

/** The spec's rules for a tube of `system`: the system's entry where it sets
 *  a rule, the top level for the rest. */
export function effectiveRules(spec: TubeRuleSpec, system: string | undefined): EffectiveRules {
  const entry = system !== undefined && spec.systems !== undefined && Object.prototype.hasOwnProperty.call(spec.systems, system) ?
    spec.systems[system] : {};
  const overridden = TUBE_RULE_KEYS.filter((k) => entry[k] !== undefined);
  const pick = (k: TubeRuleKey): number => entry[k] ?? spec[k];
  return {
    minBendRadiusFactor: pick('minBendRadiusFactor'),
    minStraightBetweenBends: pick('minStraightBetweenBends'),
    minStraightAtEnd: pick('minStraightAtEnd'),
    maxBendAngle: pick('maxBendAngle'),
    ...(overridden.length > 0 ? { system } : {}),
    overridden,
  };
}

/** ", system 'x'" when the rule came from that system's override, else "". */
const fromSystem = (rules: EffectiveRules, key: TubeRuleKey): string =>
  rules.overridden.includes(key) ? `, system '${rules.system}'` : '';

/** " (4 x OD 10.00, system 'x')" for an overridden factor rule, else "": a
 *  rule from the top level keeps the message it always had. */
const factorSource = (rules: EffectiveRules, key: TubeRuleKey, od: number): string =>
  rules.overridden.includes(key) ? ` (${rules[key]} x OD ${mm2(od)}${fromSystem(rules, key)})` : '';

export interface TubeRuleInput {
  name: string;
  path: TubePath;
  od: number;
  meta: TubeMetadata;
  spec: TubeRuleSpec;
}

/** Lengths within this of the rule pass: the path math is float. */
const LENGTH_TOL_MM = 1e-9;
const ANGLE_TOL_DEG = 1e-9;
/** An end leg further than this off its port axis is misaligned. */
export const PORT_AXIS_TOL_DEG = 0.5;

export const mm2 = (v: number): string => v.toFixed(2);
export const xyz2 = (p: readonly number[]): string => `[${p.map(mm2).join(', ')}]`;

/** Angle between two unit vectors, in degrees. */
export const angleDeg = (u: V3, v: V3): number =>
  (Math.acos(Math.min(1, Math.max(-1, dot(u, v)))) * 180) / Math.PI;

/** The straight a tube must keep at an end: the spec rule or the port's own
 *  minimum, whichever is longer. */
export function endStraightNeed(od: number, end: TubeEndMeta, rules: Pick<EffectiveRules, 'minStraightAtEnd'>): number {
  return Math.max(rules.minStraightAtEnd * od, end.minStraight ?? 0);
}

/** One tube with the rules that apply to its system. */
interface RuledTube extends Omit<TubeRuleInput, 'spec'> { rules: EffectiveRules }

function finding(code: TubeRuleFinding['code'], text: string): TubeRuleFinding {
  return { code, message: `${code}: ${text}`, hint: DIAGNOSTIC_REGISTRY[code].hintTemplate };
}

/** A tube with no bends is exempt: its bend radius is never used. */
function bendRadiusRule({ name, path, od, rules }: RuledTube): TubeRuleFinding[] {
  const need = rules.minBendRadiusFactor * od;
  if (path.bends.length === 0 || path.bendRadius >= need - LENGTH_TOL_MM) return [];
  return [finding('tube.bend.radius-too-small',
    `tube '${name}' bends at ${mm2(path.bendRadius)} mm; the rule needs ${mm2(need)} mm ` +
    `(${rules.minBendRadiusFactor} x OD ${mm2(od)}${fromSystem(rules, 'minBendRadiusFactor')}).`)];
}

/** Legs with a bend at both ends: every leg but the first and the last. */
function straightBetweenBendsRule({ name, path, od, rules }: RuledTube): TubeRuleFinding[] {
  const need = rules.minStraightBetweenBends * od;
  const source = factorSource(rules, 'minStraightBetweenBends', od);
  const out: TubeRuleFinding[] = [];
  for (let j = 1; j < path.straights.length - 1; j++) {
    if (path.straights[j] >= need - LENGTH_TOL_MM) continue;
    out.push(finding('tube.straight.between-bends-too-short',
      `tube '${name}' leg ${j} has ${mm2(path.straights[j])} mm straight between bends; ` +
      `the rule needs ${mm2(need)} mm${source}.`));
  }
  return out;
}

function endStraightRule({ name, path, od, meta, rules }: RuledTube): TubeRuleFinding[] {
  if (path.bends.length === 0) return [];
  const ends = [
    { which: 'from', straight: path.straights[0], end: meta.from },
    { which: 'to', straight: path.straights[path.straights.length - 1], end: meta.to },
  ];
  return ends.flatMap(({ which, straight, end }) => {
    const need = endStraightNeed(od, end, rules);
    if (straight >= need - LENGTH_TOL_MM) return [];
    // Named only when the override is what sets the length, not the port's own minimum.
    const source = rules.minStraightAtEnd * od >= need ? factorSource(rules, 'minStraightAtEnd', od) : '';
    return [finding('tube.straight.end-too-short',
      `tube '${name}' has ${mm2(straight)} mm straight at its ${which} end; the rule needs ${mm2(need)} mm${source}.`)];
  });
}

function bendAngleRule({ name, path, rules }: RuledTube): TubeRuleFinding[] {
  const source = rules.overridden.includes('maxBendAngle') ? ` (system '${rules.system}')` : '';
  return path.bends.flatMap((b, k) => (b.angleDeg <= rules.maxBendAngle + ANGLE_TOL_DEG ? [] : [
    finding('tube.bend.angle-exceeded',
      `tube '${name}' bend ${k + 1} is ${mm2(b.angleDeg)} deg; the limit is ${mm2(rules.maxBendAngle)} deg${source}.`),
  ]));
}

/** The end leg must leave along the port axis. `leaving` is the leg direction
 *  out of the end; the fix point is the neighbouring corner projected onto the
 *  line through the end along the port axis, no closer to the port than the
 *  end straight the rule requires. */
function portAxisRule({ name, path, od, meta, rules }: RuledTube): TubeRuleFinding[] {
  const n = path.points.length;
  const ends: Array<{ which: string; end: V3; corner: V3; leaving: V3; of: TubeEndMeta }> = [
    { which: 'from', end: path.points[0], corner: path.points[1], leaving: path.startDir, of: meta.from },
    { which: 'to', end: path.points[n - 1], corner: path.points[n - 2], leaving: scale(path.endDir, -1), of: meta.to },
  ];
  return ends.flatMap(({ which, end, corner, leaving, of }) => {
    const axis = of.axis;
    if (axis === undefined) return [];
    const off = angleDeg(leaving, axis);
    if (off <= PORT_AXIS_TOL_DEG) return [];
    // A corner behind the port, or closer than the end straight, is sent out in front of it.
    const along = Math.max(dot(sub(corner, end), axis), endStraightNeed(od, of, rules));
    const onAxis = add(end, scale(axis, along));
    return [finding('tube.port.misaligned',
      `tube '${name}' leaves its ${which} port ${mm2(off)} deg off the port axis; put the corner at ${xyz2(onAxis)}.`)];
  });
}

/** Every rule finding for one tube; empty when the tube is legal. Bends are
 *  numbered from 1 like the bend-table rows; legs from 0 like the path errors. */
export function checkTubeRules({ spec, ...tube }: TubeRuleInput): TubeRuleFinding[] {
  const ruled: RuledTube = { ...tube, rules: effectiveRules(spec, tube.meta.system) };
  return [
    ...bendRadiusRule(ruled),
    ...straightBetweenBendsRule(ruled),
    ...endStraightRule(ruled),
    ...bendAngleRule(ruled),
    ...portAxisRule(ruled),
  ];
}
