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

import type { FaceRef, EdgeRef, FeatureKind } from '../../shared/intent/types';
import type { DiagnosticCode } from '../../shared/diagnostics/codes';
import type { FaceSnapshot } from '../../kernel/backends/occt/createdRefs';
import { runMcpScript } from '../runMcpScript';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { parseFaceSelector } from '../../kernel/naming/selectorParser';

export interface GetFaceLineageInput {
  file?: string;
  code?: string;
  feature_id: string;  // 'auto' = the script's last feature
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

export async function getFaceLineageTool(input: GetFaceLineageInput): Promise<GetFaceLineageOutput> {
  const script = await runMcpScript(input);
  if (!script.ok) return { ok: false, error: script.error, errorCode: script.errorCode };
  const { run } = script;

  const targetId = input.feature_id === 'auto'
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

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });
  const shape = result.shapes.get(targetId);
  if (!shape) {
    return { ok: false, error: `feature '${targetId}' did not lower.` };
  }
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, error: 'Target shape is not an OcctBackend.' };
  }

  // Parse the ref. String form 'name.slot' → { rewriteId: <feature-with-matching-name>, slot }.
  const parsed = typeof input.ref === 'string'
    ? parseSelector(input.ref, run.records)
    : { rewriteId: (input.ref as { rewriteId?: string }).rewriteId ?? '', slot: (input.ref as { slot?: string }).slot ?? '' };
  if (!parsed || !parsed.rewriteId) {
    return { ok: false, error: `Unable to parse ref '${String(input.ref)}'.` };
  }

  // Walk the historyMap of the target shape, collecting every lineage
  // entry whose featureId === parsed.rewriteId. Classify each as create vs
  // modify based on whether its labelName matches the requested slot.
  const map = shape.historyMap;
  if (!map) return { ok: false, error: 'No historyMap on target shape.' };
  const chain: FaceLineageStep[] = [];
  for (const [hash, lineage] of map.entries()) {
    if (lineage.featureId !== parsed.rewriteId) continue;
    chain.push({
      featureId: lineage.featureId,
      featureKind: lineage.featureKind!,
      op: lineage.labelName === parsed.slot ? 'create' : 'modify',
      faceHash: hash,
      slot: lineage.labelName,
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
  for (let i = 0; i < run.records.length; i++) idIndex.set(run.records[i].id, i);
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
  const usedFallback = (result.diagnostics ?? []).some((d) => d.code === 'feature.created-ref.fallback-used');

  return { ok: true, chain, usedFallback };
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
