// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/repairScript.ts
//
// Bounded auto-repair: take a diagnostic, take the candidates derived for it,
// apply them one at a time, and keep the first that clears the diagnostic
// without breaking anything else.
//
// Two properties make this safe enough to run unattended:
//   1. every patch is bound to the repair region, so a wrong fix cannot reach
//      geometry the agent was not reasoning about;
//   2. acceptance is measured by RE-EVALUATION, not by the patch applying —
//      a candidate that applies cleanly but leaves the model broken is rejected
//      and the next one is tried.
// Like every other source-edit tool, this returns the modified source; the
// caller decides whether to persist it.

import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import { analyzeScript, planRepair, selectDiagnostic, type RepairPlan } from '../../repair/analyze';
import { applyRepairPatch, formatPatchDiff } from '../../repair/applyPatch';
import type {
  CandidateStatus,
  RepairCandidate,
  RepairRegion,
} from '../../repair/types';
import { evaluateScriptTool } from './evaluateScript';
import type { FeatureHealthEntry } from '../../cli/commands/evaluate';

export type RepairStrategy = 'apply-first' | 'try-all' | 'dry-run';

export interface RepairScriptInput {
  file?: string;
  code?: string;
  /** Diagnostic id from `why_did_this_fail`, or `'first-error'` (default). */
  diagnostic?: string;
  /** `'try-all'` (default) walks the candidate list until one clears the
   *  diagnostic; `'apply-first'` applies only the top candidate;
   *  `'dry-run'` derives and previews patches without evaluating anything. */
  strategy?: RepairStrategy;
  /** Upper bound on candidates attempted. Default 3. */
  max_attempts?: number;
}

export interface RepairHealthSnapshot {
  ok: boolean;
  featureHealth: FeatureHealthEntry[];
  diagnostics: CompilerDiagnostic[];
}

export interface RepairAttempt {
  candidateId: string;
  /** False when the patch was refused (out of region / source drift). */
  applied: boolean;
  /** Evaluation verdict after the patch. Absent for a refused patch. */
  ok?: boolean;
  /** True when the targeted diagnostic is gone from the re-evaluation. */
  clearedDiagnostic?: boolean;
  /** Error-severity codes present after the patch that were not there before. */
  newErrorCodes?: string[];
  accepted: boolean;
  /** Why the attempt was refused or rejected. */
  diagnostic?: CompilerDiagnostic;
}

export interface RepairScriptOutput {
  ok: boolean;
  strategy: RepairStrategy;
  /** The diagnostic this run targeted. */
  target?: { id: string; code: string; featureId?: string; message: string };
  repairRegion?: RepairRegion;
  candidates: RepairCandidate[];
  candidateStatus?: CandidateStatus;
  candidateReason?: string;
  attempts: RepairAttempt[];
  /** Candidate id that was accepted (absent when nothing was). */
  applied?: string;
  /** Repaired source. Caller persists it. */
  new_code?: string;
  /** Unified diff of the accepted patch (or, for a dry run, of each candidate
   *  in `candidates` order — the first one). */
  diff?: string;
  before?: RepairHealthSnapshot;
  after?: RepairHealthSnapshot;
  error?: string;
  errorCode?: string;
  /** Structured failure diagnostic when repair could not complete. */
  diagnostics?: CompilerDiagnostic[];
}

const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * MCP `repair_script` tool — turn a diagnostic into an applied, verified fix.
 *
 * One-of `{ file }` / `{ code }`. Never writes to disk and never edits outside
 * the repair region `why_did_this_fail` computes for the same diagnostic.
 */
export async function repairScriptTool(input: RepairScriptInput): Promise<RepairScriptOutput> {
  const strategy: RepairStrategy = input.strategy ?? 'try-all';
  const maxAttempts = normalizeMaxAttempts(input.max_attempts);

  const analysis = await analyzeScript(input);
  if (!analysis.ok) {
    return { ok: false, strategy, candidates: [], attempts: [], error: analysis.error, ...(analysis.errorCode !== undefined ? { errorCode: analysis.errorCode } : {}) };
  }

  const selected = selectDiagnostic(analysis.diagnostics, input.diagnostic);
  if (selected === undefined) {
    return {
      ok: false,
      strategy,
      candidates: [],
      attempts: [],
      error:
        input.diagnostic === undefined || input.diagnostic === 'first-error'
          ? 'No error-severity diagnostic to repair — the script already evaluates clean.'
          : `No diagnostic with id '${input.diagnostic}' in this evaluation.`,
    };
  }

  const plan = planRepair(analysis, selected);
  const target = {
    id: plan.diagnosticId,
    code: plan.diagnostic.code,
    ...(plan.diagnostic.featureId !== undefined ? { featureId: plan.diagnostic.featureId } : {}),
    message: plan.diagnostic.message,
  };
  const base = {
    strategy,
    target,
    repairRegion: plan.repairRegion,
    candidates: plan.candidates,
    candidateStatus: plan.candidateStatus,
  };

  if (plan.candidateStatus === 'no-automatic-candidate') {
    return {
      ok: false,
      ...base,
      candidates: [],
      ...(plan.reason !== undefined ? { candidateReason: plan.reason } : {}),
      attempts: [],
      diagnostics: [noCandidateDiagnostic(plan.diagnostic, plan.reason)],
    };
  }

  const attemptable = strategy === 'apply-first'
    ? plan.candidates.slice(0, 1)
    : plan.candidates.slice(0, maxAttempts);

  if (strategy === 'dry-run') {
    return {
      ok: true,
      ...base,
      attempts: [],
      diff: plan.candidates.map(c => formatPatchDiff(c.patch)).join('\n'),
    };
  }

  const before = await snapshot(analysis.source);
  const beforeErrorCodes = new Set(
    before.diagnostics.filter(d => d.severity === 'error').map(d => d.code),
  );

  const attempts: RepairAttempt[] = [];
  for (const candidate of attemptable) {
    const outcome = await evaluateCandidate(analysis.source, candidate, plan, beforeErrorCodes);
    attempts.push(outcome.attempt);

    if (outcome.accepted) {
      return {
        ok: true,
        ...base,
        attempts,
        applied: candidate.id,
        new_code: outcome.newCode,
        diff: formatPatchDiff(candidate.patch),
        before,
        after: outcome.after,
      };
    }
    // `apply-first` is a single-shot contract: report what the top candidate
    // did, do not keep trying.
    if (strategy === 'apply-first') {
      return {
        ok: false,
        ...base,
        attempts,
        new_code: outcome.newCode,
        diff: formatPatchDiff(candidate.patch),
        before,
        after: outcome.after,
        diagnostics: [exhaustedDiagnostic(plan.diagnostic, attempts.length)],
      };
    }
  }

  return {
    ok: false,
    ...base,
    attempts,
    before,
    diagnostics: [exhaustedDiagnostic(plan.diagnostic, attempts.length)],
  };
}

interface CandidateOutcome {
  attempt: RepairAttempt;
  accepted: boolean;
  /** Evaluation verdict after the patch; absent when the patch was refused. */
  after?: RepairHealthSnapshot;
  /** Patched source; absent when the patch was refused. */
  newCode?: string;
}

async function evaluateCandidate(
  source: string,
  candidate: RepairCandidate,
  plan: RepairPlan,
  beforeErrorCodes: Set<string>,
): Promise<CandidateOutcome> {
  const applied = applyRepairPatch(source, candidate.patch, plan.repairRegion);
  if (!applied.ok) {
    return {
      attempt: {
        candidateId: candidate.id,
        applied: false,
        accepted: false,
        diagnostic: applied.diagnostic,
      },
      accepted: false,
    };
  }

  const after = await snapshot(applied.new_code);
  const cleared = !after.diagnostics.some(
    d => d.code === plan.diagnostic.code && d.featureId === plan.diagnostic.featureId,
  );
  const newErrorCodes = [
    ...new Set(
      after.diagnostics
        .filter(d => d.severity === 'error' && !beforeErrorCodes.has(d.code))
        .map(d => d.code),
    ),
  ];
  const accepted = cleared && newErrorCodes.length === 0;

  return {
    attempt: {
      candidateId: candidate.id,
      applied: true,
      ok: after.ok,
      clearedDiagnostic: cleared,
      newErrorCodes,
      accepted,
    },
    accepted,
    after,
    newCode: applied.new_code,
  };
}

async function snapshot(code: string): Promise<RepairHealthSnapshot> {
  // Repair is an incremental edit step, not a terminal check: the T3 mechanism
  // sweep belongs on the agent's final evaluate_script call, exactly as it does
  // for the other source-edit tools.
  const result = await evaluateScriptTool({ code, skipMechanismCheck: true });
  return {
    ok: result.ok,
    featureHealth: result.featureHealth,
    diagnostics: result.diagnostics,
  };
}

function normalizeMaxAttempts(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_MAX_ATTEMPTS;
  return Math.max(1, Math.min(10, Math.floor(value)));
}

function noCandidateDiagnostic(
  target: CompilerDiagnostic,
  reason: string | undefined,
): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'tool.repair.no-candidate',
    ...(target.featureId !== undefined ? { featureId: target.featureId } : {}),
    severity: 'info',
    message: reason ?? `No automatic repair candidate for ${target.code}.`,
    hint: HINT_TEMPLATES['tool.repair.no-candidate'].template,
  };
}

function exhaustedDiagnostic(target: CompilerDiagnostic, attempts: number): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'tool.repair.exhausted',
    ...(target.featureId !== undefined ? { featureId: target.featureId } : {}),
    severity: 'error',
    message: `Attempted ${attempts} candidate${attempts === 1 ? '' : 's'} for ${target.code}; none cleared it without new errors.`,
    hint: HINT_TEMPLATES['tool.repair.exhausted'].template,
  };
}
