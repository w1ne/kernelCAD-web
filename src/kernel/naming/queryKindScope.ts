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
// enclosing kind. Spatial and geometry filters keep their face default.

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
    case 'union':
    case 'intersection':
      return { ...ast, queries: ast.queries.map((sub) => scopeFiltersToKind(sub, kind)) };
    case 'subtraction':
      return { ...ast, a: scopeFiltersToKind(ast.a, kind), b: scopeFiltersToKind(ast.b, kind) };
    default:
      return ast;
  }
}
