// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Authoring helpers for `require()`: small builders that produce a plain,
// serializable requirement predicate. They never measure anything themselves;
// the ledger evaluator resolves the named selections after the model lowers.
//
// `clearance(hole, boss).gte(1)` reads as the spec does, while staying plain
// TypeScript (operators cannot be overloaded). Every builder is immutable.

import { Shape } from '../capture/proxy';
import type { FaceQuery, EdgeQuery } from '../../shared/intent/queryTypes';
import type {
  RequirementBands,
  RequirementEntitySnapshot,
  RequirementLimit,
  RequirementMetric,
  RequirementOperand,
  RequirementOperator,
  RequirementPredicateSpec,
} from '../../shared/intent/requirementRecord';
import type { Vec3 } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { parseTopoRef } from '../../kernel/naming/topoRef';

/** Marker on the plain object `faces()` / `edges()` return. */
export const REQUIREMENT_OPERAND_MARKER = '__kcRequirementOperand';

export interface RequirementSelectionHandle {
  readonly __kcRequirementOperand: true;
  readonly operand: RequirementOperand;
}

/** A requirement predicate plus its fluent comparison methods. */
export class RequirementPredicate {
  readonly spec: RequirementPredicateSpec;

  constructor(spec: RequirementPredicateSpec) {
    this.spec = spec;
  }

  /** measured >= limit */
  gte(limit: number): RequirementPredicate {
    return new RequirementPredicate({ ...this.spec, op: 'gte', limit });
  }

  /** measured <= limit */
  lte(limit: number): RequirementPredicate {
    return new RequirementPredicate({ ...this.spec, op: 'lte', limit });
  }

  /** measured == limit (counts and other discrete metrics). */
  eq(limit: number): RequirementPredicate {
    return new RequirementPredicate({ ...this.spec, op: 'eq', limit });
  }

  /** lo <= measured <= hi. Accepts `between(lo, hi)` or `between([lo, hi])`. */
  between(lo: number | readonly [number, number], hi?: number): RequirementPredicate {
    const band = Array.isArray(lo) ? lo : [lo, hi];
    if (band.length !== 2 || band.some(v => typeof v !== 'number' || !Number.isFinite(v))) {
      return requirementError('between requires two finite numbers, e.g. .between(2, 5) or .between([2, 5]).');
    }
    return new RequirementPredicate({ ...this.spec, op: 'between', limit: [band[0], band[1]] as [number, number] });
  }

  /** Alias for `between`, matching `distance(a, b) in [lo, hi]`. */
  in(band: readonly [number, number]): RequirementPredicate {
    return this.between(band);
  }

  /** Bands for `bbox` ({x,y,z}) or a tolerance for angle/concentric/coplanar. */
  within(limit: RequirementBands | number): RequirementPredicate {
    if (typeof limit === 'number') {
      return new RequirementPredicate({ ...this.spec, op: 'within', limit, tolerance: limit });
    }
    return new RequirementPredicate({ ...this.spec, op: 'within', limit });
  }

  /** Set the density used by a `mass` requirement, kg/m^3. */
  atDensity(density: number): RequirementPredicate {
    return new RequirementPredicate({ ...this.spec, density });
  }

  /** Alias for `within(number)` on angle/concentric/coplanar. */
  tolerance(value: number): RequirementPredicate {
    return this.within(value);
  }
}

function requirementError(message: string, hint?: string): never {
  return invalidArgs({
    api: 'require(name, predicate)',
    gotText: message,
    requires: 'a valid requirement predicate',
    example: "require('bolt-clearance', clearance(a, b).gte(1))",
    ...(hint !== undefined ? { hint } : {}),
  });
}

function isSelectionHandle(value: unknown): value is RequirementSelectionHandle {
  return typeof value === 'object' && value !== null
    && (value as { __kcRequirementOperand?: unknown }).__kcRequirementOperand === true;
}

function isShape(value: unknown): value is Shape {
  return value instanceof Shape;
}

function vec(value: unknown): Vec3 | undefined {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(n => typeof n === 'number' && Number.isFinite(n))) {
    return undefined;
  }
  return [value[0], value[1], value[2]];
}

function firstVec(...values: unknown[]): Vec3 | undefined {
  for (const value of values) {
    const p = vec(value);
    if (p !== undefined) return p;
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

/** Read the compact geometry of an already-resolved descriptor. */
function snapshotOf(value: unknown): RequirementEntitySnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const snapshot = (v.snapshot ?? {}) as Record<string, unknown>;
  const centroid = firstVec(v.centroid, v.midpoint, v.position, snapshot.centroid);
  if (centroid === undefined) return undefined;
  const direction = firstVec(v.direction, v.normal, v.axis, snapshot.normal);
  const size = firstNumber(v.area, v.length, snapshot.area);
  const entityKind = v.curveType !== undefined || v.midpoint !== undefined ? 'edge' : 'face';
  return {
    entityKind,
    centroid,
    ...(direction !== undefined ? { direction } : {}),
    ...(size !== undefined ? { size } : {}),
  };
}

function refOwner(ref: unknown): { owner: string; kind: 'face' | 'edge' } | undefined {
  if (typeof ref !== 'string') return undefined;
  try {
    const parsed = parseTopoRef(ref);
    if ('error' in parsed) return undefined;
    if (parsed.kind !== 'face' && parsed.kind !== 'edge') return undefined;
    return { owner: parsed.owner, kind: parsed.kind };
  } catch {
    return undefined;
  }
}

/**
 * Normalize a requirement operand:
 *  - a `Shape` (or ScenePart) is a whole-body selection;
 *  - the handle returned by `faces()` / `edges()` is passed through;
 *  - an array of resolved descriptors is grouped by their `@kc[...]` owner.
 */
export function toRequirementOperand(value: unknown, label: string): RequirementOperand {
  if (isSelectionHandle(value)) return value.operand;
  if (isShape(value)) return { kind: 'body', ref: value.id };

  if (typeof value === 'object' && value !== null) {
    const withShape = value as { shape?: unknown; name?: unknown };
    if (isShape(withShape.shape)) {
      return { kind: 'body', ref: withShape.shape.id, ...(typeof withShape.name === 'string' ? { name: withShape.name } : {}) } as RequirementOperand;
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return requirementError(
        `${label}: selection is empty. Pass the shape/query selection, not a filtered-empty list.`,
        'invalid-args.require.empty-selection — build the selection after the geometry exists and pass a non-empty list.',
      );
    }
    const owners = value.map(v => refOwner((v as { ref?: unknown }).ref));
    const first = owners[0];
    if (first !== undefined && owners.every(o => o?.owner === first.owner && o.kind === first.kind)) {
      const snapshots = value.map(snapshotOf).filter((s): s is RequirementEntitySnapshot => s !== undefined);
      return {
        kind: first.kind === 'face' ? 'faces' : 'edges',
        ref: first.owner,
        entityRefs: value.map(v => (v as { ref: string }).ref),
        ...(snapshots.length > 0 ? { snapshots } : {}),
      };
    }
    return requirementError(
      `${label}: a bare entity list must carry @kc[...] refs. Pass faces(shape, query) / edges(shape, query) instead.`,
      'invalid-args.require.unowned-selection — selections need an owning feature so the ledger can fingerprint and highlight them.',
    );
  }

  return requirementError(
    `${label}: expected a Shape, faces(shape, query), edges(shape, query), or a resolved entity list.`,
    'invalid-args.require.bad-operand — see lookup_api("require clearance") for the predicate helpers.',
  );
}

/** A whole-body or per-face/edge selection over one feature, resolved lazily. */
export function faces(shape: Shape, query?: FaceQuery): RequirementSelectionHandle {
  if (!isShape(shape)) {
    return requirementError(
      'faces(shape, query): first argument must be a Shape.',
      'invalid-args.require.faces-shape — pass the body whose faces the requirement names.',
    );
  }
  return { __kcRequirementOperand: true, operand: { kind: 'faces', ref: shape.id, ...(query !== undefined ? { query } : {}) } };
}

export function edges(shape: Shape, query?: EdgeQuery): RequirementSelectionHandle {
  if (!isShape(shape)) {
    return requirementError(
      'edges(shape, query): first argument must be a Shape.',
      'invalid-args.require.edges-shape — pass the body whose edges the requirement names.',
    );
  }
  return { __kcRequirementOperand: true, operand: { kind: 'edges', ref: shape.id, ...(query !== undefined ? { query } : {}) } };
}

function make(
  metric: RequirementMetric,
  a: unknown | undefined,
  b: unknown | undefined,
  label: string,
): RequirementPredicate {
  return new RequirementPredicate({
    metric,
    ...(a !== undefined ? { a: toRequirementOperand(a, label) } : {}),
    ...(b !== undefined ? { b: toRequirementOperand(b, label) } : {}),
  });
}

/** Minimum surface-to-surface distance between two selections, mm. */
export function clearance(a: unknown, b: unknown): RequirementPredicate {
  return make('clearance', a, b, 'clearance');
}

/** Distance between two selections, mm. Chain `.in([lo, hi])` for a band. */
export function distance(a: unknown, b: unknown): RequirementPredicate {
  return make('distance', a, b, 'distance');
}

/** Mass of a selection in kg (default density 1000 kg/m^3). */
export function mass(selection: unknown): RequirementPredicate {
  return make('mass', selection, undefined, 'mass');
}

/** Volume of a selection in mm^3. */
export function volume(selection: unknown): RequirementPredicate {
  return make('volume', selection, undefined, 'volume');
}

/** Bounding-box size of a selection in mm. Chain `.within({ x, y, z })`. */
export function bbox(selection: unknown): RequirementPredicate {
  return make('bbox', selection, undefined, 'bbox');
}

/** Centre of mass of a selection in mm. Chain `.within(bands)` or
 *  `.between(lo, hi)` (Euclidean distance from the origin). */
export function centerOfMass(selection: unknown): RequirementPredicate {
  return make('centerOfMass', selection, undefined, 'centerOfMass');
}

/** Number of resolved entities (faces/edges) in a selection. */
export function count(selection: unknown): RequirementPredicate {
  return make('count', selection, undefined, 'count');
}

/** Largest inner-loop (hole) count across the selected faces. */
export function innerLoops(selection: unknown): RequirementPredicate {
  return make('innerLoops', selection, undefined, 'innerLoops');
}

/** Angle between two selections' directions, degrees. */
export function angle(a: unknown, b: unknown): RequirementPredicate {
  return make('angle', a, b, 'angle');
}

/** Two selections share an axis (parallel axes, coincident centres). */
export function concentric(a: unknown, b: unknown): RequirementPredicate {
  return make('concentric', a, b, 'concentric');
}

/** Two selections are coplanar (parallel normals, zero plane offset). */
export function coplanar(a: unknown, b: unknown): RequirementPredicate {
  return make('coplanar', a, b, 'coplanar');
}

/** The predicate spec carried by either a builder or a plain external spec. */
export function predicateSpec(value: unknown): RequirementPredicateSpec | undefined {
  if (value instanceof RequirementPredicate) return value.spec;
  if (typeof value === 'object' && value !== null) {
    const v = value as { metric?: unknown; predicate?: unknown; spec?: unknown };
    if (v.metric !== undefined) return value as RequirementPredicateSpec;
    if (typeof v.predicate === 'object' && v.predicate !== null) return v.predicate as RequirementPredicateSpec;
    if (typeof v.spec === 'object' && v.spec !== null) return v.spec as RequirementPredicateSpec;
  }
  return undefined;
}

export function isValidOperator(op: unknown): op is RequirementOperator {
  return op === 'gte' || op === 'lte' || op === 'eq' || op === 'between' || op === 'within';
}

export function isRequirementLimit(value: unknown): value is Exclude<RequirementLimit, null> {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) {
    return value.length === 2 && value.every(v => typeof v === 'number' && Number.isFinite(v));
  }
  return typeof value === 'object' && value !== null;
}
