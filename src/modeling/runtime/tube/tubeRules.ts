// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bend and straight rules on one tube path, in the frame the tube was
// captured in. Pure math over the path; no kernel calls. The rules come from
// `tubeSpec({...})` (or its defaults) and from the ports the tube ends on.

import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics/registry';
import type { TubeEndMeta, TubeMetadata, TubeSpecMetadata } from '../../../shared/intent/tubeRecord';
import { add, dot, scale, sub, type TubePath, type V3 } from '../../../shared/tube/tubePath';

export interface TubeRuleFinding {
  code: 'tube.bend.radius-too-small' | 'tube.straight.between-bends-too-short' |
        'tube.straight.end-too-short' | 'tube.bend.angle-exceeded' | 'tube.port.misaligned';
  message: string;
  hint: string;
}

export type TubeRuleSpec = Omit<TubeSpecMetadata, 'virtual'>;

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
export function endStraightNeed(od: number, end: TubeEndMeta, spec: TubeRuleSpec): number {
  return Math.max(spec.minStraightAtEnd * od, end.minStraight ?? 0);
}

function finding(code: TubeRuleFinding['code'], text: string): TubeRuleFinding {
  return { code, message: `${code}: ${text}`, hint: DIAGNOSTIC_REGISTRY[code].hintTemplate };
}

/** A tube with no bends is exempt: its bend radius is never used. */
function bendRadiusRule({ name, path, od, spec }: TubeRuleInput): TubeRuleFinding[] {
  const need = spec.minBendRadiusFactor * od;
  if (path.bends.length === 0 || path.bendRadius >= need - LENGTH_TOL_MM) return [];
  return [finding('tube.bend.radius-too-small',
    `tube '${name}' bends at ${mm2(path.bendRadius)} mm; the rule needs ${mm2(need)} mm ` +
    `(${spec.minBendRadiusFactor} x OD ${mm2(od)}).`)];
}

/** Legs with a bend at both ends: every leg but the first and the last. */
function straightBetweenBendsRule({ name, path, od, spec }: TubeRuleInput): TubeRuleFinding[] {
  const need = spec.minStraightBetweenBends * od;
  const out: TubeRuleFinding[] = [];
  for (let j = 1; j < path.straights.length - 1; j++) {
    if (path.straights[j] >= need - LENGTH_TOL_MM) continue;
    out.push(finding('tube.straight.between-bends-too-short',
      `tube '${name}' leg ${j} has ${mm2(path.straights[j])} mm straight between bends; ` +
      `the rule needs ${mm2(need)} mm.`));
  }
  return out;
}

function endStraightRule({ name, path, od, meta, spec }: TubeRuleInput): TubeRuleFinding[] {
  if (path.bends.length === 0) return [];
  const ends = [
    { which: 'from', straight: path.straights[0], end: meta.from },
    { which: 'to', straight: path.straights[path.straights.length - 1], end: meta.to },
  ];
  return ends.flatMap(({ which, straight, end }) => {
    const need = endStraightNeed(od, end, spec);
    if (straight >= need - LENGTH_TOL_MM) return [];
    return [finding('tube.straight.end-too-short',
      `tube '${name}' has ${mm2(straight)} mm straight at its ${which} end; the rule needs ${mm2(need)} mm.`)];
  });
}

function bendAngleRule({ name, path, spec }: TubeRuleInput): TubeRuleFinding[] {
  return path.bends.flatMap((b, k) => (b.angleDeg <= spec.maxBendAngle + ANGLE_TOL_DEG ? [] : [
    finding('tube.bend.angle-exceeded',
      `tube '${name}' bend ${k + 1} is ${mm2(b.angleDeg)} deg; the limit is ${mm2(spec.maxBendAngle)} deg.`),
  ]));
}

/** The end leg must leave along the port axis. `leaving` is the leg direction
 *  out of the end; the fix point is the neighbouring corner projected onto the
 *  line through the end along the port axis, no closer to the port than the
 *  end straight the rule requires. */
function portAxisRule({ name, path, od, meta, spec }: TubeRuleInput): TubeRuleFinding[] {
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
    const along = Math.max(dot(sub(corner, end), axis), endStraightNeed(od, of, spec));
    const onAxis = add(end, scale(axis, along));
    return [finding('tube.port.misaligned',
      `tube '${name}' leaves its ${which} port ${mm2(off)} deg off the port axis; put the corner at ${xyz2(onAxis)}.`)];
  });
}

/** Every rule finding for one tube; empty when the tube is legal. Bends are
 *  numbered from 1 like the bend-table rows; legs from 0 like the path errors. */
export function checkTubeRules(input: TubeRuleInput): TubeRuleFinding[] {
  return [
    ...bendRadiusRule(input),
    ...straightBetweenBendsRule(input),
    ...endStraightRule(input),
    ...bendAngleRule(input),
    ...portAxisRule(input),
  ];
}
