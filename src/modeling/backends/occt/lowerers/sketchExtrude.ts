// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { TANGENCY_ERROR_PREFIX } from '../../../../kernel/backends/occt/tangencySolver';
import { HINT_TEMPLATES } from '../../../../shared/diagnostics/registry';
import type { DiagnosticCode } from '../../../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { emptyResultDiagnostic } from '../additiveNoOp';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

/** `sketch` — either `sketch.text(...)` (delegated to the text lowerer) or a
 *  `path()....close()` command list. */
export async function lowerSketch(ctx: LowerContext, r: FeatureRecord): Promise<LowerOutcome> {
  let shape: ShapeBackend;
  const meta = r.metadata as { textContent?: unknown; commands?: unknown } | undefined;
  if (typeof meta?.textContent === 'string') {
    const res = await (await import('../../../../kernel/backends/occt/textLowerer')).lowerSketchText(r, ctx.scriptDir);
    if (!res.ok) {
      ctx.diagnostics.push(...res.diagnostics);
      return noShape();
    }
    shape = res.backend;
    return built(shape);
  }
  const commands = meta?.commands;
  if (!Array.isArray(commands) || commands.length === 0) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `sketch requires metadata.commands: SketchCommand[] OR metadata.textContent: string.`,
      hint: 'Construct sketches via path().moveTo(...).lineTo(...).close() OR sketch.text(content, opts).',
    });
    return noShape();
  }
  try {
    shape = OcctBackend.fromSketchCommands(commands as import('../../../capture/sketch').SketchCommand[]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Narrow degenerate-arc cases (radiusArc-only for now) and the
    // Geom2dGcc tangency failures to their specific codes; everything
    // else collapses into the generic kernel-failed bucket. The
    // tangency solver tags its own messages (see TANGENCY_ERROR_PREFIX)
    // precisely so a "no such circle exists" answer reaches the agent as
    // a named geometric outcome rather than an anonymous kernel crash.
    const isDegenerateArc = msg.startsWith('radiusArc:');
    const isTangency = msg.startsWith(TANGENCY_ERROR_PREFIX);
    let code: DiagnosticCode;
    let hint: string;
    if (isTangency) {
      code = msg.startsWith(`${TANGENCY_ERROR_PREFIX} ambiguous:`)
        ? 'sketch.tangency.ambiguous'
        : 'sketch.tangency.no-solution';
      hint = HINT_TEMPLATES[code].template;
    } else if (isDegenerateArc) {
      code = 'feature.sketch.degenerate-arc';
      hint = 'The arc segment is degenerate. Try a larger radius, different endpoints, or another arc constructor (threePointsArc/sagittaArc).';
    } else {
      code = 'feature.kernel-failed';
      hint = 'Sketch construction failed — read the diagnostic message for the underlying error.';
    }
    ctx.diagnostics.push({
      target: 'export-occt',
      code,
      featureId: r.id,
      severity: 'error',
      message: `sketch construction failed: ${msg}`,
      hint,
    });
    return noShape();
  }
  return built(shape);
}

/**
 * `extrude` — dispatch on the profile kind, then run the shared empty-result
 * gate. Split per kind so each builder stays readable; the branch bodies are
 * unchanged from the single-arm form.
 */
export function lowerExtrude(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  // Profile kind is a quoted string in IR (e.g. "'rect'", "'circle'").
  const profileKind = String(r.params.profileKind.expression).replace(/'/g, '');
  const shape = buildExtrudeProfile(ctx, r, profileKind);
  if (shape === undefined) return noShape();
  // extrude always builds a solid by sweeping a closed profile through a
  // depth — an empty / zero-volume result is degenerate, never legitimate.
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'extrude',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}

/** Returns undefined once the failing branch has pushed its diagnostic. */
function buildExtrudeProfile(
  ctx: LowerContext,
  r: FeatureRecord,
  profileKind: string,
): ShapeBackend | undefined {
  if (profileKind === 'rect') {
    const height = r.params.height.evaluated;
    return OcctBackend.extrudeRect(
      r.params.w.evaluated,
      r.params.h.evaluated,
      height,
    );
  }
  if (profileKind === 'circle') {
    const height = r.params.height.evaluated;
    return OcctBackend.extrudeCircle(r.params.r.evaluated, height);
  }
  if (profileKind === 'polygon') return extrudePolygonProfile(ctx, r);
  if (profileKind === 'rounded-rect') return extrudeRoundedRectProfile(ctx, r);
  if (profileKind === 'sketch') return extrudeSketchProfile(ctx, r);
  ctx.diagnostics.push({
    target: ctx.target,
    code: 'feature.invalid-args',
    featureId: r.id,
    severity: 'error',
    message: `extrude profile kind '${profileKind}' not supported. Use 'rect', 'circle', 'polygon', 'rounded-rect', or 'sketch'.`,
    hint: "Use a supported profile kind: 'rect', 'circle', 'polygon', 'rounded-rect', or 'sketch'.",
  });
  return undefined;
}

const EXTRUDE_KERNEL_HINT =
  'OCCT could not extrude — check for self-intersecting profile, inconsistent polygon winding, or rounded-rect radius exceeding half of width/height.';

function pushExtrudeKernelFailure(ctx: LowerContext, r: FeatureRecord, e: unknown): undefined {
  const msg = e instanceof Error ? e.message : String(e);
  ctx.diagnostics.push({
    target: 'export-occt',
    code: 'feature.kernel-failed',
    featureId: r.id,
    severity: 'error',
    message: `OCCT extrude failed: ${msg}`,
    hint: EXTRUDE_KERNEL_HINT,
  });
  return undefined;
}

function extrudePolygonProfile(ctx: LowerContext, r: FeatureRecord): ShapeBackend | undefined {
  const depth = r.params.depth.evaluated;
  // Each coordinate is a plain number, or a Param (pre-resolved by the
  // dispatcher) when the author passed a ParamRef.
  const coord = (c: unknown): number | undefined =>
    typeof c === 'number'
      ? c
      : typeof c === 'object' && c !== null && typeof (c as { evaluated?: unknown }).evaluated === 'number'
        ? (c as { evaluated: number }).evaluated
        : undefined;
  const rawPoints = (r.metadata as { points?: unknown } | undefined)?.points;
  const points = Array.isArray(rawPoints)
    ? rawPoints.map(p => (Array.isArray(p) && p.length === 2 ? [coord(p[0]), coord(p[1])] : [undefined, undefined]))
    : undefined;
  if (!Array.isArray(points) || points.length < 3 ||
      !points.every(p => typeof p[0] === 'number' && typeof p[1] === 'number')) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `extrude polygon requires metadata.points: [number, number][] with at least 3 points.`,
      hint: 'Pass at least 3 [x, y] number pairs as the polygon points.',
    });
    return undefined;
  }
  try {
    return OcctBackend.extrudePolygon(points as [number, number][], depth);
  } catch (e) {
    return pushExtrudeKernelFailure(ctx, r, e);
  }
}

function extrudeRoundedRectProfile(ctx: LowerContext, r: FeatureRecord): ShapeBackend | undefined {
  const width = r.params.width?.evaluated;
  const height = r.params.height?.evaluated;
  const radius = r.params.radius?.evaluated;
  const depth = r.params.depth?.evaluated;
  if (width === undefined || height === undefined || radius === undefined || depth === undefined) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `extrude rounded-rect requires width, height, radius, and depth params (positive finite numbers).`,
      hint: 'Pass width, height, radius, and depth as positive finite numbers.',
    });
    return undefined;
  }
  try {
    return OcctBackend.extrudeRoundedRect(width, height, radius, depth);
  } catch (e) {
    return pushExtrudeKernelFailure(ctx, r, e);
  }
}

function extrudeSketchProfile(ctx: LowerContext, r: FeatureRecord): ShapeBackend | undefined {
  const depth = r.params.depth.evaluated;
  const sketchInput = ctx.inputs.byKey.sketch as OcctBackend | undefined;
  if (!sketchInput) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `extrude with profile='sketch' requires an input named 'sketch'.`,
      hint: 'Chain extrude from a path()...close() sketch.',
    });
    return undefined;
  }
  try {
    return OcctBackend.extrudeFromSketch(sketchInput, depth);
  } catch (e) {
    return pushExtrudeKernelFailure(ctx, r, e);
  }
}
