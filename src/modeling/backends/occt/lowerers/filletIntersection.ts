// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import {
  discardOcctShape,
  filletWithHistory,
  mergeEdgeFeatureHistory,
  type EdgeFeatureHistoryResult,
} from '../../../../kernel/backends/occt/historyAwareEdgeFeatures';
import { edgeFeatureResultProblem } from '../../../../kernel/backends/occt/edgeFeatureValidity';
import {
  findIntersectionSeamEdges,
  type SeamEdge,
} from '../../../../kernel/backends/occt/filletIntersection';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { HINT_TEMPLATES } from '../../../../shared/diagnostics/registry';
import { built, finished, noShape, type LowerContext, type LowerOutcome } from './context';

interface FilletIntersectionMeta {
  sides?: 'body' | 'both';
  continuity?: 'G1' | 'G2';
}

/** `filletIntersection` — round the seam where `cutter` met `base`. */
export function lowerFilletIntersection(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  const cutter = ctx.inputs.byKey.cutter as OcctBackend | undefined;
  if (!base || !cutter) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `filletIntersection: missing ${base ? 'cutter' : 'base'} input — the upstream shape did not lower.`,
      hint: 'Call body.filletIntersection(cutter, r) with both shapes captured and lowered.',
    });
    return noShape();
  }

  const meta = (r.metadata ?? {}) as FilletIntersectionMeta;
  if (meta.sides !== undefined && meta.sides !== 'body') {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `filletIntersection: sides '${meta.sides}' is reserved; the first slice supports sides: 'body' only.`,
      hint: "Pass sides: 'body' (default) or omit it; filleting the cutter side is a follow-up.",
    });
    return finished(base);
  }

  const radius = r.params.radius?.evaluated;
  const toleranceMm = r.params.tolerance?.evaluated ?? 0.05;
  if (radius === undefined || !(radius > 0) || !Number.isFinite(radius)) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `filletIntersection: radius must be a positive finite number in mm; got ${String(radius)}.`,
      hint: 'Pass the fillet radius as the second argument: body.filletIntersection(cutter, 2).',
    });
    return finished(base);
  }
  if (!(toleranceMm > 0) || !Number.isFinite(toleranceMm)) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `filletIntersection: toleranceMm must be a positive finite number; got ${String(toleranceMm)}.`,
      hint: 'Pass toleranceMm (default 0.05) as the seam-selection tolerance in mm.',
    });
    return finished(base);
  }

  const seam = findIntersectionSeamEdges(base, cutter, { toleranceMm, radius });
  if (seam.sectionEdgeCount === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.fillet-intersection.no-section',
      featureId: r.id,
      severity: 'error',
      message: 'filletIntersection: the body and cutter do not intersect — no seam to round.',
      hint: HINT_TEMPLATES['feature.fillet-intersection.no-section'].template,
    });
    return finished(base);
  }
  if (seam.matched.length === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.fillet-intersection.no-seam-edge',
      featureId: r.id,
      severity: 'error',
      message: `filletIntersection: section exists (${seam.sectionEdgeCount} edge(s)) but no body edge lies within ${toleranceMm} mm of it.`,
      hint: HINT_TEMPLATES['feature.fillet-intersection.no-seam-edge'].template,
    });
    return finished(base);
  }

  const all = tryIntersectionFillet(base, seam.matched, radius, meta.continuity ?? 'G1');
  if (all.ok) return builtFromResult(base, all.result);

  // A short seam segment can make the whole blend fail. Retry without the
  // edges shorter than 2r and report them instead of silently skipping.
  const longEdges = seam.matched.filter((e) => e.lengthMm >= 2 * radius);
  if (seam.short.length > 0 && longEdges.length > 0 && longEdges.length < seam.matched.length) {
    const subset = tryIntersectionFillet(base, longEdges, radius, meta.continuity ?? 'G1');
    if (subset.ok) {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.fillet-intersection.short-edge',
        featureId: r.id,
        severity: 'warn',
        message: `filletIntersection: skipped ${seam.short.length} seam edge(s) shorter than 2 × radius (${formatLengths(seam.short)}).`,
        hint: HINT_TEMPLATES['feature.fillet-intersection.short-edge'].template,
      });
      return builtFromResult(base, subset.result);
    }
  }

  ctx.diagnostics.push({
    target: ctx.target,
    code: 'feature.fillet-intersection.fillet-failed',
    featureId: r.id,
    severity: 'error',
    message: `filletIntersection: OCCT could not blend ${seam.matched.length} seam edge(s) at r=${radius} mm (lengths: ${formatLengths(seam.matched)}): ${all.message}`,
    hint: HINT_TEMPLATES['feature.fillet-intersection.fillet-failed'].template,
  });
  return finished(base);
}

type Attempt =
  | { ok: true; result: EdgeFeatureHistoryResult }
  | { ok: false; message: string };

function tryIntersectionFillet(
  base: OcctBackend,
  edges: readonly SeamEdge[],
  radius: number,
  continuity: 'G1' | 'G2',
): Attempt {
  let result: EdgeFeatureHistoryResult;
  try {
    result = filletWithHistory(
      base,
      edges.map((e) => ({ hash: e.hash })),
      radius,
      continuity,
    );
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'non-Error OCCT failure' };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input = (base.getReplicadShape() as any).wrapped;
  const problem = edgeFeatureResultProblem(input, result.shape, 'mixed');
  if (problem) {
    discardOcctShape(result.shape);
    return { ok: false, message: `the kernel reported success but ${problem}` };
  }
  return { ok: true, result };
}

function builtFromResult(base: OcctBackend, result: EdgeFeatureHistoryResult): LowerOutcome {
  const newMap = mergeEdgeFeatureHistory(base.historyMap, result);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(result.shape as any) as replicad.Shape3D;
  return built(new OcctBackend(wrapped, undefined, newMap));
}

function formatLengths(edges: readonly SeamEdge[]): string {
  return edges
    .map((e) => e.lengthMm.toFixed(2))
    .slice(0, 8)
    .join(', ') + (edges.length > 8 ? `, … (${edges.length} total)` : '');
}

