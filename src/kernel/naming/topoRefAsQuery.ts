// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/topoRefAsQuery.ts
//
// Q7 — strings-as-sugar bridge per D0.9 (b). Compiles an F-surface-parsed
// TopoRef into the equivalent Query AST. The string @kc[base/face/top]
// compiles to the AST that kc.q.face().withFeatureName('base').withLabel('top')
// would produce, so the same evaluator resolves both surface syntaxes to
// the same OCCT entity.
//
// Compilation rule (one direction; not a literal round-trip):
//   @kc[<owner>]                     → kc.q.part().withFeatureName(<owner>)
//                                      (kind defaults to 'part' per topoRef.ts)
//   @kc[<owner>/<kind>]              → kc.q.<kind>().withFeatureName(<owner>)
//   @kc[<owner>/<kind>/<name>]       → kc.q.<kind>().withFeatureName(<owner>).withLabel(<name>)
//   @kc[<owner>/<kind>/<n>[N]]       → same as above; the label includes the
//                                      [N] suffix verbatim (parseTopoRef
//                                      preserves the indexed-segment form).
//   @kc[<owner>/<kind>/<name>#mod]   → same as above; the modifier is
//                                      dropped at the Query level (modifiers
//                                      like #normal / #axis / #center are
//                                      downstream concerns — the Query
//                                      addresses the entity, the consumer
//                                      applies modifier semantics).
//
// Sketch refs (kind 'sketch') have no QueryKind counterpart — the Query
// evaluator addresses topology, not sketch geometry — so the bridge throws
// query.unsupported-entity-type. This is the same diagnostic the evaluator
// raises for edge / vertex / etc. branches that have not yet been wired
// (per cumulative finding #33).

import { KernelError } from '../../shared/intent/kernelError';
import type { TopoRef, TopoKind } from './topoRef';
import { makeQuery, type Query, type QueryAst, type QueryKind } from './query';

const TOPO_TO_QUERY_KIND: Readonly<Record<TopoKind, QueryKind | null>> = {
  face: 'face',
  edge: 'edge',
  vertex: 'vertex',
  connector: 'connector',
  part: 'part',
  solid: 'solid',
  // No Query.kind for sketches — the Query evaluator addresses topology,
  // not sketch geometry. Callers branch on the null and emit
  // query.unsupported-entity-type so the agent surface stays consistent.
  sketch: null,
};

export function topoRefAsQuery(ref: TopoRef): Query<unknown> {
  const kind = TOPO_TO_QUERY_KIND[ref.kind];
  if (kind === null) {
    throw new KernelError(
      'query.unsupported-entity-type',
      `topoRefAsQuery: ref '${ref.raw}' has kind '${ref.kind}' which has no Query counterpart.`,
      undefined,
      `Sketch refs are not addressable through the Query evaluator. Use the imperative sketch API or pass the bare @kc[<owner>/sketch/<name>] string to a sketch-aware consumer.`,
    );
  }
  let ast: QueryAst = { op: 'everything', kind };
  if (ref.owner) {
    ast = { op: 'withFeatureName', query: ast, name: ref.owner };
  }
  if (ref.segments.length > 0) {
    const name = ref.segments[ref.segments.length - 1]!;
    ast = { op: 'withLabel', query: ast, label: name };
  }
  ast = { op: 'entityFilter', query: ast, kind };
  return makeQuery<unknown>(kind, ast);
}
