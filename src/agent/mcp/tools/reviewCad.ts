// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import {
  runReviewPipeline,
  type ReviewCadInput,
  type ReviewCadOutput,
} from '../../review/reviewPipeline';

export type {
  MechanismVerdict,
  RepairContext,
  ReviewCadInput,
  ReviewCadOutput,
} from '../../review/reviewPipeline';

export async function reviewCadTool(input: ReviewCadInput): Promise<ReviewCadOutput> {
  return runReviewPipeline(input);
}
