// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Edge } from 'replicad';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { KernelError } from '../../../../shared/intent/kernelError';
import { HINT_TEMPLATES } from '../../../../shared/diagnostics/registry';
import type { FeatureId, Vec3Param } from '../../../../shared/intent/types';

/** Drain any `_resolvedWarnings` deposited on `record` by edgeSelection's
 *  resolveFaceRef created-ref branch into the lowerer's diagnostics list.
 *  Called immediately after a successful `pickEdges` / `pickFace` so warnings
 *  ride out alongside the feature's other diagnostics. */
export function drainResolvedWarnings(
  record: FeatureRecord,
  diagnostics: CompilerDiagnostic[],
): void {
  const warns = (record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings;
  if (warns && warns.length > 0) {
    diagnostics.push(...warns);
    (record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings = [];
  }
}

/** Pre-filter edges below `minLength` (2 × radius for fillet, 2 × distance for
 *  chamfer). OCCT's BlendChain solver rejects radii larger than half the target
 *  edge length, so historically a single sub-2×r edge would fail the whole
 *  operation. Filtering pre-call lets long edges proceed and surfaces a clean
 *  info diagnostic naming the skipped count. Used by both fillet and chamfer. */
export function filterEdgesByMinLength(
  edges: readonly Edge[],
  minLength: number,
  ctx: {
    op: 'fillet' | 'chamfer';
    paramName: 'radius' | 'distance';
    featureId: FeatureId;
  },
): {
  kept: Edge[];
  diagnostic: CompilerDiagnostic | undefined;
} {
  const kept: Edge[] = [];
  let skipped = 0;
  for (const e of edges) {
    // Edge.length is the arc length via BRepAdaptor_Curve; safe on straight,
    // arc, and spline edges. Throws if the edge has no underlying curve
    // (degenerate); skip those defensively.
    let len: number;
    try { len = e.length; } catch { skipped++; continue; }
    if (len >= minLength) kept.push(e); else skipped++;
  }
  if (skipped === 0) return { kept, diagnostic: undefined };
  const minLenStr = minLength.toFixed(2);
  const hint = HINT_TEMPLATES['feature.edge-feature.short-edges-skipped'].template;
  if (kept.length === 0) {
    return {
      kept,
      diagnostic: {
        target: 'export-occt',
        code: 'feature.edge-feature.short-edges-skipped',
        featureId: ctx.featureId,
        severity: 'error',
        message: `${ctx.op} skipped: all ${skipped} target edges are shorter than 2 × ${ctx.paramName} = ${minLenStr} mm`,
        hint,
      },
    };
  }
  const gerund = ctx.op === 'fillet' ? 'filleting' : 'chamfering';
  return {
    kept,
    diagnostic: {
      target: 'export-occt',
      code: 'feature.edge-feature.short-edges-skipped',
      featureId: ctx.featureId,
      severity: 'warn',
      message: `${ctx.op} skipped ${skipped} of ${edges.length} target edges shorter than 2 × ${ctx.paramName} = ${minLenStr} mm; ${gerund} the remaining ${kept.length}.`,
      hint,
    },
  };
}

/** Read a Vec3Param to a numeric Vec3 by picking the `evaluated` field of each
 *  component. The recompute engine pre-resolves every Param-shaped node in the
 *  record (params + metadata + transforms) against the live ParamTable before
 *  invoking the lowerer, so `evaluated` already reflects the current value
 *  for any ParamRef-bearing component. Lowerers therefore never touch the
 *  ParamTable directly — they only read `.evaluated`. */
export function readVec3Param(v: Vec3Param): [number, number, number] {
  return [v.x.evaluated, v.y.evaluated, v.z.evaluated];
}

/** Normalize an axis vector to unit length. Throws `feature.invalid-args` with
 *  hint `invalid-args.axis.zero` when the resolved vector is zero or contains
 *  non-finite components. The throw lets a ParamRef edit that produces a
 *  zero-axis surface as a structured diagnostic via the dispatcher's
 *  exception path rather than producing a silently-broken transform. */
export function normalizeAxis(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0 || !Number.isFinite(len)) {
    throw new KernelError(
      'feature.invalid-args',
      `axis must be non-zero; resolved to [${v[0]}, ${v[1]}, ${v[2]}].`,
      undefined,
      'invalid-args.axis.zero — provide a non-zero direction; ParamRefs may have resolved to zero.',
    );
  }
  return [v[0] / len, v[1] / len, v[2] / len];
}
