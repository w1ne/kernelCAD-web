// src/kernel/naming/queryDiagnostics.ts
//
// Q3 — emission helpers for the v1 query.* diagnostic codes. Every code
// ships through KernelError so the hint surfaces via the existing MCP error
// envelope (mirrors the F-foundation `feature.face-ref.*` pattern).
//
// Codes registered in Q3 (7 of the 11 v1 core; remainder ship in Q4/Q5/Q7
// alongside their evaluator entry points; the reactive-update code was
// demoted to v2 per consolidated review F8):
//
//   query.empty
//   query.over-determined
//   query.evaluated-too-early
//   query.unknown-id
//   query.unknown-label
//   query.id-hierarchy-clash
//   query.unsupported-entity-type           (Q3 punt code — Finding #33)
//
// The snapshot-fallback surface re-uses F-foundation's
// `feature.face-ref.snapshot-fallback-used` rather than minting a new code.

import { KernelError } from '../../shared/intent/kernelError';
import type { Query, QueryScene, ResolvedEntity, QueryKind } from './query';

function dsl(query: Query<unknown>): string {
  try {
    return query.toString();
  } catch {
    return '<unprintable>';
  }
}

export function throwQueryEmpty(
  query: Query<unknown>,
  scene: QueryScene,
  snapshotAttempted: boolean,
): never {
  throw new KernelError(
    'query.empty',
    `the query '${dsl(query)}' resolved to zero entities on the current scene.`,
    scene.featureId,
    `Lineage walk returned 0 matches; snapshot fallback was ${snapshotAttempted ? 'attempted and failed' : 'not attempted'}. Narrow the query if over-specified — remove a filter, or rebuild against the current scene. If empty is expected (e.g. a "fillet every X if any" pattern), annotate the query with .asLenient() to suppress this error and continue.`,
  );
}

export function throwQueryOverDetermined(
  query: Query<unknown>,
  scene: QueryScene,
  candidates: ReadonlyArray<ResolvedEntity>,
  consumer = 'unknown-consumer',
): never {
  const list = candidates
    .slice(0, 4)
    .map((c, i) => `  [${i}] ${c.ref}${c.snapshot?.centroid ? ` centroid=${JSON.stringify(c.snapshot.centroid)}` : ''}`)
    .join('\n');
  throw new KernelError(
    'query.over-determined',
    `the query '${dsl(query)}' resolved to ${candidates.length} entities; the consumer '${consumer}' expects exactly-one. Candidates (in canonical order):\n${list}`,
    scene.featureId,
    `Narrow with .and(closestTo(point)) or .and(geometryType(...)), or use .nth(i) to pick a specific entity by canonical-order index.`,
  );
}

export function throwQueryEvaluatedTooEarly(
  query: Query<unknown>,
  scene: QueryScene,
  missingId: string,
): never {
  throw new KernelError(
    'query.evaluated-too-early',
    `the query '${dsl(query)}' references an Id '${missingId}' that does not exist in the scene at evaluation time.`,
    scene.featureId,
    `The op may not have been stamped yet, or the Id was misspelled. Verify with list_features, check the spelling, or move the query construction to after the op is stamped.`,
  );
}

export function throwQueryUnknownId(
  _query: Query<unknown>,
  scene: QueryScene,
  id: string,
  known: readonly string[],
): never {
  const knownList = known.slice(0, 10).join(', ');
  throw new KernelError(
    'query.unknown-id',
    `the query filter 'createdBy("${id}")' references an Id that does not exist.`,
    scene.featureId,
    `Known Ids in the scene: ${knownList}${known.length > 10 ? ', ...' : ''}. Verify the Id with list_features, or pin the upstream op's Id with kc.id('<name>'). If the Id was auto-generated, use the explicit kc.id() form so the Id survives across reorderings.`,
  );
}

export function throwQueryUnknownLabel(
  _query: Query<unknown>,
  scene: QueryScene,
  label: string,
  known: readonly string[],
): never {
  const knownList = known.slice(0, 10).join(', ');
  throw new KernelError(
    'query.unknown-label',
    `the filter 'withLabel("${label}")' matched zero lineage entries.`,
    scene.featureId,
    `Labels in scope: ${knownList}${known.length > 10 ? ', ...' : ''}. Verify the label was declared via .faceLabels({ '<label>': '<canonical>' }) on the relevant op, or use a canonical face name (top/bottom/left/right/front/back).`,
  );
}

export function throwQueryIdHierarchyClash(
  name: string,
  existingOp: string,
  featureId: string,
): never {
  throw new KernelError(
    'query.id-hierarchy-clash',
    `the Id '${name}' is already pinned to op '${existingOp}' in this scene.`,
    featureId,
    `Two ops cannot share the same explicit Id at the same hierarchy level. Rename one of the colliding Ids.`,
  );
}

export function throwQueryUnsupportedEntityType(
  query: Query<unknown>,
  scene: QueryScene,
  kind: QueryKind,
): never {
  throw new KernelError(
    'query.unsupported-entity-type',
    `the query '${dsl(query)}' targets entity kind '${kind}'; the Query evaluator does not yet resolve this kind.`,
    scene.featureId,
    `Face-kind queries are supported. The edge / vertex / connector / part / solid branches ship in a follow-up slice once the per-lowerer feature-stamp wiring lands (each primitive / boolean / fillet / extrude needs to stamp its edges with the originating featureId — a separate slice from the evaluator). Recast the query to use kc.q.face(...) until the follow-up ships.`,
  );
}

/** Wrap a sub-query diagnostic raised inside a composed (union / intersection
 *  / subtraction) query under one named code. Strict-mode policy per
 *  D0.16 (c): the outer composition aborts on first sub-query error and the
 *  agent sees `query.composition-strict-failure` regardless of which inner
 *  diagnostic fired. The wrapper quotes the inner code so the agent can
 *  trace the cause without parsing the prose. Use `.asLenient()` on the
 *  outer query to flip to best-effort mode. */
export function throwQueryCompositionStrictFailure(
  outerQuery: Query<unknown>,
  scene: QueryScene,
  innerCode: string,
  innerMessage: string,
): never {
  throw new KernelError(
    'query.composition-strict-failure',
    `the composed query '${dsl(outerQuery)}' failed because a sub-query raised ${innerCode}: ${innerMessage}.`,
    scene.featureId,
    `Composed queries (union / intersection / subtraction) short-circuit on the first sub-query error in strict mode. Either fix the failing sub-query, or annotate the composed query with .asLenient() to allow partial success — failed sub-queries then contribute zero entities and the surviving sub-queries are composed as if the failing branch had returned the empty set.`,
  );
}
