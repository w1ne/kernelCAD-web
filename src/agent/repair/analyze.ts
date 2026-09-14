// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One pass that produces everything trace-guided repair needs: the capture
// graph, the lowered shapes, the diagnostics, and the script text they all
// point back into. `why_did_this_fail` and `repair_script` share it so the
// region an agent is shown is the same region the repair is bounded by.

import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ShapeBackend } from '../../kernel/backends/backend';
import { loadMcpScriptSource, runMcpScript, type McpScriptInput } from '../mcp/runMcpScript';
import { ScriptSpanIndex } from './scriptSpans';
import { buildFeatureTrace, computeRepairRegion } from './trace';
import { deriveCandidates, type CandidateContext } from './candidates';
import {
  diagnosticId,
  type CandidateStatus,
  type FeatureTraceEntry,
  type RepairCandidate,
  type RepairRegion,
} from './types';

export interface ScriptAnalysis {
  ok: true;
  fileName: string;
  source: string;
  spans: ScriptSpanIndex;
  records: readonly FeatureRecord[];
  recordsById: Map<string, FeatureRecord>;
  trace: FeatureTraceEntry[];
  diagnostics: CompilerDiagnostic[];
  health: ReadonlyMap<string, 'healthy' | 'warning' | 'error'>;
  shapes: ReadonlyMap<string, ShapeBackend>;
}

export type AnalyzeScriptResult =
  | ScriptAnalysis
  | { ok: false; error: string; errorCode?: string };

/** Run a script, lower it, and join the result back to its source text. */
export async function analyzeScript(input: McpScriptInput): Promise<AnalyzeScriptResult> {
  const source = await loadMcpScriptSource(input);
  if (!source.ok) return source;

  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });

  const spans = ScriptSpanIndex.parse(source.code, script.fileName);
  const trace = buildFeatureTrace({
    records: run.records,
    source: source.code,
    fileName: script.fileName,
    health: result.health,
    diagnostics: result.diagnostics,
    spans,
  });

  return {
    ok: true,
    fileName: script.fileName,
    source: source.code,
    spans,
    records: run.records,
    recordsById: new Map(run.records.map(record => [record.id, record])),
    trace,
    diagnostics: result.diagnostics,
    health: result.health,
    shapes: result.shapes,
  };
}

export interface SelectedDiagnostic {
  id: string;
  diagnostic: CompilerDiagnostic;
}

/**
 * Resolve a diagnostic selector against an analysis.
 *
 * `'first-error'` (the default) takes the first error-severity diagnostic in
 * emit order — the one an agent reading `evaluate_script` output would act on
 * first. Anything else is matched as an explicit diagnostic id.
 *
 * Ids are always derived from the FULL diagnostic list, never from a narrowed
 * view: `why_did_this_fail` scopes the search to one feature chain and
 * `repair_script` does not, and an id handed from one to the other has to name
 * the same diagnostic in both. `scope` therefore narrows what is eligible
 * without shifting any id.
 */
export function selectDiagnostic(
  diagnostics: readonly CompilerDiagnostic[],
  selector: string | undefined,
  scope?: (diagnostic: CompilerDiagnostic) => boolean,
): SelectedDiagnostic | undefined {
  const eligible = diagnostics
    .map((diagnostic, index) => ({ id: diagnosticId(diagnostic, index), diagnostic }))
    .filter(entry => scope === undefined || scope(entry.diagnostic));
  if (selector === undefined || selector === 'first-error') {
    return eligible.find(entry => entry.diagnostic.severity === 'error');
  }
  return eligible.find(entry => entry.id === selector);
}

export interface RepairPlan {
  diagnosticId: string;
  diagnostic: CompilerDiagnostic;
  repairRegion: RepairRegion;
  candidates: RepairCandidate[];
  candidateStatus: CandidateStatus;
  /** Populated when `candidateStatus` is `'no-automatic-candidate'`. */
  reason?: string;
}

/**
 * Turn a selected diagnostic into a bounded region plus ranked candidates.
 *
 * A diagnostic with no feature attribution cannot be bounded to a modeling
 * step, so it gets an empty region and says so rather than offering the whole
 * file as editable.
 */
export function planRepair(
  analysis: ScriptAnalysis,
  selected: SelectedDiagnostic,
): RepairPlan {
  const featureId = selected.diagnostic.featureId;
  const record = featureId === undefined ? undefined : analysis.recordsById.get(featureId);

  if (featureId === undefined || record === undefined) {
    return {
      diagnosticId: selected.id,
      diagnostic: selected.diagnostic,
      repairRegion: { file: analysis.fileName, ranges: [] },
      candidates: [],
      candidateStatus: 'no-automatic-candidate',
      reason:
        'The diagnostic is not attributed to a captured feature, so no script region can be bounded for it.',
    };
  }

  const repairRegion = computeRepairRegion({
    trace: analysis.trace,
    featureId,
    fileName: analysis.fileName,
    spans: analysis.spans,
  });

  const context: CandidateContext = {
    diagnostic: selected.diagnostic,
    diagnosticId: selected.id,
    record,
    recordsById: analysis.recordsById,
    spans: analysis.spans,
    shapes: analysis.shapes,
  };
  const candidates = deriveCandidates(context).filter(candidate =>
    isInsideRegion(repairRegion, candidate),
  );

  if (candidates.length === 0) {
    return {
      diagnosticId: selected.id,
      diagnostic: selected.diagnostic,
      repairRegion,
      candidates: [],
      candidateStatus: 'no-automatic-candidate',
      reason: `No mechanical fix is derivable for ${selected.diagnostic.code} on a '${record.kind}' feature. The region above is the bounded set of lines to edit.`,
    };
  }

  return {
    diagnosticId: selected.id,
    diagnostic: selected.diagnostic,
    repairRegion,
    candidates,
    candidateStatus: 'candidates',
  };
}

function isInsideRegion(region: RepairRegion, candidate: RepairCandidate): boolean {
  return region.ranges.some(
    range =>
      candidate.patch.startLine >= range.startLine &&
      candidate.patch.endLine <= range.endLine,
  );
}
