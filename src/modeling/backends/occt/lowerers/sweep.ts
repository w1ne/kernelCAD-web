// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { HelicalSweepArgsError, helixAxisBasis } from '../../../../kernel/backends/occt/helicalSweep';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { helix, helixOptionsFromSpec, type HelixRailSpec } from '../../../helix';
import { emptyResultDiagnostic } from '../additiveNoOp';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

/**
 * `sweep` — drags a closed sketch profile along a rail. Split into rail
 * validation, option validation and the kernel call so each stays inside the
 * complexity ratchet; the bodies are unchanged from the single-arm form.
 */
export function lowerSweep(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
  if (profileKind !== 'sketch') {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sweep profile kind '${profileKind}' not supported. Use 'sketch'.`,
      hint: "Use profileKind 'sketch' for sweep.",
    });
    return noShape();
  }
  const shape = sweepSketchProfile(ctx, r);
  if (shape === undefined) return noShape();
  // sweep drags a closed profile along a rail into a solid — an empty /
  // zero-volume result is degenerate, never legitimate.
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'sweep',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}

/** Returns undefined once the failing step has pushed its diagnostic. */
function sweepSketchProfile(ctx: LowerContext, r: FeatureRecord): ShapeBackend | undefined {
  const sketchInput = ctx.inputs.byKey.sketch as OcctBackend | undefined;
  if (!sketchInput) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sweep with profile='sketch' requires an input named 'sketch'.`,
      hint: 'Chain sweep from a path()...close() sketch.',
    });
    return undefined;
  }
  // A rail from helix() carries its (pre-resolved) dimensions: regenerate
  // it from the live values so a ParamRef radius/pitch/turns follows a
  // param change, whatever the spine mode.
  const helixSpec = (r.metadata as { helix?: HelixRailSpec } | undefined)?.helix;
  const rail = resolveSweepRail(ctx, r, helixSpec);
  if (rail === undefined) return undefined;
  const opts = resolveSweepOptions(ctx, r, helixSpec);
  if (opts === undefined) return undefined;
  const { frenet, transitionMode, spine } = opts;
  try {
    if (spine === 'helix') {
      const o = helixOptionsFromSpec(helixSpec!);
      return OcctBackend.sweepSketchAlongHelix(sketchInput, {
        origin: [0, 0, 0],
        ...helixAxisBasis(o.axis ?? 'Z'),
        radius: o.radius,
        pitch: o.pitch,
        turns: o.turns,
        startAngle: o.startAngle ?? 0,
      });
    }
    return OcctBackend.sweepFromSketch(
      sketchInput,
      rail as [number, number, number][],
      { frenet, transitionMode, spine },
    );
  } catch (e) {
    if (e instanceof HelicalSweepArgsError) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: e.message,
        hint: e.hint,
      });
      return undefined;
    }
    const msg = e instanceof Error ? e.message : String(e);
    // All sweep failure modes (multi-face profile, profile too large,
    // spine self-intersection, generic) collapse into kernel-failed.
    // The message preserves the underlying cause string from OCCT/
    // Replicad; the hint is generic to the sweep recovery class.
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT sweep failed: ${msg}`,
      hint: 'OCCT could not sweep — common causes: profile larger than rail curvature, sharp corners causing self-intersection, multi-face profile, or non-planar profile.',
    });
    return undefined;
  }
}

/** Regenerate (helix) or read (polyline) the rail and validate every point. */
function resolveSweepRail(
  ctx: LowerContext,
  r: FeatureRecord,
  helixSpec: HelixRailSpec | undefined,
): unknown[] | undefined {
  const rail = helixSpec !== undefined
    ? helix(helixOptionsFromSpec(helixSpec))
    : (r.metadata as { rail?: unknown } | undefined)?.rail;
  if (!Array.isArray(rail) || rail.length < 2) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sweep rail must be an array of at least 2 points; got ${Array.isArray(rail) ? `length ${rail.length}` : 'non-array'}.`,
      hint: 'Pass a rail array of [x, y, z] tuples (≥2 points). Use helix(...) for helical rails.',
    });
    return undefined;
  }
  if (rail.length > 5000) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sweep rail has ${rail.length} points (cap is 5000). For helices, reduce \`pointsPerTurn\` or \`turns\`. For polylines, simplify the path.`,
      hint: 'Reduce rail point count to ≤ 5000. For helices, lower pointsPerTurn or turns.',
    });
    return undefined;
  }
  // Validate every entry is [number, number, number] of finite numbers.
  for (let i = 0; i < rail.length; i++) {
    const p = rail[i];
    if (!Array.isArray(p) || p.length !== 3 ||
        !p.every(n => typeof n === 'number' && Number.isFinite(n))) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        message: `sweep rail point at index ${i} must be a [x, y, z] tuple of finite numbers; got ${JSON.stringify(p)}.`,
        hint: 'Each rail point must be a [x, y, z] tuple of finite numbers.',
      });
      return undefined;
    }
  }
  return rail;
}

/** Validate `frenet` / `transitionMode` / `spine` from params + metadata. */
function resolveSweepOptions(
  ctx: LowerContext,
  r: FeatureRecord,
  helixSpec: HelixRailSpec | undefined,
): { frenet: boolean; transitionMode: 'right' | 'transformed' | 'round'; spine: 'polyline' | 'smooth' | 'helix' } | undefined {
  const frenet = (r.params.frenet?.evaluated ?? 0) > 0.5;
  const rawTransition = (r.metadata as { transitionMode?: unknown } | undefined)?.transitionMode;
  const ALLOWED_MODES = ['right', 'transformed', 'round'] as const;
  if (rawTransition !== undefined && !ALLOWED_MODES.includes(rawTransition as typeof ALLOWED_MODES[number])) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sweep.transitionMode must be one of 'right' | 'transformed' | 'round'; got ${JSON.stringify(rawTransition)}.`,
      hint: "Pass transitionMode: 'right' (default, sharp), 'transformed' (extend tangents), or 'round' (tangent-arc corner).",
    });
    return undefined;
  }
  const transitionMode = (rawTransition ?? 'right') as 'right' | 'transformed' | 'round';
  const rawSpine = (r.metadata as { spine?: unknown } | undefined)?.spine;
  const ALLOWED_SPINES = ['polyline', 'smooth', 'helix'] as const;
  if (rawSpine !== undefined && !ALLOWED_SPINES.includes(rawSpine as typeof ALLOWED_SPINES[number])) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sweep.spine must be one of 'polyline' | 'smooth' | 'helix'; got ${JSON.stringify(rawSpine)}.`,
      hint: "Pass spine: 'polyline' (default — straight rail edges, real corners), 'smooth' (single B-spline spine through the rail points; use for curved rails), or 'helix' (exact helix for a helix() rail; threads).",
    });
    return undefined;
  }
  const spine = (rawSpine ?? 'polyline') as 'polyline' | 'smooth' | 'helix';
  if (spine === 'helix' && helixSpec === undefined) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: "sweep spine 'helix' requires a rail produced by helix(); this record carries no helix dimensions.",
      hint: "Pass helix({ radius, pitch, turns }) straight to sweep(rail, { spine: 'helix' }), or use spine: 'smooth' for other curved rails.",
    });
    return undefined;
  }
  return { frenet, transitionMode, spine };
}
