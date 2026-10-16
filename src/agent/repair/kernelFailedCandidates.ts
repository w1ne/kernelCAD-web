// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// feature.kernel-failed candidates: shell walls and fillet/chamfer values.
// Numbers come from geometry (the parent bbox) or from values the lowerer
// verified against the kernel while diagnosing (`diagnostic.details`).

import type { RepairCandidate, RepairPatch } from './types';
import type { CharRange } from './scriptSpans';
import { patchFromCharEdit } from './applyPatch';
import { bboxOf, bboxSize } from './geometryFacts';
import {
  callOf,
  formatNumber,
  inputShape,
  isNumericLiteralText,
  round,
  type CandidateContext,
} from './candidateHelpers';

/**
 * OCCT `kernel-failed` is the catch-all. Derivations made without guessing
 * intent: a fillet/chamfer value the lowerer verified against the kernel, and
 * a shell wall that is either verified or under half the thinnest bbox
 * dimension.
 */
export function shrinkOversizedKernelParam(ctx: CandidateContext): RepairCandidate[] {
  if (ctx.record.kind === 'fillet' || ctx.record.kind === 'chamfer') return probedEdgeFeatureValue(ctx);
  if (ctx.record.kind === 'shell') return shrinkShellThickness(ctx);
  return [];
}

/** Shell: the verified wall first (when the lowerer found one), then the
 *  bbox ladder. */
function shrinkShellThickness(ctx: CandidateContext): RepairCandidate[] {
  const { record, spans } = ctx;
  const current = record.params.thickness?.evaluated;
  if (typeof current !== 'number') return [];
  const baseShape = inputShape(ctx, 'base');
  const parentBbox = bboxOf(baseShape);
  if (parentBbox === undefined) return [];
  const thinnest = Math.min(...bboxSize(parentBbox));
  if (!(thinnest > 0)) return [];
  const ceiling = thinnest / 2;

  const chars = literalFirstArgument(ctx);
  if (chars === undefined) return [];

  const candidates: RepairCandidate[] = [];
  const verified = verifiedShellThickness(ctx, current);
  if (verified !== undefined) {
    const patch = patchFromCharEdit(spans, chars, formatNumber(verified));
    if (patch !== undefined) candidates.push(verifiedShellCandidate(ctx, current, verified, patch));
  }
  for (const fraction of [0.4, 0.25, 0.1]) {
    const value = round(thinnest * fraction, 3);
    if (value <= 0 || value >= current || value >= ceiling || value === verified) continue;
    const patch = patchFromCharEdit(spans, chars, formatNumber(value));
    if (patch === undefined) continue;
    candidates.push({
      id: `${record.id}:shrink-thickness:${value}`,
      diagnosticId: ctx.diagnosticId,
      code: ctx.diagnostic.code,
      featureId: record.id,
      summary: `Reduce shell thickness from ${formatNumber(current)} mm to ${formatNumber(value)} mm.`,
      predictedEffect: 'the wall fits inside the solid and the shell lowers',
      patch,
      evidence: {
        thinnestDimensionMm: round(thinnest, 4),
        maxFeasibleThicknessMm: round(ceiling, 4),
        currentThicknessMm: round(current, 4),
      },
    });
  }
  return candidates;
}

/** Char range of the call's first argument when it is a plain numeric
 *  literal (the only form a patch can rewrite safely). */
function literalFirstArgument(ctx: CandidateContext): CharRange | undefined {
  const call = callOf(ctx);
  const chars = call === undefined ? undefined : ctx.spans.argumentChars(call, 0);
  if (chars === undefined) return undefined;
  return isNumericLiteralText(ctx.spans.text.slice(chars.start, chars.end)) ? chars : undefined;
}

/** The shell lowerer probes thinner walls before it suggests one; a wall it
 *  recorded as verified is the strongest candidate there is. */
function verifiedShellThickness(ctx: CandidateContext, current: number): number | undefined {
  const v = ctx.diagnostic.details?.verifiedThickness;
  return typeof v === 'number' && v > 0 && v < current ? v : undefined;
}

function verifiedShellCandidate(
  ctx: CandidateContext,
  current: number,
  value: number,
  patch: RepairPatch,
): RepairCandidate {
  return {
    id: `${ctx.record.id}:verified-thickness:${value}`,
    diagnosticId: ctx.diagnosticId,
    code: ctx.diagnostic.code,
    featureId: ctx.record.id,
    summary: `Reduce shell thickness from ${formatNumber(current)} mm to ${formatNumber(value)} mm (a wall the kernel built).`,
    predictedEffect: 'the shell lowers; this thickness was built by the kernel while diagnosing the failure',
    patch,
    evidence: { verifiedThicknessMm: round(value, 4), currentThicknessMm: round(current, 4) },
  };
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
