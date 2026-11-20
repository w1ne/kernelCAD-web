// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/queryKindScope.ts
//
// Filters written inside `q.edge(...)` address edges. On their own, a bare
// `withLabel` / `withFeatureName` (whose inner query is the `nothing`
// placeholder) stands for every face, and a `createdBy` / `newSince` /
// `derivedFrom` with no kind collects faces. Inside an edge filter that made
// `q.edge(q.withLabel('top-perimeter'))` select nothing, because the edge
// narrowing then dropped every face. This rewrite gives those filters the
// enclosing kind. A bare spatial or geometry filter (`closestTo`,
// `containsPoint`, `geometryType`) gets the enclosing kind as its candidate
// set too, except after the first term of an intersection: there it stays a
// placeholder and narrows the running result, so
// `q.edge(q.withLabel('corner'), q.closestTo(p))` picks the nearest corner.

import type { QueryAst, QueryKind } from '../../shared/naming/queryAst';

export function scopeFiltersToKind(ast: QueryAst, kind: QueryKind): QueryAst {
  switch (ast.op) {
    case 'createdBy':
    case 'newSince':
    case 'derivedFrom':
      return ast.kind === undefined ? { ...ast, kind } : ast;
    case 'withLabel':
    case 'withFeatureName':
      return {
        ...ast,
        query: ast.query.op === 'nothing'
          ? { op: 'everything', kind }
          : scopeFiltersToKind(ast.query, kind),
      };
    case 'containsPoint':
    case 'closestTo':
    case 'geometryType':
      return {
        ...ast,
        query: ast.query.op === 'nothing'
          ? { op: 'everything', kind }
          : scopeFiltersToKind(ast.query, kind),
      };
    case 'union':
      return { ...ast, queries: ast.queries.map((sub) => scopeFiltersToKind(sub, kind)) };
    case 'intersection':
      return {
        ...ast,
        queries: ast.queries.map((sub, i) =>
          i > 0 && isSpatialPlaceholder(sub) ? sub : scopeFiltersToKind(sub, kind)),
      };
    case 'subtraction':
      return { ...ast, a: scopeFiltersToKind(ast.a, kind), b: scopeFiltersToKind(ast.b, kind) };
    default:
      return ast;
  }
}

function isSpatialPlaceholder(ast: QueryAst): boolean {
  return (ast.op === 'containsPoint' || ast.op === 'closestTo' || ast.op === 'geometryType')
    && ast.query.op === 'nothing';
}
