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
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
import { HINT_TEMPLATES } from '../../../../shared/diagnostics/registry';
import { built, finished, noShape, type LowerContext, type LowerOutcome } from './context';

interface FilletIntersectionMeta {
  sides?: 'body' | 'both';
  continuity?: 'G1' | 'G2';
}

interface Request {
  radius: number;
  toleranceMm: number;
  continuity: 'G1' | 'G2';
}

/** Validate the record's inputs, pushing a typed diagnostic on failure. */
function validateInputsAndSides(
  ctx: LowerContext,
  r: FeatureRecord,
  base: OcctBackend | undefined,
  cutter: OcctBackend | undefined,
): { radius: number; toleranceMm: number; continuity: 'G1' | 'G2' } | undefined {
  if (!base || !cutter) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'body.filletIntersection(cutter, radius)',
        path: base ? 'cutter' : 'body',
        gotText: 'an upstream shape that did not lower',
        requires: 'both the cut body and the cutter captured and lowered',
        example: 'const cut = body.subtract(cutter); cut.filletIntersection(cutter, 2)',
      }),
    });
    return undefined;
  }
  const meta = (r.metadata ?? {}) as FilletIntersectionMeta;
  if (meta.sides !== undefined && meta.sides !== 'body') {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'body.filletIntersection(cutter, radius, { sides })',
        path: 'opts.sides',
        got: meta.sides,
        requires: "sides: 'body' (the first slice; 'both' is reserved)",
        example: "cut.filletIntersection(cutter, 2, { sides: 'body' })",
      }),
    });
    return undefined;
  }
  return { radius: 0, toleranceMm: 0, continuity: meta.continuity ?? 'G1' };
}

function validateNumbers(
  ctx: LowerContext,
  r: FeatureRecord,
): { radius: number; toleranceMm: number } | undefined {
  const radius = r.params.radius?.evaluated;
  const toleranceMm = r.params.tolerance?.evaluated ?? 0.05;
  if (radius === undefined || !(radius > 0) || !Number.isFinite(radius)) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'body.filletIntersection(cutter, radius)',
        path: 'radius',
        got: radius,
        requires: 'a positive finite radius in mm',
        unit: 'mm',
        example: 'cut.filletIntersection(cutter, 2)',
      }),
    });
    return undefined;
  }
  if (!(toleranceMm > 0) || !Number.isFinite(toleranceMm)) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'body.filletIntersection(cutter, radius, { toleranceMm })',
        path: 'opts.toleranceMm',
        got: toleranceMm,
        requires: 'a positive finite distance in mm',
        unit: 'mm',
        example: 'cut.filletIntersection(cutter, 2, { toleranceMm: 0.05 })',
      }),
    });
    return undefined;
  }
  return { radius, toleranceMm };
}

function validateRequest(
  ctx: LowerContext,
  r: FeatureRecord,
  base: OcctBackend | undefined,
  cutter: OcctBackend | undefined,
): Request | undefined {
  const baseCheck = validateInputsAndSides(ctx, r, base, cutter);
  if (baseCheck === undefined) return undefined;
  const numbers = validateNumbers(ctx, r);
  if (numbers === undefined) return undefined;
  return { ...numbers, continuity: baseCheck.continuity };
}

/** `filletIntersection` — round the seam where `cutter` met `base`. */
export function lowerFilletIntersection(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  const cutter = ctx.inputs.byKey.cutter as OcctBackend | undefined;
  const request = validateRequest(ctx, r, base, cutter);
  if (request === undefined) return base ? finished(base) : noShape();

  const seam = findIntersectionSeamEdges(base!, cutter!, request);
  if (seam.sectionEdgeCount === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.fillet-intersection.no-section',
      featureId: r.id,
      severity: 'error',
      message: 'filletIntersection: the body and cutter do not intersect — no seam to round.',
      hint: HINT_TEMPLATES['feature.fillet-intersection.no-section'].template,
    });
    return finished(base!);
  }
  if (seam.matched.length === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.fillet-intersection.no-seam-edge',
      featureId: r.id,
      severity: 'error',
      message: `filletIntersection: section exists (${seam.sectionEdgeCount} edge(s)) but no body edge lies within ${request.toleranceMm} mm of it.`,
      hint: HINT_TEMPLATES['feature.fillet-intersection.no-seam-edge'].template,
    });
    return finished(base!);
  }

  const outcome = blendSeam(ctx, r, base!, seam.matched, seam.short, request);
  return outcome ?? finished(base!);
}

/** Try the whole seam, then the long-edge subset; push the failure otherwise. */
function blendSeam(
  ctx: LowerContext,
  r: FeatureRecord,
  base: OcctBackend,
  matched: readonly SeamEdge[],
  short: readonly SeamEdge[],
  request: Request,
): LowerOutcome | undefined {
  const all = tryIntersectionFillet(base, matched, request.radius, request.continuity);
  if (all.ok) return builtFromResult(base, all.result);

  const longEdges = matched.filter((e) => e.lengthMm >= 2 * request.radius);
  if (short.length > 0 && longEdges.length > 0 && longEdges.length < matched.length) {
    const subset = tryIntersectionFillet(base, longEdges, request.radius, request.continuity);
    if (subset.ok) {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.fillet-intersection.short-edge',
        featureId: r.id,
        severity: 'warn',
        message: `filletIntersection: skipped ${short.length} seam edge(s) shorter than 2 × radius (${formatLengths(short)}).`,
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
    message: `filletIntersection: OCCT could not blend ${matched.length} seam edge(s) at r=${request.radius} mm (lengths: ${formatLengths(matched)}): ${all.message}`,
    hint: HINT_TEMPLATES['feature.fillet-intersection.fillet-failed'].template,
  });
  return undefined;
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
