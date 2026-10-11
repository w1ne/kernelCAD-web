// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { runReviewPipeline, type ReviewCadInput } from '../../review/reviewPipeline';
import { compactReviewOutput, type CompactReviewCadOutput } from '../../review/reviewCompaction';

export type {
  MechanismVerdict,
  RepairContext,
  ReviewCadInput,
  ReviewCadOutput,
} from '../../review/reviewPipeline';
export type { CompactReviewCadOutput, ReviewFindingRef } from '../../review/reviewCompaction';

/**
 * review_cad: the shared review pipeline, with each finding stated once
 * (`diagnostics[].id` / `mechanismFailures[].id`) and referenced by id + code
 * from `fitness.blockingReasons`, `repairContext` and `suggestedRepairPrompt`.
 */
export async function reviewCadTool(input: ReviewCadInput): Promise<CompactReviewCadOutput> {
  return compactReviewOutput(await runReviewPipeline(input));
}
