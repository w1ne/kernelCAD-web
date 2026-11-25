// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/sheetMetalBead.ts
//
// Pure-TS validation and 2D flat-blank geometry helpers for formed
// sheet-metal stiffening beads (`shape.bead(opts)`). No OCCT imports.

import type { FeatureRecord } from '../shared/intent/featureRecord';
import { invalidArgs } from '../shared/intent/invalidArgs';
import type { Param } from '../shared/intent/types';
import { toParam } from '../shared/runtime/editableHelpers';
import type { Editable } from '../shared/runtime/paramRef';
import type { BeadProfile, BeadSide, Vec2 } from '../shared/intent/region';
import { findRootSheetMetalRecord } from './sheetMetal';

export type { BeadProfile, BeadSide };

export interface SheetMetalBeadOpts {
  from: [Editable<number>, Editable<number>];
  to: [Editable<number>, Editable<number>];
  width: Editable<number>;
  height: Editable<number>;
  profile?: BeadProfile;
  side?: BeadSide;
}

export interface ValidatedBeadCapture {
  params: {
    fromX: Param;
    fromY: Param;
    toX: Param;
    toY: Param;
    width: Param;
    height: Param;
  };
  profile: BeadProfile;
  side: BeadSide;
}

export interface ResolvedBeadSpec {
  from: Vec2;
  to: Vec2;
  width: number;
  height: number;
  profile: BeadProfile;
  side: BeadSide;
}

const ALLOWED_KEYS = new Set(['from', 'to', 'width', 'height', 'profile', 'side']);
const VALID_PROFILES = new Set<string>(['round', 'u', 'v']);
const VALID_SIDES = new Set<string>(['top', 'bottom']);
const BEAD_EXAMPLE = "blank.bead({ from: [15, 25], to: [85, 25], width: 8, height: 2, profile: 'round', side: 'top' })";
const MIN_SEGMENT_LEN = 1e-6;
const BEND_CLEARANCE = 1e-3;

function requirePlainObject(opts: unknown, featureId?: string): Record<string, unknown> {
  if (typeof opts !== 'object' || opts === null || Array.isArray(opts)) {
    invalidArgs({
      api: 'shape.bead(opts)',
      path: 'opts',
      got: opts,
      requires: 'an options object { from, to, width, height, profile?, side? }',
      example: BEAD_EXAMPLE,
      featureId,
    });
  }
  const obj = opts as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_KEYS.has(key)) {
      invalidArgs({
        api: 'shape.bead(opts)',
        path: key,
        gotText: `unknown option '${key}'`,
        requires: 'only keys: from, to, width, height, profile, side',
        example: BEAD_EXAMPLE,
        featureId,
      });
    }
  }
  return obj;
}

function parseFiniteParam(value: unknown, path: string, featureId?: string): Param {
  let param: Param;
  try {
    param = toParam(value as Editable<number>, 'mm');
  } catch {
    invalidArgs({
      api: 'shape.bead(opts)',
      path,
      got: value,
      requires: 'a finite number or param(...)',
      example: BEAD_EXAMPLE,
      featureId,
    });
  }
  if (!Number.isFinite(param.evaluated)) {
    invalidArgs({
      api: 'shape.bead(opts)',
      path,
      got: param.evaluated,
      requires: 'a finite number',
      example: BEAD_EXAMPLE,
      featureId,
    });
  }
  return param;
}

function parsePoint(raw: unknown, path: 'from' | 'to', featureId?: string): [Param, Param] {
  if (!Array.isArray(raw) || raw.length !== 2) {
    invalidArgs({
      api: 'shape.bead(opts)',
      path,
      got: raw,
      requires: 'a 2-element [x, y] coordinate pair in flat-blank mm',
      example: BEAD_EXAMPLE,
      featureId,
    });
  }
  return [
    parseFiniteParam(raw[0], `${path}[0]`, featureId),
    parseFiniteParam(raw[1], `${path}[1]`, featureId),
  ];
}

function parsePositiveParam(raw: unknown, path: 'width' | 'height', featureId?: string): Param {
  const param = parseFiniteParam(raw, path, featureId);
  if (param.paramRef === undefined && !(param.evaluated > 0)) {
    invalidArgs({
      api: 'shape.bead(opts)',
      path,
      got: param.evaluated,
      requires: 'a positive finite number (> 0)',
      example: BEAD_EXAMPLE,
      featureId,
    });
  }
  return param;
}

function parseEnum<T extends string>(
  raw: unknown,
  allowed: ReadonlySet<string>,
  fallback: T,
  path: 'profile' | 'side',
  featureId?: string,
): T {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string' || !allowed.has(raw)) {
    invalidArgs({
      api: 'shape.bead(opts)',
      path,
      got: raw,
      requires: `one of ${[...allowed].map(v => `'${v}'`).join(' | ')}`,
      example: BEAD_EXAMPLE,
      featureId,
    });
  }
  return raw as T;
}

/** Validate `shape.bead(opts)` arguments at capture time. */
export function validateBeadOptions(opts: unknown, featureId?: string): ValidatedBeadCapture {
  const obj = requirePlainObject(opts, featureId);
  const [fromX, fromY] = parsePoint(obj.from, 'from', featureId);
  const [toX, toY] = parsePoint(obj.to, 'to', featureId);
  const allStaticCoords =
    fromX.paramRef === undefined && fromY.paramRef === undefined &&
    toX.paramRef === undefined && toY.paramRef === undefined;
  const segLen = Math.hypot(toX.evaluated - fromX.evaluated, toY.evaluated - fromY.evaluated);
  if (allStaticCoords && !(segLen > MIN_SEGMENT_LEN)) {
    invalidArgs({
      api: 'shape.bead(opts)',
      path: 'to',
      gotText: `zero-length segment from [${fromX.evaluated}, ${fromY.evaluated}] to [${toX.evaluated}, ${toY.evaluated}]`,
      requires: 'distinct from and to endpoints (segment length > 0)',
      example: BEAD_EXAMPLE,
      featureId,
    });
  }
  const width = parsePositiveParam(obj.width, 'width', featureId);
  const height = parsePositiveParam(obj.height, 'height', featureId);
  const profile = parseEnum<BeadProfile>(obj.profile, VALID_PROFILES, 'round', 'profile', featureId);
  const side = parseEnum<BeadSide>(obj.side, VALID_SIDES, 'top', 'side', featureId);
  return {
    params: { fromX, fromY, toX, toY, width, height },
    profile,
    side,
  };
}

/** Require that `rec` traces its lineage back to a `sheetMetal(...)` root. */
export function assertBeadSheetMetalRoot(
  rec: FeatureRecord,
  allRecords: readonly FeatureRecord[],
): FeatureRecord {
  const root = findRootSheetMetalRecord(rec, allRecords);
  if (!root) {
    invalidArgs({
      api: 'shape.bead(opts)',
      path: 'base',
      gotText: `shape '${rec.id}' without sheetMetal(...) lineage`,
      requires: 'a sheet-metal blank created with sheetMetal(profile, { thickness, kFactor })',
      example: BEAD_EXAMPLE,
      featureId: rec.id,
    });
  }
  return root;
}

/** Extract resolved numeric bead parameters from a `sheetMetalBead` FeatureRecord. */
export function readBeadSpec(rec: FeatureRecord): ResolvedBeadSpec {
  const md = rec.metadata as { profile?: BeadProfile; side?: BeadSide } | undefined;
  return {
    from: [rec.params.fromX.evaluated, rec.params.fromY.evaluated],
    to: [rec.params.toX.evaluated, rec.params.toY.evaluated],
    width: rec.params.width.evaluated,
    height: rec.params.height.evaluated,
    profile: md?.profile ?? 'round',
    side: md?.side ?? 'top',
  };
}

/**
 * Opposite-face recess channel width, or `null` when the bead is too narrow
 * (`width <= 2 * thickness`) to preserve sheet wall thickness on both sides.
 */
export function beadInnerWidth(width: number, thickness: number): number | null {
  if (!(width > 2 * thickness)) return null;
  return Math.max(width - 2 * thickness, 0.25 * width);
}

/** Point-in-polygon (ray casting) in 2D. */
function pointInPolygon(p: Vec2, poly: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const crosses = (yi > p[1]) !== (yj > p[1])
      && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Point-to-segment distance in 2D. */
function pointToSegDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function orient2d(a: Vec2, b: Vec2, c: Vec2): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o1 = orient2d(a, b, c);
  const o2 = orient2d(a, b, d);
  const o3 = orient2d(c, d, a);
  const o4 = orient2d(c, d, b);
  return ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0))
    && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0));
}

/** Exact minimum distance between two 2D segments `[a, b]` and `[c, d]`. */
function segToSegDist(a: Vec2, b: Vec2, c: Vec2, d: Vec2): number {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegDist(a, c, d),
    pointToSegDist(b, c, d),
    pointToSegDist(c, a, b),
    pointToSegDist(d, a, b),
  );
}

/**
 * Verify that the bead capsule (`[from, to]` expanded by `width / 2`) lies
 * inside the flat sheet blank. Returns an error message on violation or `null`.
 */
export function checkBeadInsideBlank(
  bead: ResolvedBeadSpec,
  blankBox: { min: Vec2; max: Vec2 },
  blankPoly?: readonly Vec2[],
): string | null {
  const r = bead.width / 2;
  const eps = 1e-4;
  const minX = Math.min(bead.from[0], bead.to[0]) - r;
  const maxX = Math.max(bead.from[0], bead.to[0]) + r;
  const minY = Math.min(bead.from[1], bead.to[1]) - r;
  const maxY = Math.max(bead.from[1], bead.to[1]) + r;

  if (
    minX < blankBox.min[0] - eps || maxX > blankBox.max[0] + eps ||
    minY < blankBox.min[1] - eps || maxY > blankBox.max[1] + eps
  ) {
    return (
      `bead footprint X=[${minX.toFixed(2)}, ${maxX.toFixed(2)}], Y=[${minY.toFixed(2)}, ${maxY.toFixed(2)}] ` +
      `extends outside sheet blank X=[${blankBox.min[0].toFixed(2)}, ${blankBox.max[0].toFixed(2)}], ` +
      `Y=[${blankBox.min[1].toFixed(2)}, ${blankBox.max[1].toFixed(2)}].`
    );
  }
  if (!blankPoly || blankPoly.length < 3) return null;

  if (!pointInPolygon(bead.from, blankPoly) || !pointInPolygon(bead.to, blankPoly)) {
    return 'bead endpoints lie outside the sheet blank outline.';
  }
  for (let i = 0; i < blankPoly.length; i++) {
    const e0 = blankPoly[i];
    const e1 = blankPoly[(i + 1) % blankPoly.length];
    const d = segToSegDist(bead.from, bead.to, e0, e1);
    if (d < r - eps) {
      return (
        `bead footprint (half-width ${r.toFixed(2)} mm) comes within ${d.toFixed(2)} mm ` +
        `of blank boundary edge (${e0[0]}, ${e0[1]})->(${e1[0]}, ${e1[1]}).`
      );
    }
  }
  return null;
}

/**
 * Verify that the bead capsule does not overlap a sheet-metal bend zone
 * (`at ± bendAllowance / 2`). Returns an error message on collision or `null`.
 */
export function checkBeadVsBendZone(
  bead: ResolvedBeadSpec,
  bend: { orient: 'x' | 'y'; at: number; bendAllowance: number },
): string | null {
  const axisIdx = bend.orient === 'x' ? 0 : 1;
  const r = bead.width / 2;
  const beadMin = Math.min(bead.from[axisIdx], bead.to[axisIdx]) - r;
  const beadMax = Math.max(bead.from[axisIdx], bead.to[axisIdx]) + r;
  const zoneMin = bend.at - bend.bendAllowance / 2;
  const zoneMax = bend.at + bend.bendAllowance / 2;

  if (beadMax >= zoneMin - BEND_CLEARANCE && beadMin <= zoneMax + BEND_CLEARANCE) {
    const axisLabel = bend.orient.toUpperCase();
    return (
      `bead ${axisLabel}-span [${beadMin.toFixed(2)}, ${beadMax.toFixed(2)}] collides with ` +
      `bend zone ${axisLabel}=[${zoneMin.toFixed(2)}, ${zoneMax.toFixed(2)}] (at ${axisLabel}=${bend.at}, BA=${bend.bendAllowance.toFixed(2)} mm).`
    );
  }
  return null;
}
