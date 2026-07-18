// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/selection/shapeList.ts
//
// Selector algebra — sort / group / filter over topology query results.
//
// The flat predicate bags (`EdgeQuery` / `FaceQuery`) answer "which entities
// match these constraints?". They cannot answer "the highest three faces",
// "the largest hole", or "one group per Z level". This module supplies the
// missing half: an immutable, chainable list over ALREADY-RESOLVED query
// results.
//
// Division of labour (deliberate, keep it this way):
//   - The kernel resolves. `selectEdges(shape, query)` / `q.face(...).evaluate(scene)`
//     touch OCCT and produce descriptors.
//   - This module is PURE TypeScript over those descriptors. It never lowers a
//     Shape, never calls OCCT, and never allocates a new descriptor — every
//     operation reorders or partitions the SAME object references. That is what
//     keeps `EdgeSegment.id` and the `@kc[...]` ref on a `ResolvedEntity` intact
//     across a sort or a group: there is nothing to re-derive, so there is
//     nothing to drift.
//
// Structural, not nominal. A ShapeList works on anything carrying the usual
// geometry fields, so one implementation covers all three descriptor shapes we
// ship today (`EdgeSegment`, the `FaceSummary` from `list_faces`, and
// `ResolvedEntity` from the naming-DSL evaluator) plus anything a later slice
// adds. See `SelectableGeometry` for the fields that are read.
//
// Float discipline. CAD metrics arrive with kernel noise: two edges nominally
// at z = 5 can read 4.999999999998 and 5.000000000002. Both `sortBy` and
// `groupBy` compare on a QUANTIZED metric (6 decimal digits by default, or an
// explicit `tolerance` in mm), with the source position as the tiebreak. Sorts
// are therefore stable under noise instead of merely deterministic, and group
// keys land in one bucket instead of two adjacent ones.

import { KernelError } from '../../shared/intent/kernelError';
import type { Vec3 } from '../../shared/intent/types';

/** Digits kept when quantizing a metric. 1e-6 mm is a nanometre at the mm
 *  scale kernelCAD works in — far below any real geometric distinction, and
 *  far above OCCT's accumulated float noise. */
const DEFAULT_METRIC_DIGITS = 6;

/** Default half-angle (degrees) for "is this direction parallel to that axis".
 *  Matches the `angleTolerance` default on `EdgeQuery`. */
const DEFAULT_ANGLE_TOLERANCE_DEG = 10;

/** A principal axis name or an explicit direction vector. */
export type SelectionAxis = 'X' | 'Y' | 'Z' | Vec3;

/** What to sort or group by.
 *
 *  An axis (`'X' | 'Y' | 'Z'` or a `Vec3` direction) measures the projection of
 *  the entity's position onto that direction. The scalar names measure an
 *  intrinsic property instead. */
export type SelectionCriterion = SelectionAxis | 'area' | 'length' | 'radius';

/**
 * The fields a ShapeList reads. Every field is optional — a descriptor only
 * needs to carry the ones the criteria in play actually use, and asking for a
 * metric a descriptor cannot supply throws a named error rather than silently
 * sorting by NaN.
 *
 * Position resolves in order: `centroid`, `midpoint`, `position`,
 * `snapshot.centroid`. Direction resolves: `direction`, `normal`,
 * `snapshot.normal`. Area resolves: `area`, `snapshot.area`.
 */
export interface SelectableGeometry {
  /** Face centre (FaceSummary). */
  readonly centroid?: Vec3;
  /** Edge midpoint (EdgeSegment). */
  readonly midpoint?: Vec3;
  /** Generic position, for descriptors that use neither name. */
  readonly position?: Vec3;
  /** Edge direction (EdgeSegment). */
  readonly direction?: Vec3;
  /** Face normal (FaceSummary). */
  readonly normal?: Vec3 | null;
  readonly length?: number;
  readonly area?: number;
  /** Present on circular edges only — see `toEdgeSegment`. */
  readonly radius?: number;
  /** EdgeSegment. */
  readonly curveType?: string;
  /** FaceSummary. */
  readonly surfaceType?: string;
  /** replicad-style descriptors. */
  readonly geomType?: string;
  /** ResolvedEntity from the naming DSL. */
  readonly snapshot?: {
    readonly centroid?: Vec3;
    readonly normal?: Vec3;
    readonly area?: number;
  };
}

export interface SortOptions {
  /** Sort high-to-low instead of low-to-high. */
  descending?: boolean;
  /** Bucket width (mm, mm², or mm depending on criterion) used to quantize the
   *  sort metric so kernel noise cannot flip the order. Defaults to 1e-6. */
  tolerance?: number;
}

export interface GroupOptions {
  /** Bucket width for the group key. Defaults to 1e-6 (six decimal digits).
   *  Raise it to fold near-coincident geometry into one group — e.g.
   *  `{ tolerance: 0.01 }` groups faces within 10 µm onto the same level. */
  tolerance?: number;
  /** Group high-to-low instead of low-to-high. */
  descending?: boolean;
}

export interface FilterByPositionOptions {
  /** Keep entities exactly on the bounds. Default true. */
  inclusive?: boolean;
}

export interface FilterByAxisOptions {
  /** Half-angle (degrees) within which a direction counts as parallel to the
   *  axis. Default 10, matching `EdgeQuery.angleTolerance`. */
  angleTolerance?: number;
}

// ---------------------------------------------------------------------------
// Numeric helpers.
// ---------------------------------------------------------------------------

function roundToDigits(value: number, digits: number): number {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  // `Object.is(-0, 0)` is false and `-0` stringifies as "0", which would make a
  // group key that compares unequal to the key an agent would naturally write.
  return rounded === 0 ? 0 : rounded;
}

/** Snap `value` onto a tolerance-wide lattice, then trim residual float dust.
 *  This is the single quantizer behind both sort ordering and group keys, so a
 *  sort and a group over the same criterion always agree about which entities
 *  are "at the same place". */
export function quantizeMetric(value: number, tolerance?: number): number {
  if (!Number.isFinite(value)) {
    throw new KernelError(
      'feature.invalid-args',
      `ShapeList: cannot order or group by a non-finite metric (got ${String(value)}).`,
      undefined,
      'invalid-args.shape-list.non-finite-metric — the descriptor produced NaN or Infinity for this criterion. Check that the query results carry the field the criterion reads.',
    );
  }
  if (tolerance === undefined) return roundToDigits(value, DEFAULT_METRIC_DIGITS);
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `ShapeList: tolerance must be a positive finite number; got ${String(tolerance)}.`,
      undefined,
      'invalid-args.shape-list.bad-tolerance — pass a positive bucket width in mm, or omit tolerance for the 1e-6 default.',
    );
  }
  return roundToDigits(Math.round(value / tolerance) * tolerance, DEFAULT_METRIC_DIGITS);
}

function axisVector(axis: SelectionAxis): Vec3 {
  if (axis === 'X') return [1, 0, 0];
  if (axis === 'Y') return [0, 1, 0];
  if (axis === 'Z') return [0, 0, 1];
  if (!Array.isArray(axis) || axis.length !== 3 || !axis.every((n) => Number.isFinite(n))) {
    throw new KernelError(
      'feature.invalid-args',
      `ShapeList: axis must be 'X' | 'Y' | 'Z' or a finite [x, y, z] direction; got ${JSON.stringify(axis)}.`,
      undefined,
      "invalid-args.shape-list.bad-axis — use 'X' / 'Y' / 'Z' for principal axes, or a Vec3 for an arbitrary direction.",
    );
  }
  const len = Math.hypot(axis[0], axis[1], axis[2]);
  if (len < 1e-12) {
    throw new KernelError(
      'feature.invalid-args',
      'ShapeList: axis direction has zero length.',
      undefined,
      'invalid-args.shape-list.bad-axis — a direction axis must be non-degenerate.',
    );
  }
  return [axis[0] / len, axis[1] / len, axis[2] / len];
}

function isAxisName(v: unknown): v is 'X' | 'Y' | 'Z' {
  return v === 'X' || v === 'Y' || v === 'Z';
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// ---------------------------------------------------------------------------
// Descriptor field readers.
// ---------------------------------------------------------------------------

function missingField(item: unknown, what: string, fields: string): KernelError {
  return new KernelError(
    'feature.invalid-args',
    `ShapeList: entity carries no ${what}. Looked for ${fields}. Entity: ${JSON.stringify(item)?.slice(0, 200)}`,
    undefined,
    `invalid-args.shape-list.missing-metric — this criterion needs ${fields} on the query result. Edge descriptors carry midpoint/direction/length (and radius on circles); face descriptors carry centroid/normal/area.`,
  );
}

/** World position of the entity. */
export function positionOf(item: SelectableGeometry): Vec3 {
  const p = item.centroid ?? item.midpoint ?? item.position ?? item.snapshot?.centroid;
  if (!p) throw missingField(item, 'position', 'centroid / midpoint / position / snapshot.centroid');
  return p;
}

/** Characteristic direction: an edge's tangent, or a face's normal. */
export function directionOf(item: SelectableGeometry): Vec3 {
  const d = item.direction ?? item.normal ?? item.snapshot?.normal;
  if (!d) throw missingField(item, 'direction', 'direction / normal / snapshot.normal');
  return d;
}

/** Geometry-type token, whatever the descriptor calls it. */
export function geomTypeOf(item: SelectableGeometry): string | undefined {
  return item.curveType ?? item.surfaceType ?? item.geomType;
}

/** Scalar value of `criterion` for one entity. */
export function metricOf(item: SelectableGeometry, criterion: SelectionCriterion): number {
  if (criterion === 'area') {
    const a = item.area ?? item.snapshot?.area;
    if (a === undefined) throw missingField(item, 'area', 'area / snapshot.area');
    return a;
  }
  if (criterion === 'length') {
    if (item.length === undefined) throw missingField(item, 'length', 'length');
    return item.length;
  }
  if (criterion === 'radius') {
    if (item.radius === undefined) {
      throw missingField(item, 'radius', 'radius (populated on CIRCLE edges only)');
    }
    return item.radius;
  }
  return dot(positionOf(item), axisVector(criterion));
}

// ---------------------------------------------------------------------------
// ShapeList.
// ---------------------------------------------------------------------------

/**
 * An immutable, chainable list of topology query results.
 *
 * `ShapeList` extends `Array`, so it IS the array a caller already expects —
 * `.length`, indexing, spread, `for..of`, and every built-in array method keep
 * working, and a `ShapeList<EdgeSegment>` still satisfies `EdgeSegment[]`
 * wherever `fillet` / `chamfer` accept one. The selector algebra is additive.
 *
 * Every algebra method returns a NEW list; nothing mutates in place and no
 * descriptor is copied, so the ordering changes while entity identity —
 * `EdgeSegment.id`, the `@kc[...]` ref and OCCT handle on a `ResolvedEntity` —
 * is carried through untouched.
 *
 * ```ts
 * const edges = await selectEdges(body, { convex: true });
 * const topRim = edges.filterBy('CIRCLE').sortBy('Z').last;
 * const levels = edges.groupBy('Z', { tolerance: 0.01 });
 * const biggest = levels.at(levels.length - 1)?.sortBy('radius').last;
 * ```
 */
export class ShapeList<T> extends Array<T> {
  /**
   * Prefer the `select(items)` factory. The constructor also
   * accepts a bare length because the built-in array methods this class
   * inherits (`map`, `filter`, `slice`, …) allocate the result via
   * `new ShapeList(length)`; honoring that keeps those methods returning a
   * ShapeList instead of blowing up or degrading to a plain Array.
   */
  constructor(items?: readonly T[] | number) {
    super();
    if (typeof items === 'number') {
      this.length = items;
      return;
    }
    if (items) for (const item of items) this.push(item);
  }

  // -- terminal accessors ---------------------------------------------------

  /** First entity, or `undefined` when the list is empty. */
  get first(): T | undefined {
    return this[0];
  }

  /** Last entity, or `undefined` when the list is empty. */
  get last(): T | undefined {
    return this[this.length - 1];
  }

  /** First `n` entities (clamped to the list length). `n` must be >= 0. */
  take(n: number): ShapeList<T> {
    if (!Number.isInteger(n) || n < 0) {
      throw new KernelError(
        'feature.invalid-args',
        `ShapeList.take: n must be a non-negative integer; got ${String(n)}.`,
        undefined,
        'invalid-args.shape-list.bad-take — pass a count >= 0.',
      );
    }
    return new ShapeList<T>(this.slice(0, n));
  }

  // -- algebra --------------------------------------------------------------

  /**
   * Order by `criterion`, ascending by default.
   *
   * Comparison runs on the metric quantized to `opts.tolerance` (default
   * 1e-6), with the pre-sort position as the tiebreak. Entities whose metrics
   * differ only by kernel noise therefore keep their incoming relative order
   * instead of swapping between runs.
   */
  sortBy(criterion: SelectionCriterion, opts: SortOptions = {}): ShapeList<T> {
    const keyed = this.map((item, index) => ({
      item,
      index,
      key: quantizeMetric(metricOf(item as unknown as SelectableGeometry, criterion), opts.tolerance),
    }));
    const dir = opts.descending ? -1 : 1;
    keyed.sort((a, b) => (a.key === b.key ? a.index - b.index : (a.key < b.key ? -1 : 1) * dir));
    return new ShapeList<T>(keyed.map((k) => k.item));
  }

  /**
   * Order by distance to `point`, nearest first.
   *
   * Same quantization + stable-tiebreak contract as `sortBy`.
   */
  sortByDistance(point: Vec3, opts: SortOptions = {}): ShapeList<T> {
    if (!Array.isArray(point) || point.length !== 3 || !point.every((n) => Number.isFinite(n))) {
      throw new KernelError(
        'feature.invalid-args',
        `ShapeList.sortByDistance: point must be a finite [x, y, z]; got ${JSON.stringify(point)}.`,
        undefined,
        'invalid-args.shape-list.bad-point — pass a Vec3 in the current world frame.',
      );
    }
    const keyed = this.map((item, index) => {
      const p = positionOf(item as unknown as SelectableGeometry);
      return {
        item,
        index,
        key: quantizeMetric(Math.hypot(p[0] - point[0], p[1] - point[1], p[2] - point[2]), opts.tolerance),
      };
    });
    const dir = opts.descending ? -1 : 1;
    keyed.sort((a, b) => (a.key === b.key ? a.index - b.index : (a.key < b.key ? -1 : 1) * dir));
    return new ShapeList<T>(keyed.map((k) => k.item));
  }

  /**
   * Partition into groups sharing a quantized `criterion` value.
   *
   * Groups come back ordered by key (ascending unless `opts.descending`), and
   * entities keep their incoming order within a group. Look a group up by
   * ordinal with `.at(i)` or by value with `.byKey(v)` — `byKey` quantizes the
   * request the same way, so `byKey(5)` finds the bucket built from
   * 4.999999999998.
   */
  groupBy(criterion: SelectionCriterion, opts: GroupOptions = {}): ShapeGroups<T> {
    const buckets = new Map<number, T[]>();
    for (const item of this) {
      const key = quantizeMetric(metricOf(item as unknown as SelectableGeometry, criterion), opts.tolerance);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(item);
      else buckets.set(key, [item]);
    }
    const dir = opts.descending ? -1 : 1;
    const groups = [...buckets.entries()]
      .sort((a, b) => (a[0] - b[0]) * dir)
      .map((entry) => ({ key: entry[0], items: new ShapeList<T>(entry[1]) }));
    return new ShapeGroups<T>(groups, opts.tolerance);
  }

  /**
   * Keep entities matching `spec`.
   *
   * Three forms, picked by the argument's shape:
   *  - a predicate `(item) => boolean` — arbitrary user logic;
   *  - `'X' | 'Y' | 'Z'` or a `Vec3` — keep entities whose characteristic
   *    direction is parallel to that axis (an edge's tangent, a face's
   *    normal), within `opts.angleTolerance` degrees;
   *  - any other string — keep entities whose geometry type matches, e.g.
   *    `'CIRCLE'` / `'LINE'` for edges, `'PLANE'` / `'CYLINDRE'` for faces
   *    (case-insensitive).
   *
   * This composes with, rather than replaces, `EdgeQuery` / `FaceQuery`: run
   * the declarative query against the shape first (the kernel does that
   * filtering inside OCCT), then refine the resolved list here.
   */
  filterBy(
    spec: ((item: T) => boolean) | SelectionAxis | string,
    opts: FilterByAxisOptions = {},
  ): ShapeList<T> {
    if (typeof spec === 'function') {
      return new ShapeList<T>(this.filter((item) => spec(item)));
    }
    if (isAxisName(spec) || Array.isArray(spec)) {
      const axis = axisVector(spec as SelectionAxis);
      const tolDeg = opts.angleTolerance ?? DEFAULT_ANGLE_TOLERANCE_DEG;
      const minCos = Math.cos((tolDeg * Math.PI) / 180);
      return new ShapeList<T>(
        this.filter((item) => {
          const d = directionOf(item as unknown as SelectableGeometry);
          const len = Math.hypot(d[0], d[1], d[2]);
          if (len < 1e-12) return false;
          return Math.abs(dot(d, axis)) / len >= minCos;
        }),
      );
    }
    if (typeof spec === 'string') {
      const wanted = spec.toUpperCase();
      return new ShapeList<T>(
        this.filter((item) => geomTypeOf(item as unknown as SelectableGeometry)?.toUpperCase() === wanted),
      );
    }
    throw new KernelError(
      'feature.invalid-args',
      `ShapeList.filterBy: expected a predicate, an axis, or a geometry-type string; got ${JSON.stringify(spec)}.`,
      undefined,
      "invalid-args.shape-list.bad-filter — pass (item) => boolean, 'X' | 'Y' | 'Z' | Vec3, or a type token such as 'CIRCLE'.",
    );
  }

  /**
   * Keep entities whose position projected onto `axis` falls in `[min, max]`.
   *
   * Bounds are inclusive by default; pass `{ inclusive: false }` for a strict
   * interval. `min` and `max` may be supplied in either order.
   */
  filterByPosition(
    axis: SelectionAxis,
    min: number,
    max: number,
    opts: FilterByPositionOptions = {},
  ): ShapeList<T> {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new KernelError(
        'feature.invalid-args',
        `ShapeList.filterByPosition: min and max must be finite; got ${String(min)}, ${String(max)}.`,
        undefined,
        'invalid-args.shape-list.bad-bounds — pass finite numeric bounds in mm.',
      );
    }
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const dirVec = axisVector(axis);
    const inclusive = opts.inclusive ?? true;
    return new ShapeList<T>(
      this.filter((item) => {
        const v = dot(positionOf(item as unknown as SelectableGeometry), dirVec);
        return inclusive ? v >= lo && v <= hi : v > lo && v < hi;
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// ShapeGroups.
// ---------------------------------------------------------------------------

/** One group produced by `ShapeList.groupBy`. */
export interface ShapeGroup<T> {
  /** The quantized criterion value shared by every entity in the group. */
  readonly key: number;
  readonly items: ShapeList<T>;
}

/**
 * The result of `ShapeList.groupBy` — key-ordered groups, reachable by ordinal
 * (`at`) or by value (`byKey`). Iterable, so `for (const g of groups)` yields
 * `{ key, items }` records.
 */
export class ShapeGroups<T> implements Iterable<ShapeGroup<T>> {
  readonly groups: ReadonlyArray<ShapeGroup<T>>;
  private readonly tolerance: number | undefined;
  private readonly index: Map<number, ShapeList<T>>;

  constructor(groups: ReadonlyArray<ShapeGroup<T>>, tolerance?: number) {
    this.groups = groups;
    this.tolerance = tolerance;
    this.index = new Map(groups.map((g) => [g.key, g.items]));
  }

  /** Number of groups. */
  get length(): number {
    return this.groups.length;
  }

  /** Group keys in group order. */
  get keys(): readonly number[] {
    return this.groups.map((g) => g.key);
  }

  /** Group at ordinal `i` (negative indexes count from the end), or
   *  `undefined` when out of range. */
  at(i: number): ShapeList<T> | undefined {
    const n = i < 0 ? this.groups.length + i : i;
    return this.groups[n]?.items;
  }

  /** Group whose key equals `key` after the same quantization `groupBy` used,
   *  or `undefined` when no such group exists. Ask for the nominal value
   *  (`byKey(5)`); the noise is handled for you. */
  byKey(key: number): ShapeList<T> | undefined {
    return this.index.get(quantizeMetric(key, this.tolerance));
  }

  /** All entities, flattened back into one list in group order. */
  flat(): ShapeList<T> {
    return new ShapeList<T>(this.groups.flatMap((g) => [...g.items]));
  }

  [Symbol.iterator](): Iterator<ShapeGroup<T>> {
    return this.groups[Symbol.iterator]();
  }
}

/**
 * Wrap any array of topology query results in a `ShapeList` so the selector
 * algebra applies. `selectEdges` already returns one; use `select` for face
 * summaries, for `Query.evaluate(scene)` results, or for a list an agent has
 * assembled by hand.
 */
export function select<T>(items: Iterable<T>): ShapeList<T> {
  if (items === null || items === undefined || typeof (items as Iterable<T>)[Symbol.iterator] !== 'function') {
    throw new KernelError(
      'feature.invalid-args',
      `select: expected an iterable of query results; got ${JSON.stringify(items)}.`,
      undefined,
      'invalid-args.shape-list.not-iterable — pass the array returned by selectEdges / list_faces / Query.evaluate.',
    );
  }
  return new ShapeList<T>([...items]);
}
