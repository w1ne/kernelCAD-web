// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/queryNormalize.ts
//
// One vocabulary for EdgeQuery / FaceQuery: strict validation + alias
// normalisation, run before any kernel filtering.
//
// Why this exists: the predicate bags used to be applied key-by-key with no
// validation, so a misspelt value silently degraded the selection —
// `parallel: 'Z'` matched nothing (Math.hypot over a string is NaN),
// `ofSurfaceType: 'CYLINDER'` matched nothing (OCCT reports 'CYLINDRE'), and
// `within: { min, max }` matched EVERYTHING (none of the xMin…zMax keys were
// set, so every bound check passed). Each of those then flowed into a fillet
// as if it were the agent's intent.
//
// Contract: `normalizeEdgeQuery` / `normalizeFaceQuery` either return a
// fully-resolved query (directions as unit-agnostic Vec3, regions in per-axis
// form, geometry types in canonical spelling) or throw a KernelError coded
// `feature.invalid-args` whose message names the offending key and whose hint
// lists the valid keys / values. Pure TypeScript — no OCCT — so it lives in
// `shared/` and every layer (kernel resolvers, capture, MCP) can call it.

import { invalidArgs } from './invalidArgs';
import type { Vec3 } from './types';
import type { BoundingRegion, EdgeQuery, FaceQuery } from './queryTypes';

// ---------------------------------------------------------------------------
// Geometry-type vocabulary.
// ---------------------------------------------------------------------------

/** Canonical surface types (OCCT/replicad spelling, except the public
 *  English 'CYLINDER' in place of OCCT's 'CYLINDRE'). */
export const CANONICAL_SURFACE_TYPES = [
  'PLANE', 'CYLINDER', 'CONE', 'SPHERE', 'TORUS',
  'BSPLINE_SURFACE', 'BEZIER_SURFACE', 'REVOLUTION_SURFACE',
  'EXTRUSION_SURFACE', 'OFFSET_SURFACE', 'OTHER_SURFACE',
] as const;

/** Canonical curve types (replicad spelling). */
export const CANONICAL_CURVE_TYPES = [
  'LINE', 'CIRCLE', 'ELLIPSE', 'HYPERBOLA', 'PARABOLA',
  'BSPLINE_CURVE', 'BEZIER_CURVE', 'OFFSET_CURVE', 'OTHER_CURVE',
] as const;

const SURFACE_ALIASES: Readonly<Record<string, string>> = {
  CYLINDRE: 'CYLINDER',
  CYLINDRICAL: 'CYLINDER',
  PLANAR: 'PLANE',
  CONICAL: 'CONE',
  SPHERICAL: 'SPHERE',
  TOROIDAL: 'TORUS',
  BSPLINE: 'BSPLINE_SURFACE',
  NURBS: 'BSPLINE_SURFACE',
  BEZIER: 'BEZIER_SURFACE',
  REVOLUTION: 'REVOLUTION_SURFACE',
  EXTRUSION: 'EXTRUSION_SURFACE',
  OFFSET: 'OFFSET_SURFACE',
  OTHER: 'OTHER_SURFACE',
};

const CURVE_ALIASES: Readonly<Record<string, string>> = {
  BSPLINE: 'BSPLINE_CURVE',
  NURBS: 'BSPLINE_CURVE',
  BEZIER: 'BEZIER_CURVE',
  OFFSET: 'OFFSET_CURVE',
  OTHER: 'OTHER_CURVE',
  ARC: 'CIRCLE',
};

const SURFACE_SET = new Set<string>(CANONICAL_SURFACE_TYPES);
const CURVE_SET = new Set<string>(CANONICAL_CURVE_TYPES);

/** Canonical spelling of a surface-type token (any case, OCCT or public
 *  name), or undefined when the token is not a surface type. */
export function canonicalSurfaceType(name: string | undefined | null): string | undefined {
  if (typeof name !== 'string') return undefined;
  const up = name.trim().toUpperCase();
  const mapped = SURFACE_ALIASES[up] ?? up;
  return SURFACE_SET.has(mapped) ? mapped : undefined;
}

/** Canonical spelling of a curve-type token, or undefined. */
export function canonicalCurveType(name: string | undefined | null): string | undefined {
  if (typeof name !== 'string') return undefined;
  const up = name.trim().toUpperCase();
  const mapped = CURVE_ALIASES[up] ?? up;
  return CURVE_SET.has(mapped) ? mapped : undefined;
}

/** Canonical spelling of either a surface or a curve type token. Used by
 *  type-agnostic consumers (ShapeList.filterBy). */
export function canonicalGeometryType(name: string | undefined | null): string | undefined {
  return canonicalSurfaceType(name) ?? canonicalCurveType(name);
}

/** Public (agent-facing) name for a kernel-reported surface type: OCCT's
 *  'CYLINDRE' becomes 'CYLINDER'; every other replicad name passes through. */
export function publicSurfaceType(occtName: string | undefined | null): string {
  if (typeof occtName !== 'string' || occtName.length === 0) return 'UNKNOWN';
  return canonicalSurfaceType(occtName) ?? occtName;
}

/** True when two geometry-type tokens name the same type (alias-aware). */
export function sameGeometryType(a: string | undefined | null, b: string | undefined | null): boolean {
  const ca = canonicalGeometryType(a);
  const cb = canonicalGeometryType(b);
  return ca !== undefined && ca === cb;
}

// ---------------------------------------------------------------------------
// Directions.
// ---------------------------------------------------------------------------

const AXIS_VECTORS: Readonly<Record<string, Vec3>> = {
  X: [1, 0, 0], '+X': [1, 0, 0], '-X': [-1, 0, 0],
  Y: [0, 1, 0], '+Y': [0, 1, 0], '-Y': [0, -1, 0],
  Z: [0, 0, 1], '+Z': [0, 0, 1], '-Z': [0, 0, -1],
};

const PLANE_NORMALS: Readonly<Record<string, Vec3>> = {
  XY: [0, 0, 1], YX: [0, 0, 1],
  YZ: [1, 0, 0], ZY: [1, 0, 0],
  XZ: [0, 1, 0], ZX: [0, 1, 0],
};

/** Resolve an axis name ('X', '-z', …) to its unit vector, or undefined. */
export function axisNameToVec(name: string): Vec3 | undefined {
  return AXIS_VECTORS[name.trim().toUpperCase()];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isVec3(v: unknown): v is Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every(isFiniteNumber);
}

function show(v: unknown): string {
  if (typeof v === 'string') return `'${v}'`;
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s.length > 80 ? `${s.slice(0, 77)}...` : s;
  } catch {
    return String(v);
  }
}

// ---------------------------------------------------------------------------
// Normalised query shapes (what the kernel resolvers consume).
// ---------------------------------------------------------------------------

export interface NormalizedEdgeQuery {
  atZ?: number;
  atX?: number;
  atY?: number;
  near?: Vec3;
  within?: BoundingRegion;
  parallel?: Vec3;
  perpendicular?: Vec3;
  convex?: boolean;
  concave?: boolean;
  minAngle?: number;
  maxAngle?: number;
  /** Canonical curve type (see CANONICAL_CURVE_TYPES). */
  ofCurveType?: string;
  tolerance?: number;
  angleTolerance?: number;
}

export interface NormalizedFaceQuery {
  atZ?: number;
  atX?: number;
  atY?: number;
  /** Face-normal direction. */
  parallelTo?: Vec3;
  inPlane?: Vec3;
  /** Canonical surface type (see CANONICAL_SURFACE_TYPES). */
  ofSurfaceType?: string;
  containsPoint?: Vec3;
  near?: Vec3;
  tolerance?: number;
  byNormal?: Vec3;
  minArea?: number;
  maxArea?: number;
  boundingBoxIn?: BoundingRegion;
}

/** Every key an EdgeQuery accepts, aliases included (for hints). */
export const EDGE_QUERY_ACCEPTED_KEYS: readonly string[] = [
  'atZ', 'atX', 'atY', 'near', 'within', 'parallel', 'parallelTo',
  'perpendicular', 'perpendicularTo', 'convex', 'concave', 'minAngle',
  'maxAngle', 'ofCurveType', 'tolerance', 'angleTolerance',
];

/** Every key a FaceQuery accepts, aliases included (for hints). */
export const FACE_QUERY_ACCEPTED_KEYS: readonly string[] = [
  'atZ', 'atX', 'atY', 'parallelTo', 'parallel', 'inPlane', 'ofSurfaceType',
  'containsPoint', 'near', 'tolerance', 'byNormal', 'minArea', 'maxArea',
  'boundingBoxIn',
];

type QueryName = 'EdgeQuery' | 'FaceQuery';

/** One copy-pasteable example per key, for the invalid-args message. */
const KEY_EXAMPLES: Readonly<Record<string, string>> = {
  atZ: '{ atZ: 10 }',
  atX: '{ atX: 0 }',
  atY: '{ atY: 0 }',
  near: '{ near: [0, 0, 10] }',
  within: '{ within: { min: [-5, -5, 9], max: [5, 5, 11] } }',
  parallel: "{ parallel: 'Z' }",
  parallelTo: "{ parallelTo: 'Z' }",
  perpendicular: "{ perpendicular: 'Z' }",
  perpendicularTo: "{ perpendicularTo: 'Z' }",
  convex: '{ convex: true }',
  concave: '{ concave: true }',
  minAngle: '{ minAngle: 45 }',
  maxAngle: '{ maxAngle: 135 }',
  ofCurveType: "{ ofCurveType: 'CIRCLE' }",
  tolerance: '{ atZ: 10, tolerance: 0.5 }',
  angleTolerance: "{ parallel: 'Z', angleTolerance: 5 }",
  inPlane: "{ inPlane: 'XY' }",
  ofSurfaceType: "{ ofSurfaceType: 'CYLINDER' }",
  containsPoint: '{ containsPoint: [0, 0, 10] }',
  byNormal: "{ byNormal: '-Z' }",
  minArea: '{ minArea: 100 }',
  maxArea: '{ maxArea: 100 }',
  boundingBoxIn: '{ boundingBoxIn: { zMin: 9, zMax: 11 } }',
};

function exampleFor(key: string): string {
  return KEY_EXAMPLES[key.split('.')[0] ?? key] ?? '{ atZ: 10 }';
}

function invalid(queryName: QueryName, key: string, got: unknown, requires: string, hintTag: string): never {
  return invalidArgs({
    api: queryName,
    path: key,
    got,
    showType: typeof got !== 'object',
    requires,
    example: exampleFor(key),
    hintSlug: `invalid-args.selector.${hintTag}`,
  });
}

function requireObject(queryName: QueryName, raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    return invalidArgs({
      api: queryName,
      path: '',
      got: raw,
      showType: true,
      requires:
        "a query object — a string selector (canonical face name, label, or an @kc[...] ref) goes directly to the feature call, e.g. .fillet(1, '@kc[box_1/edge/e3]')",
      example: '{ atZ: 10 }',
      hintSlug: 'invalid-args.selector.string-not-query',
    });
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return invalidArgs({
      api: queryName,
      path: '',
      got: raw,
      showType: true,
      requires: 'a plain query object',
      example: '{ atZ: 10 }',
      hintSlug: 'invalid-args.selector.not-object',
    });
  }
  return raw as Record<string, unknown>;
}

function rejectUnknownKeys(queryName: QueryName, obj: Record<string, unknown>, accepted: readonly string[]): void {
  const allowed = new Set(accepted);
  const unknown = Object.keys(obj).filter((k) => !allowed.has(k));
  if (unknown.length === 0) return;
  invalidArgs({
    api: queryName,
    path: unknown.join(', '),
    gotText: `unknown key${unknown.length > 1 ? 's' : ''} ${unknown.join(', ')}`,
    requires: `only valid ${queryName} keys: ${accepted.join(', ')}`,
    example: '{ atZ: 10 }',
    hintSlug: 'invalid-args.selector.unknown-key',
  });
}

function num(queryName: QueryName, key: string, v: unknown, opts: { positive?: boolean; nonNegative?: boolean } = {}): number | undefined {
  if (v === undefined) return undefined;
  if (!isFiniteNumber(v) || (opts.positive && v <= 0) || (opts.nonNegative && v < 0)) {
    const req = opts.positive ? 'a finite number > 0' : opts.nonNegative ? 'a finite number >= 0' : 'a finite number';
    invalid(queryName, key, v, req, 'bad-number');
  }
  return v;
}

function bool(queryName: QueryName, key: string, v: unknown): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'boolean') invalid(queryName, key, v, 'true or false', 'bad-boolean');
  return v;
}

function point(queryName: QueryName, key: string, v: unknown): Vec3 | undefined {
  if (v === undefined) return undefined;
  if (!isVec3(v)) invalid(queryName, key, v, 'a finite [x, y, z] point', 'bad-point');
  return [v[0], v[1], v[2]];
}

function direction(queryName: QueryName, key: string, v: unknown, allowPlanes: boolean): Vec3 | undefined {
  if (v === undefined) return undefined;
  const requires = allowPlanes
    ? "an axis 'X' | 'Y' | 'Z' (optionally signed, e.g. '-Z'), a plane 'XY' | 'YZ' | 'XZ', or a non-zero [x, y, z] vector"
    : "an axis 'X' | 'Y' | 'Z' (optionally signed, e.g. '-Z') or a non-zero [x, y, z] vector";
  if (typeof v === 'string') {
    const axis = axisNameToVec(v);
    if (axis) return axis;
    if (allowPlanes) {
      const plane = PLANE_NORMALS[v.trim().toUpperCase()];
      if (plane) return plane;
    }
    invalid(queryName, key, v, requires, 'bad-direction');
  }
  if (!isVec3(v) || Math.hypot(v[0], v[1], v[2]) < 1e-12) {
    invalid(queryName, key, v, requires, 'bad-direction');
  }
  return [v[0], v[1], v[2]];
}

const REGION_KEYS = ['xMin', 'xMax', 'yMin', 'yMax', 'zMin', 'zMax'] as const;

const REGION_REQUIRES =
  '{ xMin?, xMax?, yMin?, yMax?, zMin?, zMax? } with at least one finite bound, or { min: [x, y, z], max: [x, y, z] }';

function region(queryName: QueryName, key: string, v: unknown): BoundingRegion | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    invalid(queryName, key, v, REGION_REQUIRES, 'bad-region');
  }
  const obj = v as Record<string, unknown>;
  return 'min' in obj || 'max' in obj
    ? cornerRegion(queryName, key, obj)
    : axisRegion(queryName, key, obj);
}

/** `{ min: Vec3, max: Vec3 }` → per-axis bounds. */
function cornerRegion(queryName: QueryName, key: string, obj: Record<string, unknown>): BoundingRegion {
  const extra = Object.keys(obj).filter((k) => k !== 'min' && k !== 'max');
  if (extra.length > 0 || !isVec3(obj.min) || !isVec3(obj.max)) {
    invalid(queryName, key, obj, REGION_REQUIRES, 'bad-region');
  }
  const min = obj.min as Vec3;
  const max = obj.max as Vec3;
  if (min.some((m, i) => m > max[i]!)) {
    invalid(queryName, key, obj, `${REGION_REQUIRES} — min must be <= max on every axis`, 'bad-region');
  }
  return { xMin: min[0], yMin: min[1], zMin: min[2], xMax: max[0], yMax: max[1], zMax: max[2] };
}

/** `{ xMin?, …, zMax? }` — at least one finite bound, no other keys. */
function axisRegion(queryName: QueryName, key: string, obj: Record<string, unknown>): BoundingRegion {
  const allowed = new Set<string>(REGION_KEYS);
  const keys = Object.keys(obj);
  if (keys.length === 0 || keys.some((k) => !allowed.has(k))) {
    invalid(queryName, key, obj, REGION_REQUIRES, 'bad-region');
  }
  const out: BoundingRegion = {};
  for (const k of REGION_KEYS) {
    const b = obj[k];
    if (b === undefined) continue;
    if (!isFiniteNumber(b)) invalid(queryName, `${key}.${k}`, b, 'a finite number', 'bad-region');
    out[k] = b;
  }
  return out;
}

/** Resolve `canonical` / `alias` spellings of one logical key. Both given
 *  with different values is an error rather than a silent precedence rule. */
function aliased(queryName: QueryName, obj: Record<string, unknown>, canonical: string, alias: string): unknown {
  const a = obj[canonical];
  const b = obj[alias];
  if (a !== undefined && b !== undefined && JSON.stringify(a) !== JSON.stringify(b)) {
    invalidArgs({
      api: queryName,
      path: `${canonical} / ${alias}`,
      gotText: `${show(a)} and ${show(b)}`,
      requires: `one value — '${alias}' is an alias of '${canonical}'; keep one of them`,
      example: exampleFor(canonical),
      hintSlug: 'invalid-args.selector.alias-conflict',
    });
  }
  return a !== undefined ? a : b;
}

/** A param() inside a query is captured as a Param record (pre-resolved by
 *  the recompute engine): read its current `evaluated` number. */
function isParamRecord(v: unknown): v is { evaluated: number } {
  return typeof v === 'object' && v !== null
    && typeof (v as { expression?: unknown }).expression === 'string'
    && typeof (v as { unit?: unknown }).unit === 'string'
    && typeof (v as { evaluated?: unknown }).evaluated === 'number';
}

function unwrapParamValue(v: unknown): unknown {
  if (isParamRecord(v)) return v.evaluated;
  if (Array.isArray(v)) return v.map(unwrapParamValue);
  if (typeof v === 'object' && v !== null && (Object.getPrototypeOf(Object.getPrototypeOf(v) ?? {}) === null)) {
    return unwrapParams(v as Record<string, unknown>);
  }
  return v;
}

function unwrapParams(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) out[k] = unwrapParamValue(obj[k]);
  return out;
}

function assign<T extends object, K extends keyof T>(out: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) out[key] = value;
}

/**
 * Validate + normalise an EdgeQuery. Throws KernelError('feature.invalid-args')
 * on any unknown key or ill-typed value.
 */
export function normalizeEdgeQuery(raw: EdgeQuery | unknown): NormalizedEdgeQuery {
  const Q: QueryName = 'EdgeQuery';
  const obj = unwrapParams(requireObject(Q, raw));
  rejectUnknownKeys(Q, obj, EDGE_QUERY_ACCEPTED_KEYS);
  const out: NormalizedEdgeQuery = {};
  assign(out, 'atZ', num(Q, 'atZ', obj.atZ));
  assign(out, 'atX', num(Q, 'atX', obj.atX));
  assign(out, 'atY', num(Q, 'atY', obj.atY));
  assign(out, 'near', point(Q, 'near', obj.near));
  assign(out, 'within', region(Q, 'within', obj.within));
  assign(out, 'parallel', direction(Q, 'parallel', aliased(Q, obj, 'parallel', 'parallelTo'), false));
  assign(out, 'perpendicular', direction(Q, 'perpendicular', aliased(Q, obj, 'perpendicular', 'perpendicularTo'), false));
  assign(out, 'convex', bool(Q, 'convex', obj.convex));
  assign(out, 'concave', bool(Q, 'concave', obj.concave));
  assign(out, 'minAngle', num(Q, 'minAngle', obj.minAngle));
  assign(out, 'maxAngle', num(Q, 'maxAngle', obj.maxAngle));
  if (obj.ofCurveType !== undefined) {
    const ct = typeof obj.ofCurveType === 'string' ? canonicalCurveType(obj.ofCurveType) : undefined;
    if (!ct) {
      invalid(Q, 'ofCurveType', obj.ofCurveType,
        `one of ${CANONICAL_CURVE_TYPES.join(', ')} (aliases: BSPLINE, BEZIER, ARC)`, 'bad-geometry-type');
    }
    out.ofCurveType = ct;
  }
  assign(out, 'tolerance', num(Q, 'tolerance', obj.tolerance, { positive: true }));
  assign(out, 'angleTolerance', num(Q, 'angleTolerance', obj.angleTolerance, { positive: true }));
  return out;
}

/**
 * Validate + normalise a FaceQuery. Throws KernelError('feature.invalid-args')
 * on any unknown key or ill-typed value.
 */
export function normalizeFaceQuery(raw: FaceQuery | unknown): NormalizedFaceQuery {
  const Q: QueryName = 'FaceQuery';
  const obj = unwrapParams(requireObject(Q, raw));
  rejectUnknownKeys(Q, obj, FACE_QUERY_ACCEPTED_KEYS);
  const out: NormalizedFaceQuery = {};
  assign(out, 'atZ', num(Q, 'atZ', obj.atZ));
  assign(out, 'atX', num(Q, 'atX', obj.atX));
  assign(out, 'atY', num(Q, 'atY', obj.atY));
  assign(out, 'parallelTo', direction(Q, 'parallelTo', aliased(Q, obj, 'parallelTo', 'parallel'), true));
  if (obj.inPlane !== undefined) {
    const plane = typeof obj.inPlane === 'string' ? PLANE_NORMALS[obj.inPlane.trim().toUpperCase()] : undefined;
    if (!plane) invalid(Q, 'inPlane', obj.inPlane, "a plane name 'XY' | 'YZ' | 'XZ'", 'bad-plane');
    out.inPlane = plane;
  }
  if (obj.ofSurfaceType !== undefined) {
    const st = typeof obj.ofSurfaceType === 'string' ? canonicalSurfaceType(obj.ofSurfaceType) : undefined;
    if (!st) {
      invalid(Q, 'ofSurfaceType', obj.ofSurfaceType,
        `one of ${CANONICAL_SURFACE_TYPES.join(', ')} (aliases: CYLINDRE, BSPLINE, BEZIER, …)`, 'bad-geometry-type');
    }
    out.ofSurfaceType = st;
  }
  assign(out, 'containsPoint', point(Q, 'containsPoint', obj.containsPoint));
  assign(out, 'near', point(Q, 'near', obj.near));
  assign(out, 'tolerance', num(Q, 'tolerance', obj.tolerance, { positive: true }));
  if (obj.byNormal !== undefined) {
    // byNormal is SIGNED (it picks one side of a box), so a vector is
    // accepted too and kept with its sign.
    out.byNormal = direction(Q, 'byNormal', obj.byNormal, false);
  }
  assign(out, 'minArea', num(Q, 'minArea', obj.minArea, { nonNegative: true }));
  assign(out, 'maxArea', num(Q, 'maxArea', obj.maxArea, { nonNegative: true }));
  assign(out, 'boundingBoxIn', region(Q, 'boundingBoxIn', obj.boundingBoxIn));
  return out;
}
