// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Types for the tube() and tubeSpec() top-level APIs. A `tube` record is a
// bent tube: corner points joined by straight legs, one bend radius, a round
// hollow section. A `tubeSpec` record is capture-only (virtual): it declares
// the bending and clearance rules the tube gates enforce.

import type { V3 } from '../tube/tubePath';
import type { Param, Vec3Param } from './types';

export interface TubeEndMeta {
  /** The assembly part the end sits on: the port's part, or the part a
   *  plain end names. */
  part?: string;
  /** Set when the end came from a port. */
  connector?: string;
  /** Port axis, pointing out of the part. */
  axis?: V3;
  minStraight?: number;
  system?: string;
  /** Set when the end is a tee on another tube: the trunk's name and the
   *  station on its centreline, mm from the trunk's `from` end. The end's
   *  corner point is then a placeholder; `tubeGeometry` places it on the
   *  trunk's resolved path. */
  branch?: { tube: string; at: Param };
}

/** Stored at `metadata.tube` on a `tube` record, whose params are
 *  `{ od, wall, bendRadius }`. */
export interface TubeMetadata {
  name: string;
  /** Corner points. Each is `base + offset`: `base` is a part's `at` (so a
   *  param on the part moves the tube end) or absent for plain points. */
  points: Array<{ base?: Vec3Param; offset: Vec3Param }>;
  from: TubeEndMeta;
  to: TubeEndMeta;
  system?: string;
  material?: string;
  densityKgM3?: number;
  flow?: { lpm: number; fluid: string };
}

/** The four bend and straight rules. A `systems` entry may override any of them. */
export const TUBE_RULE_KEYS = ['minBendRadiusFactor', 'minStraightBetweenBends', 'minStraightAtEnd', 'maxBendAngle'] as const;
export type TubeRuleKey = typeof TUBE_RULE_KEYS[number];
export type TubeRuleNumbers = Record<TubeRuleKey, number>;

/** A top-level rule or clearance number as captured: the plain number the
 *  script wrote, or a Param when the script gave a param. Resolve a Param
 *  against the param table before reading a number (`resolveTubeSpec`); its
 *  `evaluated` is not current. */
export type TubeRuleValue = number | Param;

export interface TubeSpecMetadata extends Record<TubeRuleKey, TubeRuleValue> {
  virtual: true;
  clearance: { default: TubeRuleValue; pairs: Array<{ a: string; b: string; min: TubeRuleValue }> };
  /** Rule overrides by system name. Absent when the spec declares none. The
   *  values are captured Params: resolve them against the param table before
   *  reading a number. */
  systems?: Record<string, Partial<Record<TubeRuleKey, Param>>>;
}

export const TUBE_SPEC_DEFAULTS = {
  minBendRadiusFactor: 3,
  minStraightBetweenBends: 2,
  minStraightAtEnd: 2.5,
  maxBendAngle: 180,
  clearance: { default: 6, pairs: [] as Array<{ a: string; b: string; min: number }> },
} as const;

export function isTubeMetadata(v: unknown): v is TubeMetadata {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as TubeMetadata;
  return typeof m.name === 'string' && Array.isArray(m.points) && m.points.length >= 2 &&
    typeof m.from === 'object' && m.from !== null && typeof m.to === 'object' && m.to !== null;
}

const ev = (p: Vec3Param | undefined): V3 =>
  p === undefined ? [0, 0, 0] : [p.x.evaluated, p.y.evaluated, p.z.evaluated];

/** The corner points in mm: each point's evaluated `base + offset`. A branch
 *  end is a placeholder here; read a tube's centreline through `tubeGeometry`. */
export function tubeCornerPoints(meta: TubeMetadata): V3[] {
  return meta.points.map((p) => {
    const b = ev(p.base);
    const o = ev(p.offset);
    return [b[0] + o[0], b[1] + o[1], b[2] + o[2]];
  });
}
