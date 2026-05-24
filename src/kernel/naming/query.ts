// src/kernel/naming/query.ts
//
// Slice Q — Query value type + AST + EntityMarker phantom types + chainable
// methods. No evaluator implementation in this task; `.evaluate(scene)`
// throws "Not implemented" until the next slice wires it through
// queryEvaluator.ts. Strict serializability: every field is a primitive or
// another QueryAst node, never a function — so JSON.stringify round-trips
// cleanly and the @kcq[...] string DSL ships against the same AST shape.

import type { OcctBackend } from '../backends/occt/occtBackend';
import type { FeatureRecord } from '../../shared/intent/featureRecord';

/** Discriminator for the entity kind a Query addresses. */
export type QueryKind = 'face' | 'edge' | 'vertex' | 'connector' | 'part' | 'solid';

/** Phantom type markers for static type narrowing. The markers are NEVER
 *  materialised at runtime; the runtime discriminator is `Query.target`.
 *  Phantoms exist purely so TS rejects `fillet({ edges: faceQuery })` at
 *  compile time. */
export type FaceMarker = { readonly _face: unique symbol };
export type EdgeMarker = { readonly _edge: unique symbol };
export type VertexMarker = { readonly _vertex: unique symbol };
export type ConnectorMarker = { readonly _connector: unique symbol };
export type PartMarker = { readonly _part: unique symbol };
export type SolidMarker = { readonly _solid: unique symbol };

export type EntityMarker =
  | FaceMarker | EdgeMarker | VertexMarker
  | ConnectorMarker | PartMarker | SolidMarker;

export type GeometryType =
  | 'PLANE' | 'CYLINDER' | 'CONE' | 'SPHERE' | 'TORUS'
  | 'BSPLINE_SURFACE' | 'LINE' | 'CIRCLE' | 'BSPLINE_CURVE' | 'OTHER';

/** The Query AST. Serializable; structurally equal under round-trip. */
export type QueryAst =
  | { op: 'nothing' }
  | { op: 'everything'; kind: QueryKind }
  | { op: 'createdBy'; id: string; kind?: QueryKind }
  | { op: 'ownedByPart'; query: QueryAst }
  | { op: 'ownerPart'; query: QueryAst }
  | { op: 'union'; queries: QueryAst[] }
  | { op: 'intersection'; queries: QueryAst[] }
  | { op: 'subtraction'; a: QueryAst; b: QueryAst }
  | { op: 'containsPoint'; query: QueryAst; point: [number, number, number] }
  | { op: 'closestTo'; query: QueryAst; point: [number, number, number]; k?: number }
  | { op: 'geometryType'; query: QueryAst; geomType: GeometryType }
  | { op: 'entityFilter'; query: QueryAst; kind: QueryKind }
  | { op: 'withLabel'; query: QueryAst; label: string }
  | { op: 'withFeatureName'; query: QueryAst; name: string }
  | { op: 'nthElement'; query: QueryAst; index: number }
  | { op: 'fromString'; ref: string };

/** A resolved entity carries the OCCT handle, the canonical @kc[...] ref
 *  (so diagnostic prose stays compact), and a snapshot for cite-by-geometry. */
export interface ResolvedEntity<T extends EntityMarker = EntityMarker> {
  readonly marker?: T;
  readonly kind: QueryKind;
  /** Canonical @kc[<owner>/<kind>/<name>] form. Built via formatTopoRef. */
  readonly ref: string;
  /** OCCT-backend handle (FaceHash / EdgeHash / etc). */
  readonly handle: string;
  /** Optional snapshot for diagnostic citation. */
  readonly snapshot?: {
    centroid: [number, number, number];
    normal?: [number, number, number];
    area?: number;
  };
}

/** A "scene" is the lowered OCCT backend plus the active feature records.
 *  The evaluator narrows Query AST nodes against this context. */
export interface QueryScene {
  readonly backend: OcctBackend;
  readonly featureId: string;
  readonly records?: readonly FeatureRecord[];
}

/** A lazy topology query. Carries the AST; resolves at consume-time. Strict
 *  serializability: every data field is primitive or another QueryAst node,
 *  so JSON.stringify round-trips. Chainable methods are attached as
 *  non-enumerable properties (see makeQuery below) so they survive runtime
 *  use but vanish from the JSON form.
 *
 *  Type parameter `T` is a phantom marker for compile-time narrowing
 *  (`Query<FaceMarker>` rejects assignment to `Query<EdgeMarker>`). */
export interface Query<T extends EntityMarker | unknown = unknown> {
  readonly _kind: 'kc.query';
  readonly target: QueryKind | 'any';
  readonly ast: QueryAst;
  /** Composed queries don't short-circuit on empty sub-queries; failed subs
   *  contribute zero entities and emit an info diagnostic. */
  readonly lenient?: boolean;
  /** Phantom field — never set at runtime; carries the type marker. */
  readonly _marker?: T;

  // ---- Chainable methods (attached non-enumerably; see makeQuery) ---------

  /** Returns a copy of this query with the `lenient` data field set to
   *  `true`. Named `asLenient` instead of `lenient` because the latter is
   *  reserved for the boolean data field on the same object (a method and
   *  a property cannot share a key in plain JS). */
  asLenient(): Query<T>;
  /** Wraps the query in an `nthElement` AST node — index-based ambiguity
   *  resolution at the consume site. */
  nth(index: number): Query<T>;
  /** Sugar for `q.intersection(this, filter)`. */
  and(filter: Query<unknown>): Query<T>;
  /** Sugar for `q.union(this, other)`. */
  or(other: Query<T>): Query<T>;
  /** Sugar for `q.subtraction(this, other)`. */
  minus(other: Query<T>): Query<T>;
  /** Resolve against the supplied scene. Throws "Not implemented" until the
   *  evaluator slice wires this entry point. */
  evaluate(
    scene: QueryScene,
  ): ReadonlyArray<ResolvedEntity<T extends EntityMarker ? T : EntityMarker>>;
  /** Resolve with an exactly-one assertion. Throws "Not implemented" until
   *  the evaluator slice wires this entry point. */
  evaluateUnique(
    scene: QueryScene,
  ): ResolvedEntity<T extends EntityMarker ? T : EntityMarker>;
  /** Serialize to `@kcq[...]` string DSL form. The full grammar lands in a
   *  later slice; the placeholder returns a debug-readable JSON form so
   *  diagnostic prose is non-empty. */
  toString(): string;
  /** Serialize to a JSON-safe data snapshot. Returns the full Query record
   *  so `JSON.stringify(query)` round-trips through `JSON.parse(...)` into
   *  an object structurally equal to the data fields of the source Query.
   *  Note: the parsed value is a plain object, not a Query — the chainable
   *  methods are non-enumerable and absent from the JSON form. */
  toJSON(): {
    readonly _kind: 'kc.query';
    readonly target: QueryKind | 'any';
    readonly ast: QueryAst;
    readonly lenient?: boolean;
  };
}

/** Internal factory used by every constructor in queryConstructors.ts.
 *  Wires the chainable methods onto a fresh Query object as non-enumerable
 *  properties so JSON.stringify ignores them. */
export function makeQuery<T extends EntityMarker | unknown>(
  target: QueryKind | 'any',
  ast: QueryAst,
  lenient?: boolean,
): Query<T> {
  // Build the data-bearing object first. Methods are attached below as
  // non-enumerable so JSON serialization sees only data fields.
  const base: {
    _kind: 'kc.query';
    target: QueryKind | 'any';
    ast: QueryAst;
    lenient?: boolean;
  } = lenient
    ? { _kind: 'kc.query', target, ast, lenient: true }
    : { _kind: 'kc.query', target, ast };

  const v = base as Query<T>;

  Object.defineProperty(v, 'asLenient', {
    value: function asLenientImpl(this: Query<T>): Query<T> {
      return makeQuery<T>(this.target, this.ast, true);
    },
    enumerable: false,
  });
  Object.defineProperty(v, 'nth', {
    value: function nthImpl(this: Query<T>, index: number): Query<T> {
      return makeQuery<T>(
        this.target,
        { op: 'nthElement', query: this.ast, index },
        this.lenient as boolean | undefined,
      );
    },
    enumerable: false,
  });
  Object.defineProperty(v, 'and', {
    value: function andImpl(this: Query<T>, filter: Query<unknown>): Query<T> {
      return makeQuery<T>(
        this.target,
        { op: 'intersection', queries: [this.ast, filter.ast] },
        this.lenient as boolean | undefined,
      );
    },
    enumerable: false,
  });
  Object.defineProperty(v, 'or', {
    value: function orImpl(this: Query<T>, other: Query<T>): Query<T> {
      return makeQuery<T>(
        this.target,
        { op: 'union', queries: [this.ast, other.ast] },
        this.lenient as boolean | undefined,
      );
    },
    enumerable: false,
  });
  Object.defineProperty(v, 'minus', {
    value: function minusImpl(this: Query<T>, other: Query<T>): Query<T> {
      return makeQuery<T>(
        this.target,
        { op: 'subtraction', a: this.ast, b: other.ast },
        this.lenient as boolean | undefined,
      );
    },
    enumerable: false,
  });
  Object.defineProperty(v, 'evaluate', {
    value: function evaluateImpl(this: Query<T>, _scene: QueryScene): never {
      throw new Error(
        'Not implemented in this task — wait for the queryEvaluator slice. Use the JSON-AST form for inspection.',
      );
    },
    enumerable: false,
  });
  Object.defineProperty(v, 'evaluateUnique', {
    value: function evaluateUniqueImpl(this: Query<T>, _scene: QueryScene): never {
      throw new Error(
        'Not implemented in this task — wait for the queryEvaluator slice.',
      );
    },
    enumerable: false,
  });
  Object.defineProperty(v, 'toString', {
    value: function toStringImpl(this: Query<T>): string {
      // Debug-readable placeholder; the @kcq[...] grammar lands in a later
      // slice alongside the string-DSL parser.
      return `@kcq[${this.target}(${JSON.stringify(this.ast)})]`;
    },
    enumerable: false,
  });
  Object.defineProperty(v, 'toJSON', {
    value: function toJSONImpl(this: Query<T>): {
      readonly _kind: 'kc.query';
      readonly target: QueryKind | 'any';
      readonly ast: QueryAst;
      readonly lenient?: boolean;
    } {
      // Return the full Query data record so JSON.stringify round-trips
      // through JSON.parse into a structurally-equal object (minus the
      // non-enumerable chainable methods, which can be re-attached by a
      // future parseQuery helper).
      return this.lenient
        ? { _kind: this._kind, target: this.target, ast: this.ast, lenient: this.lenient }
        : { _kind: this._kind, target: this.target, ast: this.ast };
    },
    enumerable: false,
  });

  return v;
}
