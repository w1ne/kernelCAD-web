// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// review_cad on a single part (the script captured no assembly). The evaluate
// stage already ran the part-level checks — build, union guard, DFM gates,
// script advisories — so the review reports that verdict instead of failing
// with review.no-assembly; mate / pose-envelope / mechanism checks do not
// apply and are reported as such.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { summarizeInterferencePairs } from '../../modeling/runtime/interferenceClassification';
import type { ContactGraphResult } from '../../modeling/runtime/contactGraph';
import type { RepairContext, ReviewCadOutput, ReviewTimingReport } from './reviewPipeline';
import type { RequirementsLedger } from '../../shared/intent/requirementRecord';

export interface PartOnlyReviewInput {
  timing: ReviewTimingReport;
  featureCount: number;
  /** Evaluate-stage diagnostics (no errors: a failed build returned earlier). */
  diagnostics: CompilerDiagnostic[];
  repairContext: RepairContext;
  geometry: ContactGraphResult | undefined;
  requirements: RequirementsLedger;
}

export function partOnlyReview(p: PartOnlyReviewInput): ReviewCadOutput {
  const common = {
    ...p.timing,
    featureCount: p.featureCount,
    diagnostics: p.diagnostics,
    assembly: 'part-only',
    validator: { status: 'solved' as const, diagnostics: [], partCount: 1, jointCount: 0 },
    fitness: {
      functional: p.requirements.ok,
      repairMode: (p.requirements.ok ? 'none' : 'local-fix') as 'none' | 'local-fix',
      repairDirective:
        'Single part (no assembly): the part-level checks (build, union guard, DFM gates, requirements) passed; mate, pose-envelope and mechanism checks do not apply. Wrap parts in assembly(...).part(...) and add mates when the design has joints.',
      passedChecks: ['part-only-evaluate'],
      blockingReasons: [],
      mechanismSummary: { sampleCount: 0, interferenceCount: 0, trackedConnectorCount: 0 },
    },
    repairContext: p.repairContext,
    rawInterferencePairs: [],
    interferenceSummary: summarizeInterferencePairs([]),
    mechanism: 'unverified' as const,
    mechanismFailures: [],
    ...(p.geometry !== undefined ? { geometry: p.geometry } : {}),
    requirements: p.requirements,
  };
  return p.requirements.ok
    ? { ...common, ok: true }
    : { ...common, ok: false, suggestedRepairPrompt: ledgerRepairPrompt(p.requirements) };
}

function ledgerRepairPrompt(ledger: RequirementsLedger): string {
  const failing = ledger.entries.filter(e => e.status !== 'pass').map(e => `- [${e.status}] ${e.message ?? e.name}`);
  return `Requirements are not satisfied:\n${failing.join('\n')}`;
}
