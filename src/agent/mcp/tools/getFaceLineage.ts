// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/getFaceLineage.ts
//
// MCP tool: walk the HistoryMap of a lowered shape and return the chain of
// FaceLineage entries that produced a named face/edge ref. Returns
// `{ chain, usedFallback }` where:
//   - `chain` is an ordered list of `FaceLineageStep`s describing the create
//     and modify ops that touched the ref (this slice ships create/modify;
//     split/delete are deferred to a follow-up since BooleanHistoryResult
//     details are not currently threaded through the recompute pipeline).
//   - `usedFallback` is true when the lowering emitted at least one
//     `feature.created-ref.fallback-used` warning anywhere in the run.

import type { FaceRef, EdgeRef, FeatureKind } from '../../../shared/intent/types';
import type { DiagnosticCode } from '../../../shared/diagnostics/registry';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FaceSnapshot } from '../../../kernel/backends/occt/createdRefs';
import type { HistoryMap } from '../../../kernel/naming/evolutionRecord';
import { runMcpScript } from '../runMcpScript';
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { parseFaceSelector } from '../../../kernel/naming/selectorParser';
import type { Query } from '../../../kernel/naming/query';
import { evaluateQueryOnShape, parseQueryInput } from './evaluateQuery';

export interface GetFaceLineageInput {
  file?: string;
  code?: string;
  /** 'auto' (the default when omitted) = the script's last feature. */
  feature_id?: string;
  ref: string | FaceRef | EdgeRef;
}

export interface FaceLineageStep {
  featureId: string;
  featureKind: FeatureKind;
  op: 'create' | 'modify';
  faceHash?: string;
  slot?: string;
  snapshot?: FaceSnapshot;
  snapshotAtCreate?: FaceSnapshot;
  surfaceType?: string;
}

export interface GetFaceLineageOutput {
  ok: boolean;
  chain?: FaceLineageStep[];
  usedFallback?: boolean;
  error?: string;
  errorCode?: DiagnosticCode | string;
}

type RunScriptSuccess = Extract<Awaited<ReturnType<typeof runMcpScript>>, { ok: true }>['run'];

function parseRefPhase(
  input: GetFaceLineageInput,
  records: RunScriptSuccess['records'],
): { rewriteId: string; slot: string } | { failure: GetFaceLineageOutput } {
  // Parse the ref. String form 'name.slot' → { rewriteId: <feature-with-matching-name>, slot }.
  const parsed = typeof input.ref === 'string'
    ? parseSelector(input.ref, records) ?? parseRecordIdSelector(input.ref, records)
    : { rewriteId: (input.ref as { rewriteId?: string }).rewriteId ?? '', slot: (input.ref as { slot?: string }).slot ?? '' };
  if (!parsed || !parsed.rewriteId) {
    return {
      failure: {
        ok: false,
        error:
          `Unable to parse ref '${String(input.ref)}'. Pass an @kc[<feature-id>/face/<label>] ref ` +
          `(e.g. '@kc[box_1/face/top]', as query/list_faces print them), a '<feature-id>.<label>' selector ` +
          `(e.g. 'box_1.top'), or a named/ordinal selector ('pilot.wall', 'hole1.wall').`,
        errorCode: 'feature.invalid-args',
      },
    };
  }
  return parsed;
}

async function resolveTargetShape(
  run: RunScriptSuccess,
  targetId: string,
): Promise<{ shape: OcctBackend; diagnostics: CompilerDiagnostic[] } | { failure: GetFaceLineageOutput }> {
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });
  const shape = result.shapes.get(targetId);
  if (!shape) {
    return { failure: { ok: false, error: `feature '${targetId}' did not lower.` } };
  }
  if (!(shape instanceof OcctBackend)) {
    return { failure: { ok: false, error: 'Target shape is not an OcctBackend.' } };
  }
  return { shape, diagnostics: result.diagnostics };
}

function collectLineageChain(
  map: HistoryMap | undefined,
  parsed: { rewriteId: string; slot: string },
  records: RunScriptSuccess['records'],
  diagnostics: CompilerDiagnostic[] | undefined,
): { chain: FaceLineageStep[]; usedFallback: boolean } | { failure: GetFaceLineageOutput } {
  // Walk the historyMap of the target shape, collecting every lineage
  // entry whose featureId === parsed.rewriteId. Classify each as create vs
  // modify based on whether its labelName matches the requested slot.
  if (!map) return { failure: { ok: false, error: 'No historyMap on target shape.' } };
  const chain: FaceLineageStep[] = [];
  // A primitive's faces carry only rootFeatureId + canonicalName (no
  // featureId / labelName until a downstream op re-labels them), so match on
  // either pair — otherwise `box_1.top` walked an empty chain and reported ok.
  const kindOf = new Map(records.map((r) => [r.id, r.kind]));
  for (const [hash, lineage] of map.entries()) {
    const owner = lineage.featureId ?? lineage.rootFeatureId;
    if (owner !== parsed.rewriteId) continue;
    const slot = lineage.labelName ?? lineage.canonicalName;
    chain.push({
      featureId: owner,
      featureKind: lineage.featureKind ?? (kindOf.get(owner) as FeatureKind),
      op: slot === parsed.slot ? 'create' : 'modify',
      faceHash: hash,
      slot,
      snapshot: lineage.snapshot,
      snapshotAtCreate: lineage.snapshotAtCreate,
      surfaceType: lineage.surfaceType,
    });
  }
  // Canonical chain ordering — `map.entries()` iterates in insertion-order,
  // which is implementation-defined for the result HistoryMap. Sort by
  // featureId-index against `run.records` (creation order), then break ties
  // on the slot name lexicographically. This guarantees agents reading the
  // chain see a stable, chronological view regardless of how the lowerers
  // happened to build the result map.
  const idIndex = new Map<string, number>();
  for (let i = 0; i < records.length; i++) idIndex.set(records[i].id, i);
  chain.sort((a, b) => {
    const ai = idIndex.get(a.featureId) ?? Number.MAX_SAFE_INTEGER;
    const bi = idIndex.get(b.featureId) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    const as = a.slot ?? '';
    const bs = b.slot ?? '';
    if (as < bs) return -1;
    if (as > bs) return 1;
    return 0;
  });
  // usedFallback is signalled by the resolver via `feature.created-ref.fallback-used`
  // anywhere in the run's diagnostics — the resolver is the authoritative emitter.
  const usedFallback = (diagnostics ?? []).some((d) => d.code === 'feature.created-ref.fallback-used');

  return { chain, usedFallback };
}

export async function getFaceLineageTool(input: GetFaceLineageInput): Promise<GetFaceLineageOutput> {
  const script = await runMcpScript(input);
  if (!script.ok) return { ok: false, error: script.error, errorCode: script.errorCode };
  const { run } = script;

  const targetId = input.feature_id === undefined || input.feature_id === 'auto'
    ? run.records[run.records.length - 1]?.id
    : input.feature_id;
  if (!targetId) return { ok: false, error: 'No features in script.' };
  const target = run.records.find((r) => r.id === targetId);
  if (!target) {
    return {
      ok: false,
      error: `feature_id '${targetId}' not found.`,
      errorCode: 'export.feature-not-found',
    };
  }

  const resolved = await resolveTargetShape(run, targetId);
  if ('failure' in resolved) return resolved.failure;

  const parsed = isTopologyRefString(input.ref)
    ? parseTopologyRef(input, targetId, resolved.shape, run.records)
    : parseRefPhase(input, run.records);
  if ('failure' in parsed) return parsed.failure;

  const collected = collectLineageChain(resolved.shape.historyMap, parsed, run.records, resolved.diagnostics);
  if ('failure' in collected) return collected.failure;

  if (collected.chain.length === 0) {
    return {
      ok: false,
      error: `ref '${String(input.ref)}' names feature '${parsed.rewriteId}', which owns no face on '${targetId}' (consumed by a later op, or not a solid feature).`,
      errorCode: 'feature.face-ref.not-resolvable',
    };
  }
  return { ok: true, chain: collected.chain, usedFallback: collected.usedFallback };
}

function parseSelector(
  s: string,
  records: readonly { id: string; kind: string; metadata?: unknown }[],
): { rewriteId: string; slot: string } | null {
  // Delegate to the canonical face-selector parser used by pickFace /
  // pickEdges so this tool accepts the same surface (named, indexed-named,
  // and ordinal forms) without diverging from the runtime's grammar.
  const parsed = parseFaceSelector(s);
  if (parsed.kind === 'named') {
    const rec = records.find((r) => (r.metadata as { name?: string } | undefined)?.name === parsed.featureName);
    if (!rec) return null;
    return { rewriteId: rec.id, slot: parsed.refName };
  }
  if (parsed.kind === 'ordinal') {
    // Ordinal form (`<kind><N>.<ref>`): match the Nth feature of the given
    // kind in `records` order.
    let n = 0;
    for (const r of records) {
      if (r.kind === parsed.featureKind && ((r.metadata as { name?: string } | undefined)?.name === undefined)) {
        n++;
        if (n === parsed.n) return { rewriteId: r.id, slot: parsed.refName };
      }
    }
    return null;
  }
  // 'collective' form (bare label without a feature qualifier) has no
  // featureId to resolve to; reject so the caller surfaces a useful error.
  return null;
}

/** `<record-id>.<label>` (e.g. `box_1.top`) — the id form `query` prints in
 *  its refs, which the named/ordinal selector grammar does not cover. */
function parseRecordIdSelector(
  s: string,
  records: readonly { id: string }[],
): { rewriteId: string; slot: string } | null {
  const dot = s.lastIndexOf('.');
  if (dot <= 0 || dot === s.length - 1) return null;
  const id = s.slice(0, dot);
  return records.some((r) => r.id === id) ? { rewriteId: id, slot: s.slice(dot + 1) } : null;
}

function isTopologyRefString(ref: GetFaceLineageInput['ref']): ref is string {
  return typeof ref === 'string' && (ref.startsWith('@kc[') || ref.startsWith('@kcq['));
}

/** An @kc[...] / @kcq[...] ref — the form `query` itself returns — resolved
 *  to its one face through the Query evaluator ON THE SAME lowered shape
 *  (face hashes differ between runs), then traced by that face's own lineage
 *  entry (creating feature + slot). */
function parseTopologyRef(
  input: GetFaceLineageInput,
  targetId: string,
  shape: OcctBackend,
  records: RunScriptSuccess['records'],
): { rewriteId: string; slot: string } | { failure: GetFaceLineageOutput } {
  const parsedQuery = parseQueryInput(input.ref as string);
  const r = parsedQuery.ok
    ? evaluateQueryOnShape((parsedQuery as { query: Query<unknown> }).query, 'unique', shape, targetId, records)
    : parsedQuery;
  if (!r.ok) return { failure: { ok: false, error: r.error, ...(r.errorCode !== undefined ? { errorCode: r.errorCode } : {}) } };
  const lineage = shape.historyMap?.get(r.entities[0].handle as Parameters<HistoryMap['get']>[0]);
  const owner = lineage?.featureId ?? lineage?.rootFeatureId;
  const slot = lineage?.labelName ?? lineage?.canonicalName;
  if (owner === undefined || slot === undefined) {
    return { failure: { ok: false, error: `ref '${String(input.ref)}' resolved to a face with no recorded lineage.` } };
  }
  return { rewriteId: owner, slot };
}
