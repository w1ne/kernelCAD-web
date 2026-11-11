// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// dfm_fix_recheck: run dfm_review, apply at most one safe feature-parameter
// edit, run the same review again, and report before/after. The script is
// returned as new_code. Nothing is written.

import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { planFeatureParamEdit, type FeatureParamChange } from '../edits/featureParamEdit';
import { loadMcpScriptSource, runMcpScript } from '../runMcpScript';
import {
  DFM_FIX_RECHECK_MAX_APPLIES,
  planDfmAutoFix,
  type DfmAutoFixKind,
  type DfmAutoFixPlan,
  type DfmFixSuggestion,
} from './dfmAutoFix';
import { dfmReviewTool, type DfmReviewInput, type DfmReviewOutput } from './dfmReview';
import { invalidArgsText } from '../../../shared/intent/invalidArgs';
import type { DfmProcess } from './dfmReviewChecks';

export interface DfmFixRecheckInput extends DfmReviewInput {
  /** One process. Use `processes` for several. Not both. */
  process?: DfmProcess;
  /** Recorded on the report. Does not change the numeric gates. */
  material?: string;
  /** dfm_review check id to fix, e.g. 'fdm.min-wall'. */
  finding_id?: string;
  /** A dfm.* diagnostic code, or the same check id as finding_id. */
  diagnostic_code?: string;
}

export interface DfmFinding {
  id: string;
  process: string;
  part: string;
  status: 'fail' | 'warn' | 'not-checked';
  summary: string;
  value?: number;
  limit?: number;
  unit?: DfmReviewOutput['checks'][number]['unit'];
  op?: DfmReviewOutput['checks'][number]['op'];
  source?: string;
  refs?: string[];
}

export interface DfmFixSnapshot {
  verdict?: 'pass' | 'fail' | 'not-checked';
  findings: DfmFinding[];
}

export interface DfmFixChange extends DfmAutoFixPlan {
  sourceBefore?: string;
  sourceAfter?: string;
  line?: number;
  changedParams: FeatureParamChange[];
}

export interface DfmFixRecheckOutput {
  ok: boolean;
  applied: boolean;
  status: 'applied' | 'no-safe-fix' | 'invalid';
  processes: string[];
  material?: string;
  before: DfmFixSnapshot;
  after?: DfmFixSnapshot;
  cleared: Array<{ id: string; part: string; was: 'fail' | 'warn' | 'not-checked' }>;
  remaining: DfmFinding[];
  suggestions: DfmFixSuggestion[];
  change?: DfmFixChange;
  /** Revised source. Present only when applied is true. The caller persists it. */
  new_code?: string;
  refusal?: string;
  diagnostics: CompilerDiagnostic[];
  error?: string;
  bounds: { maxApplies: number; appliedCount: number };
}

const PROCESSES: readonly DfmProcess[] = ['fdm', 'cnc', 'sheet-metal', 'injection-molding'];

function bounds(appliedCount: number): DfmFixRecheckOutput['bounds'] {
  return { maxApplies: DFM_FIX_RECHECK_MAX_APPLIES, appliedCount };
}

function findingKey(f: { id: string; part: string }): string {
  return `${f.part}\0${f.id}`;
}

function isOpenReviewFinding(
  c: DfmReviewOutput['checks'][number],
): c is DfmReviewOutput['checks'][number] & { status: 'fail' | 'warn' | 'not-checked' } {
  return c.status === 'fail' || c.status === 'warn' || c.status === 'not-checked';
}

function snapshot(review: DfmReviewOutput): DfmFixSnapshot {
  return {
    ...(review.verdict !== undefined ? { verdict: review.verdict } : {}),
    findings: review.checks
      .filter(isOpenReviewFinding)
      .map(c => ({
        id: c.id,
        process: c.process,
        part: c.part,
        status: c.status,
        summary: c.summary,
        ...(c.value !== undefined ? { value: c.value } : {}),
        ...(c.limit !== undefined ? { limit: c.limit } : {}),
        ...(c.unit !== undefined ? { unit: c.unit } : {}),
        ...(c.op !== undefined ? { op: c.op } : {}),
        ...(c.source !== undefined ? { source: c.source } : {}),
        ...(c.refs !== undefined ? { refs: c.refs } : {}),
      })),
  };
}

function clearedOf(before: readonly DfmFinding[], after: readonly DfmFinding[]): DfmFixRecheckOutput['cleared'] {
  const still = new Set(after.map(findingKey));
  return before
    .filter(f => !still.has(findingKey(f)))
    .map(f => ({ id: f.id, part: f.part, was: f.status }));
}

const INVALID_API = 'dfm_fix_recheck({ ... })';
const INVALID_EXAMPLE = "dfm_fix_recheck({ code, processes: ['fdm'], finding_id: 'fdm.min-wall' })";

function invalid(message: string, processes: string[] = []): DfmFixRecheckOutput {
  const { message: formatted, hint } = invalidArgsText({
    api: INVALID_API,
    path: '',
    gotText: message,
    requires: 'a script (code or file) plus optional DFM review gates and at most one finding_id/diagnostic_code',
    example: INVALID_EXAMPLE,
    code: 'cli.invalid-args',
  });
  return {
    ok: false,
    applied: false,
    status: 'invalid',
    processes,
    before: { findings: [] },
    cleared: [],
    remaining: [],
    suggestions: [],
    diagnostics: [{
      target: 'export-occt',
      code: 'cli.invalid-args',
      severity: 'error',
      message: formatted,
      hint,
    }],
    error: formatted,
    refusal: formatted,
    bounds: bounds(0),
  };
}

function validate(input: DfmFixRecheckInput): string | undefined {
  if (input.file === undefined && input.code === undefined) return 'Provide { file } or { code }.';
  if (input.process !== undefined && input.processes !== undefined) return 'Pass process or processes, not both.';
  if (input.process !== undefined && !PROCESSES.includes(input.process)) {
    return `process must be one of ${PROCESSES.join(', ')}.`;
  }
  if (input.material !== undefined && (typeof input.material !== 'string' || input.material.trim() === '' || input.material.length > 64)) {
    return 'material must be a short string (recorded only; it does not change the gates).';
  }
  if (input.finding_id !== undefined && typeof input.finding_id !== 'string') return 'finding_id must be a string.';
  if (input.diagnostic_code !== undefined && typeof input.diagnostic_code !== 'string') return 'diagnostic_code must be a string.';
  return undefined;
}

/** DFM review gates copied from dfm_fix_recheck onto the inner dfm_review call. */
const REVIEW_GATE_KEYS = [
  'nozzle_mm', 'max_overhang_deg', 'max_bridge_mm', 'printer', 'build_direction',
  'tool_diameter_mm', 'approach_axes', 'max_undercut_area_mm2',
  'min_bend_radius_ratio', 'hole_to_bend_thicknesses', 'hole_to_edge_thicknesses',
  'min_flange_thicknesses', 'pull_direction', 'min_draft_deg',
  'min_wall_mm', 'max_wall_mm', 'max_wall_ratio', 'min_radius_mm',
] as const satisfies ReadonlyArray<keyof DfmReviewInput>;

function reviewInput(input: DfmFixRecheckInput, code: string): DfmReviewInput {
  const processes = input.process !== undefined ? [input.process] : input.processes;
  const out: DfmReviewInput = { code };
  if (processes !== undefined) out.processes = processes;
  for (const key of REVIEW_GATE_KEYS) {
    const value = input[key];
    if (value !== undefined) Object.assign(out, { [key]: value });
  }
  return out;
}

function withMaterial(input: DfmFixRecheckInput, out: DfmFixRecheckOutput): DfmFixRecheckOutput {
  return input.material !== undefined ? { ...out, material: input.material } : out;
}

function notApplied(
  input: DfmFixRecheckInput,
  before: DfmReviewOutput,
  suggestions: DfmFixSuggestion[],
  refusal: string | undefined,
  diagnostics: CompilerDiagnostic[],
): DfmFixRecheckOutput {
  const snap = snapshot(before);
  return withMaterial(input, {
    ok: true,
    applied: false,
    status: 'no-safe-fix',
    processes: before.processes,
    before: snap,
    cleared: [],
    remaining: snap.findings,
    suggestions,
    ...(refusal !== undefined ? { refusal } : {}),
    diagnostics,
    bounds: bounds(0),
  });
}

function changeOf(plan: DfmAutoFixPlan, edited: { edits: { sourceBefore: string; sourceAfter: string; line: number }[]; changedParams: FeatureParamChange[] }): DfmFixChange {
  const edit = edited.edits[0];
  return {
    ...plan,
    ...(edit !== undefined ? { sourceBefore: edit.sourceBefore, sourceAfter: edit.sourceAfter, line: edit.line } : {}),
    changedParams: edited.changedParams,
  };
}

export async function dfmFixRecheckTool(input: DfmFixRecheckInput): Promise<DfmFixRecheckOutput> {
  const bad = validate(input);
  if (bad !== undefined) return invalid(bad);

  const source = await loadMcpScriptSource({ file: input.file, code: input.code });
  if (!source.ok) return invalid(source.error);

  const options = reviewInput(input, source.code);
  const before = await dfmReviewTool(options);
  if (!before.ok && before.checks.length === 0) {
    const message = before.error ?? before.diagnostics[0]?.message ?? 'DFM review did not run.';
    return withMaterial(input, {
      ok: false,
      applied: false,
      status: 'invalid',
      processes: before.processes,
      before: snapshot(before),
      cleared: [],
      remaining: [],
      suggestions: [],
      diagnostics: before.diagnostics,
      error: message,
      refusal: message,
      bounds: bounds(0),
    });
  }

  const captured = await runMcpScript({ code: source.code });
  if (!captured.ok) return invalid(captured.error, before.processes);

  const selection = planDfmAutoFix({
    checks: before.checks,
    records: captured.run.records,
    ...(input.finding_id !== undefined ? { findingId: input.finding_id } : {}),
    ...(input.diagnostic_code !== undefined ? { diagnosticCode: input.diagnostic_code } : {}),
  });
  if (selection.plan === undefined) {
    return notApplied(input, before, selection.suggestions, selection.refusal, before.diagnostics);
  }

  const plan = selection.plan;
  const edited = await planFeatureParamEdit({
    code: source.code,
    feature: plan.feature,
    changes: { [plan.param]: plan.after },
  });
  if (!edited.ok) {
    return notApplied(
      input,
      before,
      selection.suggestions,
      `No safe auto-fix kept: ${edited.error}`,
      before.diagnostics,
    );
  }

  const after = await dfmReviewTool({ ...options, code: edited.new_code });
  if (!after.ok && after.checks.length === 0) {
    return notApplied(
      input,
      before,
      selection.suggestions,
      `The edit to ${plan.feature}.${plan.param} (${plan.before} → ${plan.after}) did not evaluate, so the script was left unchanged.`,
      after.diagnostics,
    );
  }

  const beforeSnap = snapshot(before);
  const afterSnap = snapshot(after);
  const remainingKeys = new Set(afterSnap.findings.map(findingKey));
  return withMaterial(input, {
    ok: true,
    applied: true,
    status: 'applied',
    processes: before.processes,
    before: beforeSnap,
    after: afterSnap,
    cleared: clearedOf(beforeSnap.findings, afterSnap.findings),
    remaining: afterSnap.findings,
    suggestions: selection.suggestions.filter(s => remainingKeys.has(findingKey(s))),
    change: changeOf(plan, edited),
    new_code: edited.new_code,
    diagnostics: after.diagnostics,
    bounds: bounds(1),
  });
}

export type { DfmAutoFixKind };
