// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/queryConstructors.ts
//
// Slice Q — the kc.q.* namespace. Every constructor returns a Query value
// via makeQuery(). Type-narrowed overloads: q.face(...) returns
// Query<FaceMarker>, q.edge(...) returns Query<EdgeMarker>, and so on, so
// the compiler rejects cross-kind misuse (e.g. passing a face query into
// a fillet's edges slot).

import {
  makeQuery,
  type Query,
  type QueryAst,
  type QueryKind,
  type GeometryType,
  type FaceMarker,
  type EdgeMarker,
  type VertexMarker,
  type ConnectorMarker,
  type PartMarker,
  type SolidMarker,
  type EntityMarker,
} from './query';

// ---------------------------------------------------------------------------
// Empty + universal
// ---------------------------------------------------------------------------

function nothing(): Query<unknown> {
  return makeQuery<unknown>('any', { op: 'nothing' });
}

function everythingImpl(kind: QueryKind): Query<EntityMarker> {
  return makeQuery<EntityMarker>(kind, { op: 'everything', kind });
}

function everything(kind: 'face'): Query<FaceMarker>;
function everything(kind: 'edge'): Query<EdgeMarker>;
function everything(kind: 'vertex'): Query<VertexMarker>;
function everything(kind: 'connector'): Query<ConnectorMarker>;
function everything(kind: 'part'): Query<PartMarker>;
function everything(kind: 'solid'): Query<SolidMarker>;
function everything(kind: QueryKind): Query<EntityMarker> {
  return everythingImpl(kind);
}

// ---------------------------------------------------------------------------
// Entity-kind narrowing — typed constructors.
//
// Filters fold into an entityFilter AST node wrapping either the single
// filter or an intersection over multiple. `q.face()` with no args returns
// Query<FaceMarker> over `everything('face')`.
// ---------------------------------------------------------------------------

function compose(kind: QueryKind, filters: Query<unknown>[]): QueryAst {
  const base: QueryAst = { op: 'everything', kind };
  if (filters.length === 0) return base;
  // Single filter -> one-node entityFilter wrapping that filter's AST;
  // multi-filter -> entityFilter over an intersection of all filter ASTs.
  const filterAst: QueryAst = filters.length === 1
    ? filters[0].ast
    : { op: 'intersection', queries: filters.map((f) => f.ast) };
  return { op: 'entityFilter', query: filterAst, kind };
}

function face(...filters: Query<unknown>[]): Query<FaceMarker> {
  return makeQuery<FaceMarker>('face', compose('face', filters));
}
function edge(...filters: Query<unknown>[]): Query<EdgeMarker> {
  return makeQuery<EdgeMarker>('edge', compose('edge', filters));
}
function vertex(...filters: Query<unknown>[]): Query<VertexMarker> {
  return makeQuery<VertexMarker>('vertex', compose('vertex', filters));
}
function connector(...filters: Query<unknown>[]): Query<ConnectorMarker> {
  return makeQuery<ConnectorMarker>('connector', compose('connector', filters));
}
function part(...filters: Query<unknown>[]): Query<PartMarker> {
  return makeQuery<PartMarker>('part', compose('part', filters));
}
function solid(...filters: Query<unknown>[]): Query<SolidMarker> {
  return makeQuery<SolidMarker>('solid', compose('solid', filters));
}

// ---------------------------------------------------------------------------
// Creation-event filter — matches every entity produced by the feature with
// the supplied id (or every entity of the given kind produced by it).
// ---------------------------------------------------------------------------

function createdBy(id: string, kind?: QueryKind): Query<unknown> {
  const ast: QueryAst = kind !== undefined
    ? { op: 'createdBy', id, kind }
    : { op: 'createdBy', id };
  return makeQuery<unknown>('any', ast);
}

// ---------------------------------------------------------------------------
// Ownership filters
// ---------------------------------------------------------------------------

function ownedByPart(q: Query<PartMarker>): Query<unknown> {
  return makeQuery<unknown>('any', { op: 'ownedByPart', query: q.ast });
}

function ownerPart(q: Query<unknown>): Query<PartMarker> {
  return makeQuery<PartMarker>('part', { op: 'ownerPart', query: q.ast });
}

// ---------------------------------------------------------------------------
// Set algebra — three ops only: union / intersection / subtraction.
// ---------------------------------------------------------------------------

function union<T extends EntityMarker>(...queries: Query<T>[]): Query<T> {
  if (queries.length === 0) {
    throw new Error('q.union requires at least one sub-query.');
  }
  return makeQuery<T>(
    queries[0].target,
    { op: 'union', queries: queries.map((sub) => sub.ast) },
  );
}

function intersection<T extends EntityMarker>(...queries: Query<T>[]): Query<T> {
  if (queries.length === 0) {
    throw new Error('q.intersection requires at least one sub-query.');
  }
  return makeQuery<T>(
    queries[0].target,
    { op: 'intersection', queries: queries.map((sub) => sub.ast) },
  );
}

function subtraction<T extends EntityMarker>(a: Query<T>, b: Query<T>): Query<T> {
  return makeQuery<T>(a.target, { op: 'subtraction', a: a.ast, b: b.ast });
}

// ---------------------------------------------------------------------------
// Spatial filters
// ---------------------------------------------------------------------------

function containsPoint(point: [number, number, number]): Query<unknown> {
  return makeQuery<unknown>('any', {
    op: 'containsPoint',
    query: { op: 'nothing' },
    point,
  });
}

function closestTo(point: [number, number, number], k?: number): Query<unknown> {
  const ast: QueryAst = k !== undefined
    ? { op: 'closestTo', query: { op: 'nothing' }, point, k }
    : { op: 'closestTo', query: { op: 'nothing' }, point };
  return makeQuery<unknown>('any', ast);
}

// ---------------------------------------------------------------------------
// Type / label / feature-name filters
// ---------------------------------------------------------------------------

function geometryType(geomType: GeometryType): Query<unknown> {
  return makeQuery<unknown>('any', {
    op: 'geometryType',
    query: { op: 'nothing' },
    geomType,
  });
}

function withLabel(label: string): Query<unknown> {
  return makeQuery<unknown>('any', {
    op: 'withLabel',
    query: { op: 'nothing' },
    label,
  });
}

function withFeatureName(name: string): Query<unknown> {
  return makeQuery<unknown>('any', {
    op: 'withFeatureName',
    query: { op: 'nothing' },
    name,
  });
}

// ---------------------------------------------------------------------------
// Ordering / indexing
// ---------------------------------------------------------------------------

function nthElement<T extends EntityMarker>(q: Query<T>, index: number): Query<T> {
  return makeQuery<T>(q.target, { op: 'nthElement', query: q.ast, index });
}

// ---------------------------------------------------------------------------
// String-DSL sugar — wraps the existing @kc[<owner>/<kind>/<name>] string
// form in a Query AST node. The actual parsing happens at evaluation time
// inside the queryEvaluator slice so the constructor stays synchronous and
// cheap; both surface syntaxes (string and constructor) bottom out on one
// internal Query value.
// ---------------------------------------------------------------------------

function fromString(ref: string): Query<unknown> {
  return makeQuery<unknown>('any', { op: 'fromString', ref });
}

// ---------------------------------------------------------------------------
// Public namespace export. Consumers write `q.face(...)`, `q.edge(...)`,
// `q.union(a, b)`, etc.
// ---------------------------------------------------------------------------

export const q = {
  nothing,
  everything,
  face,
  edge,
  vertex,
  connector,
  part,
  solid,
  createdBy,
  ownedByPart,
  ownerPart,
  union,
  intersection,
  subtraction,
  containsPoint,
  closestTo,
  geometryType,
  withLabel,
  withFeatureName,
  nthElement,
  fromString,
} as const;
