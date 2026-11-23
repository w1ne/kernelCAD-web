// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Partial round for the default every-edge fillet/chamfer (#1612). When no
 * size builds on every sharp edge together, the edges that do build together
 * are rounded and the rest are reported by stable ID and reason. Every
 * candidate goes through the caller's validated attempt, so the result is a
 * valid solid; an empty subset falls back to the refusal.
 *
 * Runs only on the failure path, after the max-feasible probe found no size.
 */
import type { Edge } from 'replicad';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { describeEdges } from './limitingEdges';

/** Bound on the per-edge search (one solo attempt per edge, then at most one
 *  growing attempt per edge). Larger selections are refused as before. */
export const MAX_PARTIAL_EDGE_SEARCH = 96;

/** Edges listed by locator in the hint. */
const MAX_LISTED_SKIPPED_EDGES = 6;

/** `.fillet(r)` / `.chamfer(d)` with no edge or face selector: every sharp edge. */
export function isEveryEdgeSelection(r: FeatureRecord): boolean {
  return r.inputs.edges === undefined && r.inputs.face === undefined;
}

export interface BlendableSubset<R> {
  result: R;
  rounded: Edge[];
  /** Rejected even alone at the requested size. */
  failAlone: Edge[];
  /** Built alone, but not together with the rounded edges. */
  conflicting: Edge[];
}

/**
 * The largest set of `edges` found to build together: the edges that build
 * alone, all at once, else grown one edge at a time in selection order.
 * `attempt` returns the validated result or undefined; `discard` frees a
 * superseded result. Undefined when nothing builds or over the bound.
 */
export function roundBlendableSubset<R>(
  edges: readonly Edge[],
  attempt: (subset: Edge[]) => R | undefined,
  discard: (result: R) => void,
): BlendableSubset<R> | undefined {
  if (edges.length > MAX_PARTIAL_EDGE_SEARCH) return undefined;
  const failAlone: Edge[] = [];
  const candidates: Edge[] = [];
  for (const e of edges) {
    const alone = attempt([e]);
    if (alone === undefined) failAlone.push(e);
    else {
      discard(alone);
      candidates.push(e);
    }
  }
  if (candidates.length === 0) return undefined;
  const together = attempt(candidates);
  if (together !== undefined) return { result: together, rounded: candidates, failAlone, conflicting: [] };
  let best: R | undefined;
  const rounded: Edge[] = [];
  const conflicting: Edge[] = [];
  for (const e of candidates) {
    const grown = attempt([...rounded, e]);
    if (grown === undefined) {
      conflicting.push(e);
      continue;
    }
    if (best !== undefined) discard(best);
    best = grown;
    rounded.push(e);
  }
  return best === undefined ? undefined : { result: best, rounded, failAlone, conflicting };
}

const fmtMm = (v: number): string => String(Number(v.toPrecision(4)));

/** The warn that lists the skipped edges. `baseEdges` is the edge set of the
 *  feature's input, so a selector is offered only for an edge that exists there. */
export function skippedEdgesDiagnostic(
  r: FeatureRecord,
  op: { kind: 'fillet' | 'chamfer'; value: number },
  selected: number,
  subset: BlendableSubset<unknown>,
  baseEdges: readonly Edge[],
): CompilerDiagnostic {
  const param = op.kind === 'fillet' ? 'radius' : 'distance';
  const baseRef = r.inputs.base;
  const baseId = baseRef?.kind === 'feature' ? baseRef.id : undefined;
  const skipped = [
    ...describeEdges(subset.failAlone, baseEdges, baseId).map((e) => ({ ...e, why: 'rejected alone' })),
    ...describeEdges(subset.conflicting, baseEdges, baseId).map((e) => ({ ...e, why: 'conflicts with the rounded edges' })),
  ];
  const listed = skipped.slice(0, MAX_LISTED_SKIPPED_EDGES).map((e) => `${e.ref ?? e.id} (${e.locator}; ${e.why})`).join('; ');
  const more = skipped.length > MAX_LISTED_SKIPPED_EDGES ? `; and ${skipped.length - MAX_LISTED_SKIPPED_EDGES} more` : '';
  return {
    target: 'export-occt',
    code: 'feature.edge-feature.unblendable-edges-skipped',
    featureId: r.id,
    severity: 'warn',
    message: `${op.kind} rounded ${subset.rounded.length} of ${selected} edges at ${param} ${fmtMm(op.value)} mm and skipped ${skipped.length}: no ${param} builds on every edge together (${subset.failAlone.length} rejected alone, ${subset.conflicting.length} conflict with the rounded edges).`,
    hint: `Skipped edges: ${listed}${more}. They usually sit where faces meet tangentially or where a union left coincident faces. Round them with an explicit edge selection and a smaller ${param}, or change the geometry there; the rest of the part is rounded.`,
    nextAction: { kind: 'rewrite-feature', guidance: 'round the skipped edges separately or change the geometry where they meet' },
    details: {
      param,
      requestedValue: op.value,
      edgeCount: selected,
      roundedEdgeCount: subset.rounded.length,
      skippedEdgeCount: skipped.length,
      skippedFailAloneCount: subset.failAlone.length,
      skippedConflictCount: subset.conflicting.length,
      skippedEdgeIds: skipped.map((e) => e.id).join(','),
    },
  };
}
