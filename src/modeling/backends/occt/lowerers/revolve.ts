// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { SketchCommand } from '../../../../shared/capture/sketchCommand';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { emptyResultDiagnostic } from '../additiveNoOp';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

/** `revolve` — spins a closed sketch profile around the Y axis. Validates the
 *  profile (non-empty, stays on x >= 0) and the optional partial angle. */
export function lowerRevolve(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  const sketchInput = ctx.inputs.byKey.sketch as OcctBackend | undefined;
  if (!sketchInput) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `revolve requires an input named 'sketch'.`,
      hint: 'Chain revolve from a path()...close() sketch.',
    });
    return noShape();
  }
  const commands = sketchInput.getSketchCommands();
  if (!commands) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `revolve sketch input has no command history.`,
      hint: 'Chain revolve from a path()...close() sketch (the sketch must carry its command history).',
    });
    return noShape();
  }
  // Empty profile: only moveTo + close (or even less). Any real segment —
  // line, arc, spline, NURBS, or hermite — gives the profile area.
  if (!commands.some(isPathSegment)) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `revolve profile has no line/arc segments — area is zero.`,
      hint: 'Add at least one segment (line, arc, or spline) to the path before close.',
    });
    return noShape();
  }
  // Axis-cross check: any point with x < 0 means the profile spans the
  // rotation axis, which yields a self-intersecting revolve. Every segment
  // kind's carried positions participate — line/arc endpoints, arc
  // midpoints, spline waypoints, NURBS control points, hermite endpoints —
  // not just the pen-command endpoints.
  const crossingX = firstNegativeX(commands);
  if (crossingX !== undefined) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.revolve.crosses-axis',
      featureId: r.id,
      severity: 'error',
      message: `revolve profile point (x=${crossingX}) crosses rotation axis. All points must satisfy x >= 0.`,
      hint: 'A revolve profile must stay on one side of the rotation axis. Clamp all path coordinates to x >= 0.',
    });
    return noShape();
  }
  // Optional partial-revolve `angleDeg` param. Default 360 (full).
  // Range: (0, 360]. Out-of-range values are caught here and surfaced
  // as `feature.invalid-args` rather than letting replicad throw a
  // less-specific error.
  const angleDeg = r.params.angleDeg ? Number(r.params.angleDeg.evaluated) : 360;
  if (!Number.isFinite(angleDeg) || angleDeg <= 0 || angleDeg > 360) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `revolve angleDeg must be in (0, 360]; got ${angleDeg}.`,
      hint: 'Pass an angle in (0, 360]. Use 360 (default) for a full revolve, e.g. 180 for a half revolve.',
    });
    return noShape();
  }
  try {
    shape = OcctBackend.revolveFromSketch(sketchInput, angleDeg);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT revolve failed: ${msg}`,
      hint: 'OCCT could not revolve — the profile may self-intersect or be degenerate.',
    });
    return noShape();
  }
  // revolve sweeps a closed profile around an axis into a solid — an
  // empty / zero-volume result is degenerate, never legitimate.
  {
    const e = emptyResultDiagnostic({
      featureId: r.id, opLabel: 'revolve',
      volumeAfter: (shape as OcctBackend).volume(), isEmpty: (shape as OcctBackend).isEmpty(),
    });
    if (e) ctx.diagnostics.push(e);
  }
  return built(shape);
}

/** True for command kinds that contribute geometry to the profile. Tangency
 *  constructions never reach the lowerer (fromSketchCommands resolves them
 *  into primitive commands first), so they count as non-segments here. */
function isPathSegment(c: SketchCommand): boolean {
  switch (c.kind) {
    case 'lineTo':
    case 'tangentArc':
    case 'threePointsArc':
    case 'sagittaArc':
    case 'bulgeArc':
    case 'radiusArc':
    case 'smoothSpline':
    case 'spline':
    case 'nurbsSegment':
    case 'hermiteG2_2d':
      return true;
    case 'moveTo':
    case 'close':
    case 'tangentCircle':
    case 'tangentLine':
      return false;
  }
}

/** Every x position a command carries. Direction vectors (spline tangents,
 *  hermite tangents/curvatures) and magnitude scalars (sagitta, bulge,
 *  radius) are deliberately excluded — only positions can cross the axis. */
function commandXs(c: SketchCommand): number[] {
  switch (c.kind) {
    case 'moveTo':
    case 'lineTo':
    case 'tangentArc':
    case 'sagittaArc':
    case 'bulgeArc':
    case 'radiusArc':
    case 'smoothSpline':
      return [c.x.evaluated];
    case 'threePointsArc':
      return [c.x.evaluated, c.midX.evaluated];
    case 'spline':
      return c.points.map(p => p.x.evaluated);
    case 'nurbsSegment':
      return c.controlPoints.map(p => p.x.evaluated);
    case 'hermiteG2_2d':
      return [c.ax.evaluated, c.bx.evaluated];
    case 'close':
    case 'tangentCircle':
    case 'tangentLine':
      return [];
  }
}

/** First x < 0 in path order, or undefined when the profile stays on x >= 0. */
function firstNegativeX(commands: SketchCommand[]): number | undefined {
  for (const c of commands) {
    for (const x of commandXs(c)) {
      if (x < 0) return x;
    }
  }
  return undefined;
}
