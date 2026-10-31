// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// feature.kernel-failed candidates: fillet/chamfer values verified against
// the kernel while diagnosing (`diagnostic.details`).

import type { RepairCandidate } from './types';
import type { CharRange } from './scriptSpans';
import { patchFromCharEdit } from './applyPatch';
import {
  callOf,
  formatNumber,
  isNumericLiteralText,
  round,
  type CandidateContext,
} from './candidateHelpers';

/**
 * OCCT `kernel-failed` is the catch-all. Only offer a fillet/chamfer value the
 * lowerer verified against the kernel; a failed shell needs an authored
 * boolean hollow, not another guessed `.shell()` attempt on the same body.
 */
export function shrinkOversizedKernelParam(ctx: CandidateContext): RepairCandidate[] {
  if (ctx.record.kind !== 'fillet' && ctx.record.kind !== 'chamfer') return [];
  return probedEdgeFeatureValue(ctx);
}

/** Char range of the call's first argument when it is a plain numeric
 *  literal (the only form a patch can rewrite safely). */
function literalFirstArgument(ctx: CandidateContext): CharRange | undefined {
  const call = callOf(ctx);
  const chars = call === undefined ? undefined : ctx.spans.argumentChars(call, 0);
  if (chars === undefined) return undefined;
  return isNumericLiteralText(ctx.spans.text.slice(chars.start, chars.end)) ? chars : undefined;
}

/**
 * A fillet/chamfer the kernel rejected carries the largest value the lowerer
 * verified on the same edges (`details.maxFeasibleValue`, found by bisecting
 * against the kernel). Offer exactly that value — it is measured, not guessed.
 */
function probedEdgeFeatureValue(ctx: CandidateContext): RepairCandidate[] {
  const { record, spans } = ctx;
  const paramName = record.kind === 'fillet' ? 'radius' : 'distance';
  const current = record.params[paramName]?.evaluated;
  const max = ctx.diagnostic.details?.maxFeasibleValue;
  if (typeof current !== 'number' || typeof max !== 'number' || !(max > 0) || max >= current) return [];
  const chars = literalFirstArgument(ctx);
  if (chars === undefined) return [];
  const patch = patchFromCharEdit(spans, chars, formatNumber(max));
  if (patch === undefined) return [];
  return [{
    id: `${record.id}:probed-${paramName}:${max}`,
    diagnosticId: ctx.diagnosticId,
    code: ctx.diagnostic.code,
    featureId: record.id,
    summary: `Reduce ${record.kind} ${paramName} from ${formatNumber(current)} mm to ${formatNumber(max)} mm, the largest the kernel builds on these edges.`,
    predictedEffect: `the ${record.kind} applies to every selected edge at ${formatNumber(max)} mm`,
    patch,
    evidence: { maxFeasibleValueMm: round(max, 4), currentValueMm: round(current, 4) },
  }];
}
