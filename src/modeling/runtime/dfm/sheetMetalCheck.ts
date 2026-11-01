// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/sheetMetalCheck.ts
//
// Sheet-metal manufacturability checks for one part (dfm_review
// processes: ['sheet-metal']). Reuses the existing sheet-metal machinery:
// the part's record chain must root at sheetMetal(...) (findRootSheetMetalRecord
// semantics), the flat pattern comes from flattenPatternWithHoles (outline,
// blank holes / cutouts and bend lines in FLAT-BLANK coordinates) and the
// bend zone width from computeBendAllowance. Every check runs on that flat
// pattern, so all reported locations are flat-blank [x, y] in mm.
//
//   - min bend radius: inner bend radius >= ratio × thickness;
//   - hole to bend: hole edge to bend line >= k × thickness + inner radius;
//   - hole to edge: hole edge to blank outline >= k × thickness;
//   - min flange: each leg of each bend, measured from the outside of the
//     bend (straight leg + inner radius + thickness, the 90° outside
//     dimension) >= k × thickness.
//
// Default multipliers (SHEET_METAL_DEFAULTS) follow Fabcon's "Design for
// Manufacturability Guide for Sheet Metal Parts"
// (https://fabcon.com/articles/sheet-metal-fabrication/sheet-metal-dfm-guide/):
// "R >= T is a conservative starting point", "minimum hole-to-bend distance
// is 2.5× thickness plus the inside bend radius ... measured from the hole
// edge to the bend line", "minimum hole-to-edge clearance is 2× material
// thickness", "minimum flange length is at least 4× material thickness,
// measured from the outside of the bend". The hole-to-edge 2 × t also
// matches Century-Tywood's Manufacturing Reference for Sheet Metal Products
// ("twice the thickness"). Fabricators differ; every multiplier is a call
// option.

import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { Region, Vec2 } from '../../../shared/intent/region';
import type { FeatureId } from '../../../shared/intent/types';
import type { ShapeBackend } from '../../../kernel/backends/backend';
import { computeBendAllowance } from '../../sheetMetal';
import { flattenPatternWithHoles } from '../../sheetMetalFlatPattern';

export interface SheetMetalSettings {
  /** Inner bend radius must be >= this × thickness. */
  minBendRadiusRatio: number;
  /** Hole edge to bend line must be >= this × thickness + inner radius. */
  holeToBendThicknesses: number;
  /** Hole edge to blank outline must be >= this × thickness. */
  holeToEdgeThicknesses: number;
  /** Flange (outside of bend to free edge) must be >= this × thickness. */
  minFlangeThicknesses: number;
}

export const SHEET_METAL_DEFAULTS: SheetMetalSettings = {
  minBendRadiusRatio: 1,
  holeToBendThicknesses: 2.5,
  holeToEdgeThicknesses: 2,
  minFlangeThicknesses: 4,
};

export interface SheetBendFinding {
  ordinal: number;
  featureId?: string;
  angleDeg: number;
  radiusMm: number;
  minRadiusMm: number;
  ok: boolean;
  /** Flat-blank midpoint of the bend line. */
  location: Vec2;
}

export interface SheetDistanceFinding {
  /** Index into the flat pattern's holes. */
  hole: number;
  /** Bend ordinal (hole-to-bend only). */
  bend?: number;
  distanceMm: number;
  limitMm: number;
  ok: boolean;
  /** Flat-blank point of the hole edge closest to the bend / outline. */
  location: Vec2;
}

export interface SheetFlangeFinding {
  bend: number;
  /** Which side of the bend line the leg lies on: '+' is the +x side of an { atX } bend, the +y side of an { atY } bend. */
  side: '+' | '-';
  lengthMm: number;
  limitMm: number;
  ok: boolean;
  /** Flat-blank point at the middle of the leg's free end. */
  location: Vec2;
}

export interface SheetMetalPartReport {
  settings: SheetMetalSettings;
  thicknessMm: number;
  kFactor: number;
  /** Feature id the flat pattern was taken from. */
  terminalId: string;
  bends: SheetBendFinding[];
  /** Per hole: its closest bend (holes with no bend are omitted). */
  holeToBend: SheetDistanceFinding[];
  holeToEdge: SheetDistanceFinding[];
  flanges: SheetFlangeFinding[];
  /** Flat outline and holes, flat-blank coordinates. */
  flat: { outer: Vec2[]; holes: Vec2[][] };
}

/** Record kinds a sheet-metal chain may hold (see sheetMetalPredecessor). */
const SHEET_CHAIN_KINDS = new Set(['sheetMetal', 'sheetMetalBend', 'hole', 'holes', 'cutout']);

/**
 * The sheetMetal root of `terminalId` when every record from it back to the
 * root is a sheet-metal operation (bend, hole, holes, cutout); undefined for
 * anything else (a box, a boolean of a sheet with another solid, ...).
 */
export function sheetMetalRootOf(records: readonly FeatureRecord[], terminalId: string): FeatureRecord | undefined {
  const byId = new Map(records.map(r => [r.id, r]));
  let cur = byId.get(terminalId);
  while (cur !== undefined) {
    if (!SHEET_CHAIN_KINDS.has(cur.kind)) return undefined;
    if (cur.kind === 'sheetMetal') return cur;
    const ref = cur.inputs.base ?? cur.inputs.target;
    cur = ref !== undefined && ref.kind === 'feature' ? byId.get(ref.id) : undefined;
  }
  return undefined;
}

/** Bend feature ids of the chain ending at `terminalId`, root first. */
function bendIdsOf(records: readonly FeatureRecord[], terminalId: string): string[] {
  const byId = new Map(records.map(r => [r.id, r]));
  const ids: string[] = [];
  let cur = byId.get(terminalId);
  while (cur !== undefined && cur.kind !== 'sheetMetal') {
    if (cur.kind === 'sheetMetalBend') ids.push(cur.id);
    const ref = cur.inputs.base ?? cur.inputs.target;
    cur = ref !== undefined && ref.kind === 'feature' ? byId.get(ref.id) : undefined;
  }
  return ids.reverse();
}

function evaluated(rec: FeatureRecord, name: string): number {
  const p = rec.params[name] as { evaluated?: unknown } | undefined;
  return typeof p?.evaluated === 'number' ? p.evaluated : NaN;
}

const sub2 = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const dot2 = (a: Vec2, b: Vec2): number => a[0] * b[0] + a[1] * b[1];

/** A bend line as an infinite flat line: origin, unit direction, unit normal. */
interface FlatLine { o: Vec2; u: Vec2; v: Vec2; mid: Vec2 }

function flatLineOf(start: Vec2, end: Vec2): FlatLine {
  const d = sub2(end, start);
  const l = Math.hypot(d[0], d[1]) || 1;
  const u: Vec2 = [d[0] / l, d[1] / l];
  // Normal toward +x / +y, so side '+' is the +x side of an { atX } bend
  // and the +y side of an { atY } bend.
  const n: Vec2 = [-u[1], u[0]];
  const v: Vec2 = n[0] + n[1] < 0 ? [-n[0], -n[1]] : n;
  return { o: start, u, v, mid: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2] };
}

/** Signed offset of p from the line, along its normal. */
const offsetOf = (line: FlatLine, p: Vec2): number => dot2(sub2(p, line.o), line.v);

function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const d = sub2(b, a);
  const l2 = dot2(d, d);
  const t = l2 > 0 ? Math.max(0, Math.min(1, dot2(sub2(p, a), d) / l2)) : 0;
  return [a[0] + t * d[0], a[1] + t * d[1]];
}

/** Closest pair between two closed polylines: [distance, point on `a`]. */
export function polylineGap(a: readonly Vec2[], b: readonly Vec2[]): { distanceMm: number; location: Vec2 } {
  let best = { distanceMm: Infinity, location: a[0] };
  const consider = (onA: Vec2, onB: Vec2): void => {
    const d = Math.hypot(onA[0] - onB[0], onA[1] - onB[1]);
    if (d < best.distanceMm) best = { distanceMm: d, location: onA };
  };
  for (const p of a) for (let j = 0; j < b.length; j++) consider(p, closestOnSegment(p, b[j], b[(j + 1) % b.length]));
  for (const q of b) for (let i = 0; i < a.length; i++) consider(closestOnSegment(q, a[i], a[(i + 1) % a.length]), q);
  return best;
}

interface BendGeom { line: FlatLine; halfZone: number; radius: number; angleDeg: number; ordinal: number }

function bendGeoms(region: Region, thickness: number, kFactor: number): BendGeom[] {
  return region.bendLines.map(b => ({
    line: flatLineOf(b.start, b.end),
    halfZone: computeBendAllowance({ angleDeg: b.angle, radius: b.radius, kFactor, thickness }) / 2,
    radius: b.radius,
    angleDeg: b.angle,
    ordinal: b.ordinal,
  }));
}

function bendFindings(bends: BendGeom[], ids: string[], t: number, s: SheetMetalSettings): SheetBendFinding[] {
  const minR = s.minBendRadiusRatio * t;
  return bends.map(b => ({
    ordinal: b.ordinal,
    ...(ids[b.ordinal] !== undefined ? { featureId: ids[b.ordinal] } : {}),
    angleDeg: b.angleDeg,
    radiusMm: b.radius,
    minRadiusMm: minR,
    ok: b.radius >= minR - 1e-9,
    location: b.line.mid,
  }));
}

function holeToBendFindings(holes: Vec2[][], bends: BendGeom[], t: number, s: SheetMetalSettings): SheetDistanceFinding[] {
  const out: SheetDistanceFinding[] = [];
  holes.forEach((hole, hi) => {
    let worst: SheetDistanceFinding | undefined;
    for (const b of bends) {
      const limit = s.holeToBendThicknesses * t + b.radius;
      const offs = hole.map(p => offsetOf(b.line, p));
      const straddles = Math.min(...offs) <= 0 && Math.max(...offs) >= 0;
      const k = offs.reduce((m, o, i) => (Math.abs(o) < Math.abs(offs[m]) ? i : m), 0);
      const distance = straddles ? 0 : Math.abs(offs[k]);
      const f: SheetDistanceFinding = {
        hole: hi, bend: b.ordinal, distanceMm: distance, limitMm: limit, ok: distance >= limit - 1e-9, location: hole[k],
      };
      if (worst === undefined || f.distanceMm - f.limitMm < worst.distanceMm - worst.limitMm) worst = f;
    }
    if (worst !== undefined) out.push(worst);
  });
  return out;
}

function holeToEdgeFindings(holes: Vec2[][], outer: Vec2[], t: number, s: SheetMetalSettings): SheetDistanceFinding[] {
  const limit = s.holeToEdgeThicknesses * t;
  return holes.map((hole, hi) => {
    const gap = polylineGap(hole, outer);
    return { hole: hi, distanceMm: gap.distanceMm, limitMm: limit, ok: gap.distanceMm >= limit - 1e-9, location: gap.location };
  });
}

/** Where the leg on `side` of bend `b` ends: the next parallel bend zone, or the blank edge. */
function legEnd(b: BendGeom, bends: BendGeom[], outer: Vec2[], side: 1 | -1): number {
  let end = Math.max(...outer.map(p => side * offsetOf(b.line, p)));
  for (const o of bends) {
    if (o === b || Math.abs(dot2(o.line.u, b.line.u)) < 0.999) continue;
    const w = side * offsetOf(b.line, o.line.o);
    if (w > 0) end = Math.min(end, w - o.halfZone);
  }
  return end;
}

function flangeFindings(bends: BendGeom[], outer: Vec2[], t: number, s: SheetMetalSettings): SheetFlangeFinding[] {
  const limit = s.minFlangeThicknesses * t;
  const out: SheetFlangeFinding[] = [];
  for (const b of bends) {
    for (const side of [1, -1] as const) {
      const end = legEnd(b, bends, outer, side);
      const leg = Math.max(0, end - b.halfZone);
      const length = leg + b.radius + t;
      const at = side * (end + b.halfZone) / 2;
      out.push({
        bend: b.ordinal, side: side === 1 ? '+' : '-', lengthMm: length, limitMm: limit, ok: length >= limit - 1e-9,
        location: [b.line.mid[0] + at * b.line.v[0], b.line.mid[1] + at * b.line.v[1]],
      });
    }
  }
  return out;
}

/** Pure flat-pattern analysis (exported for tests). */
export function analyzeSheetMetalFlat(
  region: Region,
  opts: { thickness: number; kFactor: number; settings: SheetMetalSettings; terminalId: string; bendIds?: string[] },
): SheetMetalPartReport {
  const { thickness: t, kFactor, settings: s } = opts;
  const bends = bendGeoms(region, t, kFactor);
  return {
    settings: s,
    thicknessMm: t,
    kFactor,
    terminalId: opts.terminalId,
    bends: bendFindings(bends, opts.bendIds ?? [], t, s),
    holeToBend: holeToBendFindings(region.holes, bends, t, s),
    holeToEdge: holeToEdgeFindings(region.holes, region.outer, t, s),
    flanges: flangeFindings(bends, region.outer, t, s),
    flat: { outer: region.outer, holes: region.holes },
  };
}

/**
 * Sheet-metal review of the part produced by `terminalId`. Returns
 * undefined when that part is not a sheet-metal chain (the caller reports
 * it as "not a sheet-metal part").
 */
export async function checkSheetMetal(
  records: readonly FeatureRecord[],
  terminalId: string,
  settings: SheetMetalSettings,
  lowered?: ReadonlyMap<FeatureId, ShapeBackend>,
): Promise<SheetMetalPartReport | undefined> {
  const root = sheetMetalRootOf(records, terminalId);
  if (root === undefined) return undefined;
  const region = await flattenPatternWithHoles(records, terminalId, lowered);
  return analyzeSheetMetalFlat(region, {
    thickness: evaluated(root, 'thickness'),
    kFactor: evaluated(root, 'kFactor'),
    settings,
    terminalId,
    bendIds: bendIdsOf(records, terminalId),
  });
}
