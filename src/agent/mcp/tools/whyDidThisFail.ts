// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/whyDidThisFail.ts
//
// Walk the upstream chain of a failing feature. Returns the diagnostics
// array of the requested feature and the diagnostics of every upstream
// feature in topological order, ending with the requested feature.
//
// Per-code hints are now inline on every diagnostic (Phase 1/2 of the
// vocabulary collapse), so this tool no longer carries an HINTS map.
// Agents can call list_diagnostic_codes for the full catalogue.

import type { FeatureKind } from '../../../shared/intent/types';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { analyzeScript, planRepair, selectDiagnostic, type ScriptAnalysis } from '../../repair/analyze';
import type {
  CandidateStatus,
  FeatureTraceEntry,
  RepairCandidate,
  RepairRegion,
} from '../../repair/types';

export interface WhyDidThisFailInput {
  file?: string;
  code?: string;
  feature_id?: string;
  /**
   * Which diagnostic to plan a repair for. A diagnostic id from a previous
   * response, or `'first-error'` (the default) for the first error-severity
   * diagnostic on the requested feature's chain.
   */
  diagnostic?: string;
}

export interface ChainEntry {
  feature_id: string;
  kind: FeatureKind;
  health: 'healthy' | 'warning' | 'error' | 'unknown';
  diagnostics: CompilerDiagnostic[];
}

export interface WhyDidThisFailOutput {
  ok: boolean;
  feature_id?: string;
  /**
   * Topologically ordered chain ending at the requested feature_id.
   * Each entry: the feature's id, kind, health, and diagnostics array.
   * The requested feature is the last entry. Walk in reverse to find
   * the root cause.
   */
  chain?: ChainEntry[];
  /**
   * Every captured feature joined to the script that authored it: call-site
   * location, AST node range, attached diagnostics, upstream inputs and
   * downstream dependents. This is the link that turns "feature X failed"
   * into "these lines produced it and these features depend on it".
   */
  trace?: FeatureTraceEntry[];
  /**
   * The minimal set of line ranges whose edit can address the failure: the
   * failing feature's statement, the statements that authored its direct
   * inputs, and the `param(...)` declarations it reads. `repair_script`
   * refuses any patch that falls outside these ranges.
   */
  repairRegion?: RepairRegion;
  /**
   * Ordered concrete fixes for the selected diagnostic. Each carries a real
   * AST-anchored patch plus the geometry it was derived from. Empty when
   * `candidateStatus` is `'no-automatic-candidate'`.
   */
  candidates?: RepairCandidate[];
  /** `'candidates'` when a mechanical fix was derivable; otherwise
   *  `'no-automatic-candidate'` and `repairRegion` alone is the answer. */
  candidateStatus?: CandidateStatus;
  /** Why no candidate was derivable (only with `'no-automatic-candidate'`). */
  candidateReason?: string;
  /** Id of the diagnostic the repair plan targets. Pass it to `repair_script`
   *  as `diagnostic` to act on exactly this one. */
  targetDiagnosticId?: string;
  error?: string;
  /**
   * Structured diagnostic code when the underlying script-runtime
   * exception was a `KernelError`; otherwise `cli.script-exception` for
   * non-kernel throws. Only set on `ok=false` from the runScript catch path.
   */
  errorCode?: string;
}

export async function whyDidThisFailTool(input: WhyDidThisFailInput): Promise<WhyDidThisFailOutput> {
  const analysis = await analyzeScript(input);
  if (!analysis.ok) return analysis;
  const { records, diagnostics, health, shapes } = analysis;

  if (records.length === 0) return { ok: false, error: 'Script produced no features.' };

  const targetId = input.feature_id ?? records[records.length - 1].id;
  const targetRecord = records.find(r => r.id === targetId);
  if (!targetRecord) return { ok: false, error: `feature_id '${targetId}' not found.` };

  const upstreamIds = collectUpstreamIds(targetRecord, records);
  const chain = buildChain(records, targetId, upstreamIds, diagnostics, health, shapes);
  return planRepairResponse(analysis, input, targetId, chain, diagnostics);
}

function collectUpstreamIds(
  targetRecord: FeatureRecord,
  records: readonly FeatureRecord[],
): Set<string> {
  // Collect upstream feature ids reachable from the target via input edges.
  // The walk is BFS so every transitive predecessor is included; the final
  // emit order is then re-sorted by record-array index to give a topological
  // ordering (records are already in declaration order, which is a valid
  // topological order since features can only reference earlier-declared ids).
  const upstreamIds = new Set<string>();
  const queue: string[] = [];
  for (const ref of Object.values(targetRecord.inputs)) {
    // W1.3: 'surface' refs point to a SurfaceRecord (not a FeatureRecord),
    // so there's no upstream Feature to walk through. Skip.
    const upId =
      ref.kind === 'surface'
        ? undefined
        : ref.kind === 'feature'
          ? ref.id
          : ref.featureId;
    if (upId && !upstreamIds.has(upId)) {
      upstreamIds.add(upId);
      queue.push(upId);
    }
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    const rec = records.find(r => r.id === id);
    if (!rec) continue;
    for (const ref of Object.values(rec.inputs)) {
      // W1.3: 'surface' refs point to a SurfaceRecord (not a FeatureRecord),
      // so there's no upstream Feature to walk through. Skip.
      const upId =
        ref.kind === 'surface'
          ? undefined
          : ref.kind === 'feature'
            ? ref.id
            : ref.featureId;
      if (upId && !upstreamIds.has(upId)) {
        upstreamIds.add(upId);
        queue.push(upId);
      }
    }
  }
  return upstreamIds;
}

function buildChain(
  records: readonly FeatureRecord[],
  targetId: string,
  upstreamIds: ReadonlySet<string>,
  diagnostics: CompilerDiagnostic[],
  health: ScriptAnalysis['health'],
  shapes: ScriptAnalysis['shapes'],
): ChainEntry[] {
  const chain: ChainEntry[] = [];
  for (const rec of records) {
    if (rec.id !== targetId && !upstreamIds.has(rec.id)) continue;
    const featureDiags = diagnostics.filter(d => d.featureId === rec.id);
    chain.push({
      feature_id: rec.id,
      kind: rec.kind,
      health: health.get(rec.id) ?? (shapes.has(rec.id) ? 'healthy' : 'unknown'),
      diagnostics: withNextActions(featureDiags),
    });
  }
  return chain;
}

function planRepairResponse(
  analysis: ScriptAnalysis,
  input: WhyDidThisFailInput,
  targetId: string,
  chain: ChainEntry[],
  diagnostics: CompilerDiagnostic[],
): WhyDidThisFailOutput {
  // Repair planning targets the first error on the chain by default: an agent
  // reading this response is looking at one failure, and the root cause is
  // upstream of the requested feature far more often than on it.
  const chainIds = new Set(chain.map(entry => entry.feature_id));
  const selected = selectDiagnostic(
    diagnostics,
    input.diagnostic,
    d => d.featureId !== undefined && chainIds.has(d.featureId),
  );

  if (selected === undefined) {
    return { ok: true, feature_id: targetId, chain, trace: analysis.trace };
  }

  const plan = planRepair(analysis, selected);
  return {
    ok: true,
    feature_id: targetId,
    chain,
    trace: analysis.trace,
    targetDiagnosticId: plan.diagnosticId,
    repairRegion: plan.repairRegion,
    candidates: plan.candidates,
    candidateStatus: plan.candidateStatus,
    ...(plan.reason !== undefined ? { candidateReason: plan.reason } : {}),
  };
}
