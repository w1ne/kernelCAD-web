// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import type { SketchCommand } from '../../../../shared/capture/sketchCommand';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { emptyResultDiagnostic } from '../additiveNoOp';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

type Vec3 = [number, number, number];

interface RevolveAxisWorld {
  /** World-space axis direction. The sketch is lifted to XZ, so a sketch
   *  direction [dx, dy] becomes [dx, 0, dy]. */
  axis: Vec3;
  /** World-space point on the axis. */
  origin: Vec3;
  /** False for the historical x = 0 axis (world +Z). */
  custom: boolean;
}

/** `revolve` — spins a closed sketch profile around the Z axis by default, or
 *  around an explicit in-plane axis from `opts.axis`. Validates the profile
 *  (non-empty, stays on one side of the axis) and the optional partial angle. */
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
  const axis = resolveRevolveAxis(r);
  if ('error' in axis) {
    ctx.diagnostics.push(axis.error);
    return noShape();
  }
  const profileError = profileAxisDiagnostic(commands, axis, r);
  if (profileError) {
    ctx.diagnostics.push(profileError);
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
    shape = centreSymmetric(
      r,
      OcctBackend.revolveFromSketch(sketchInput, angleDeg, axis.axis, axis.origin),
      angleDeg,
      axis.axis,
      axis.origin,
    );
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

/** A partial revolve sweeps from the sketch plane (y = 0) toward +Y; a
 *  symmetric one is turned back by half the angle about the revolve axis so
 *  it spans angleDeg/2 to each side. A full revolve needs no turn. */
function centreSymmetric(
  r: FeatureRecord,
  shape: ShapeBackend,
  angleDeg: number,
  axis: Vec3,
  origin: Vec3,
): ShapeBackend {
  if ((r.params.symmetric?.evaluated ?? 0) <= 0.5 || angleDeg >= 360) return shape;
  return shape.rotate(axis, -angleDeg / 2, origin);
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

/** Axis-cross check: a profile that spans the rotation axis yields a
 *  self-intersecting revolve. Every segment kind's carried positions
 *  participate — line/arc endpoints, arc midpoints, spline waypoints, NURBS
 *  control points, hermite endpoints — not just the pen-command endpoints. */
function profileAxisDiagnostic(
  commands: SketchCommand[],
  axis: RevolveAxisWorld,
  r: FeatureRecord,
): CompilerDiagnostic | undefined {
  if (axis.custom) {
    const crossing = firstCrossingPoint(commands, axis);
    if (!crossing) return undefined;
    return {
      target: 'export-occt',
      code: 'feature.revolve.crosses-axis',
      featureId: r.id,
      severity: 'error',
      message:
        `revolve profile crosses the axis through [${axis.origin[0]}, ${axis.origin[2]}] ` +
        `along [${axis.axis[0]}, ${axis.axis[2]}]: point [${crossing.a[0]}, ${crossing.a[1]}] ` +
        `and point [${crossing.b[0]}, ${crossing.b[1]}] lie on opposite sides.`,
      hint: 'A revolve profile must stay on one side of the rotation axis. Move the profile or the axis.',
    };
  }
  const crossingX = firstNegativeX(commands);
  if (crossingX === undefined) return undefined;
  return {
    target: 'export-occt',
    code: 'feature.revolve.crosses-axis',
    featureId: r.id,
    severity: 'error',
    message: `revolve profile point (x=${crossingX}) crosses rotation axis. All points must satisfy x >= 0.`,
    hint: 'A revolve profile must stay on one side of the rotation axis. Clamp all path coordinates to x >= 0.',
  };
}

/** Read the optional `opts.axis` params. All four are recorded together by
 *  the capture layer; a partial set is a malformed record, not a default. */
function resolveRevolveAxis(r: FeatureRecord): RevolveAxisWorld | { error: CompilerDiagnostic } {
  const throughX = r.params.axisThroughX?.evaluated;
  const throughY = r.params.axisThroughY?.evaluated;
  const dirX = r.params.axisDirectionX?.evaluated;
  const dirY = r.params.axisDirectionY?.evaluated;
  const present = [throughX, throughY, dirX, dirY].filter((value) => value !== undefined).length;
  if (present === 0) {
    return { axis: [0, 0, 1], origin: [0, 0, 0], custom: false };
  }
  const invalid = (message: string, hint: string): { error: CompilerDiagnostic } => ({
    error: {
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message,
      hint,
    },
  });
  if (present !== 4) {
    return invalid(
      `revolve axis is incomplete (through=[${throughX}, ${throughY}], direction=[${dirX}, ${dirY}]).`,
      'Record the axis through and direction together — use Sketch.revolve({ axis: { through, direction } }).',
    );
  }
  const values = [throughX!, throughY!, dirX!, dirY!];
  if (!values.every((value) => Number.isFinite(value))) {
    return invalid(
      `revolve axis must be finite; got through=[${throughX}, ${throughY}], direction=[${dirX}, ${dirY}].`,
      'Pass finite numbers or ParamRefs for the axis through point and direction.',
    );
  }
  if (Math.hypot(dirX!, dirY!) < 1e-12) {
    return invalid(
      `revolve axis direction must be non-zero; got [${dirX}, ${dirY}].`,
      'Pass a non-zero [dx, dy] direction in sketch coordinates.',
    );
  }
  return { axis: [dirX!, 0, dirY!], origin: [throughX!, 0, throughY!], custom: true };
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

/** Every 2D position a command carries, in path order. The same positions
 *  `commandXs` checks, paired with their y for the arbitrary-axis side test. */
function commandPoints(c: SketchCommand): Array<[number, number]> {
  switch (c.kind) {
    case 'moveTo':
    case 'lineTo':
    case 'tangentArc':
    case 'sagittaArc':
    case 'bulgeArc':
    case 'radiusArc':
    case 'smoothSpline':
      return [[c.x.evaluated, c.y.evaluated]];
    case 'threePointsArc':
      return [[c.x.evaluated, c.y.evaluated], [c.midX.evaluated, c.midY.evaluated]];
    case 'spline':
      return c.points.map((p) => [p.x.evaluated, p.y.evaluated]);
    case 'nurbsSegment':
      return c.controlPoints.map((p) => [p.x.evaluated, p.y.evaluated]);
    case 'hermiteG2_2d':
      return [[c.ax.evaluated, c.ay.evaluated], [c.bx.evaluated, c.by.evaluated]];
    case 'close':
    case 'tangentCircle':
    case 'tangentLine':
      return [];
  }
}

/** First pair of profile points on opposite sides of the custom axis, or
 *  undefined when every point is on one side (or on the axis). The signed
 *  distance uses the 2D cross product so no trigonometry is needed. */
function firstCrossingPoint(
  commands: SketchCommand[],
  axis: RevolveAxisWorld,
): { a: [number, number]; b: [number, number] } | undefined {
  const len = Math.hypot(axis.axis[0], axis.axis[2]);
  if (!(len > 0)) return undefined;
  const nx = axis.axis[0] / len;
  const ny = axis.axis[2] / len;
  const ax = axis.origin[0];
  const ay = axis.origin[2];
  const tolerance = 1e-9;
  let positive: [number, number] | undefined;
  let negative: [number, number] | undefined;
  for (const c of commands) {
    for (const [px, py] of commandPoints(c)) {
      const signed = nx * (py - ay) - ny * (px - ax);
      if (signed > tolerance && positive === undefined) positive = [px, py];
      if (signed < -tolerance && negative === undefined) negative = [px, py];
      if (positive !== undefined && negative !== undefined) return { a: positive, b: negative };
    }
  }
  return undefined;
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
