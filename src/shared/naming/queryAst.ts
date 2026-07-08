// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/naming/queryAst.ts
//
// Serializable Query DSL contracts. Runtime query values, evaluators, and
// OCCT-facing scene types stay in src/kernel/naming/query.ts.

/** Discriminator for the entity kind a Query addresses. */
export type QueryKind = 'face' | 'edge' | 'vertex' | 'connector' | 'part' | 'solid';

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
