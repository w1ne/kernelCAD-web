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

export interface PartOnlyReviewInput {
  timing: ReviewTimingReport;
  featureCount: number;
  /** Evaluate-stage diagnostics (no errors: a failed build returned earlier). */
  diagnostics: CompilerDiagnostic[];
  repairContext: RepairContext;
  geometry: ContactGraphResult | undefined;
}

export function partOnlyReview(p: PartOnlyReviewInput): ReviewCadOutput {
  return {
    ...p.timing,
    ok: true,
    featureCount: p.featureCount,
    diagnostics: p.diagnostics,
    assembly: 'part-only',
    validator: { status: 'solved', diagnostics: [], partCount: 1, jointCount: 0 },
    fitness: {
      functional: true,
      repairMode: 'none',
      repairDirective:
        'Single part (no assembly): the part-level checks (build, union guard, DFM gates) passed; mate, pose-envelope and mechanism checks do not apply. Wrap parts in assembly(...).part(...) and add mates when the design has joints.',
      passedChecks: ['part-only-evaluate'],
      blockingReasons: [],
      mechanismSummary: { sampleCount: 0, interferenceCount: 0, trackedConnectorCount: 0 },
    },
    repairContext: p.repairContext,
    rawInterferencePairs: [],
    interferenceSummary: summarizeInterferencePairs([]),
    mechanism: 'unverified',
    mechanismFailures: [],
    ...(p.geometry !== undefined ? { geometry: p.geometry } : {}),
  };
}
