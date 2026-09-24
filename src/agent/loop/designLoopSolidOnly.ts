// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Adam-level mechanical parts are often single-body solids. review_cad still
// requires an assembly; design_loop promotes a clean solid-only evaluate to
// functional so quality / revision assist gates can still run.
import { summarizeInterferencePairs } from '../../modeling/runtime/interferenceClassification';
import type { ReviewCadOutput } from '../review/reviewPipeline';

export function isSolidOnlyReviewMiss(review: ReviewCadOutput): boolean {
  if (review.ok) return false;
  if (review.featureCount <= 0) return false;
  if (review.diagnostics.length > 0) return false;
  const prompt = review.suggestedRepairPrompt ?? '';
  return prompt.includes('no assembly captured');
}

export function solidOnlyFunctionalReview(review: ReviewCadOutput, goal: string): ReviewCadOutput {
  return {
    ok: true,
    featureCount: review.featureCount,
    diagnostics: [],
    assembly: 'solid-only',
    validator: { status: 'solved', diagnostics: [], partCount: 1, jointCount: 0 },
    fitness: {
      functional: true,
      repairMode: 'none',
      repairDirective:
        'Solid-only script (no assembly). Preserve the solid; mechanism/pose gates were skipped. Rerun review_cad after wrapping in assembly(...).part(...) if joints are required.',
      passedChecks: ['solid-only-evaluate'],
      blockingReasons: [],
      mechanismSummary: { sampleCount: 0, interferenceCount: 0, trackedConnectorCount: 0 },
    },
    repairContext: {
      blockingReasons: [],
      topDiagnostics: [],
      preserveInterfaces: [],
      designGoal: goal,
    },
    rawInterferencePairs: [],
    interferenceSummary: summarizeInterferencePairs([]),
    mechanism: 'unverified',
    mechanismFailures: [],
  };
}
