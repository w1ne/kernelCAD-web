// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const QUERY_CODES = {

  // Slice Q (Query DSL) — Q3 evaluator codes (7 of the v1 11-code core;
  // remaining 4 ship in Q4/Q5/Q7 alongside their evaluator entry points).
  // The reactive-update code was demoted to v2 per consolidated review F8.
  // The snapshot-fallback path re-uses F-foundation's
  // 'feature.face-ref.snapshot-fallback-used' rather than minting a new code.
  'query.empty': {
    hintTemplate:
      'The query resolved to zero entities on the current scene. Narrow the query if over-specified — remove a filter, or rebuild against the current scene. If empty is expected, annotate with .asLenient() to suppress this error and continue with no entities.',
    nextAction: { kind: 'rewrite-feature', guidance: 'narrow the query or mark it .asLenient()' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'A Query resolved to zero entities at evaluation time.',
  },
  'query.over-determined': {
    hintTemplate:
      'The query resolved to multiple entities but the consumer expects exactly one. Narrow with .and(closestTo(point)) or .and(geometryType(...)), or pick a specific index with .nth(i).',
    nextAction: { kind: 'rewrite-feature', guidance: 'narrow the query to exactly-one entity' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'A Query resolved to N>1 entities under an exactly-one consumer.',
  },
  'query.evaluated-too-early': {
    hintTemplate:
      'The query references an Id that does not exist in the scene at evaluation time. The op may not have been stamped yet, or the Id was misspelled. Verify with list_features, or move the query construction to after the op is stamped.',
    nextAction: { kind: 'rewrite-feature', guidance: 'verify the Id or reorder operations' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'A Query was evaluated against a scene that does not yet contain the referenced Id.',
  },
  'query.unknown-id': {
    hintTemplate:
      'The createdBy filter references an Id that does not exist. Verify the Id with list_features, or pin the upstream op via kc.id(\'<name>\') so the Id survives across reorderings.',
    nextAction: { kind: 'rewrite-feature', guidance: 'pin the upstream Id or rename the reference' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'A createdBy filter referenced an Id absent from the scene.',
  },
  'query.unknown-label': {
    hintTemplate:
      'The withLabel filter matched zero lineage entries. Declare the label via .faceLabels({ \'<label>\': \'<canonical>\' }) on the relevant op, or use a canonical face name (top/bottom/left/right/front/back).',
    nextAction: { kind: 'rewrite-feature', guidance: 'declare the label or use a canonical face name' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'A withLabel filter referenced a label absent from every lineage entry.',
  },
  'query.id-hierarchy-clash': {
    hintTemplate:
      'Two ops cannot share the same explicit Id at the same hierarchy level. Rename one of the colliding Ids.',
    nextAction: { kind: 'rewrite-feature', guidance: 'rename one of the colliding Ids' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'An explicit kc.id() collided with an already-pinned Id at the same hierarchy level.',
  },
  'query.unsupported-entity-type': {
    hintTemplate:
      'The Query evaluator does not yet resolve this entity kind. Face-kind queries are supported; edge/vertex/connector/part/solid kinds ship in a follow-up slice once the per-lowerer feature-stamp wiring lands. Recast the query to use kc.q.face(...) or wait for the follow-up.',
    nextAction: { kind: 'rewrite-feature', guidance: 'use kc.q.face(...) until the kind-specific wiring lands' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'A Query targeted an entity kind whose evaluator branch has not yet been wired.',
  },
  'query.composition-strict-failure': {
    hintTemplate:
      'A composed query (union / intersection / subtraction) short-circuited on the first sub-query error in strict mode. Either fix the failing sub-query, or annotate the composed query with .asLenient() to allow partial success — failed sub-queries then contribute zero entities and the surviving sub-queries are composed as if the failing branch had returned the empty set.',
    nextAction: { kind: 'rewrite-feature', guidance: 'fix the failing sub-query or annotate the composition with .asLenient()' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'A composed Query aborted in strict mode because a sub-query raised a diagnostic; the outer wrapper code quotes the inner cause.',
  },
  'query.type-mismatch': {
    hintTemplate:
      'A consumer expecting a specific entity kind received a Query whose target field disagrees. Static narrowing via kc.q.face(...) / kc.q.edge(...) generics catches this at compile time on .kcad.ts source; this runtime fallback fires when the static marker was erased (JSON-AST boundary, fromString, or untyped Query<unknown>). Construct the query with the matching kind: use kc.q.<expected>(...) instead of kc.q.<actual>(...).',
    nextAction: { kind: 'rewrite-feature', guidance: 'reconstruct the query with the kind the consumer expects (kc.q.face / kc.q.edge / ...)' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'A Query crossed a runtime kind-narrowing fallback: a consumer demanded one entity kind and the Query.target field announced a different one.',
  },
  'query.invalid-syntax': {
    hintTemplate:
      'The topology input is neither a valid @kc[...] ref nor a valid @kcq[...] Query DSL string nor a JSON-AST object. Check the grammar: use @kc[<owner>/<kind>/<name>] for a single addressed entity, @kcq[<expr>] for a composed query (face(createdBy("id")), union(a, b), intersection(a, b), subtraction(a, b), nothing(), everything(<kind>)). See the kernelcad-mcp SKILL for the full grammar.',
    nextAction: { kind: 'rewrite-feature', guidance: 'use @kc[owner/kind/name] for simple refs or @kcq[<expr>] for composed queries' },
    defaultSeverity: 'error',
    group: 'query',
    description: 'A topology input string failed to parse as either an @kc[...] ref, an @kcq[...] Query DSL expression, or a JSON-AST object.',
  },
} as const satisfies Record<`query.${string}`, DiagnosticCodeSpec>;
