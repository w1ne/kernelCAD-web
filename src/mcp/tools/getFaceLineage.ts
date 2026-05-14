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

import type { FaceRef, EdgeRef, FeatureKind } from '../../intent/types';
import type { DiagnosticCode } from '../../diagnostics/codes';
import type { FaceSnapshot } from '../../backends/occt/createdRefs';
import { runMcpScript } from '../runMcpScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { createOcctLowerer } from '../../backends/occt/occtLowerer';
import { OcctBackend } from '../../backends/occt/occtBackend';

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
  // usedFallback is signalled by the resolver via `feature.created-ref.fallback-used`
  // anywhere in the run's diagnostics — the resolver is the authoritative emitter.
  const usedFallback = (result.diagnostics ?? []).some((d) => d.code === 'feature.created-ref.fallback-used');

  return { ok: true, chain, usedFallback };
}

function parseSelector(
  s: string,
  records: readonly { id: string; metadata?: unknown }[],
): { rewriteId: string; slot: string } | null {
  const m = s.match(/^([a-zA-Z][\w-]*)\.([a-z][a-z0-9-]*)$/);
  if (!m) return null;
  const [, name, slot] = m;
  const rec = records.find((r) => (r.metadata as { name?: string } | undefined)?.name === name);
  return rec ? { rewriteId: rec.id, slot } : null;
}
