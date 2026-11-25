// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pose strictness for the mate solver (issue #1765):
//   - a resolved mate pose MUST be a finite number (`currentValue` passes any
//     non-ParamRef input through unchanged, so a `{ param: '<Name>' }` object
//     used to reach the SE(3) math and produce NaN placements while the solve
//     still reported `solved`);
//   - a solved placement MUST be finite;
//   - an explicit caller override outside the mate's declared travel range is
//     reported as `kinematic.pose.out-of-limits`.
//
// Kept out of `solver.ts` so the solver stays under the `max-lines` ratchet.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Transform } from '../../shared/runtime/se3';
import type { MateRecord } from './mate';

/** Explicit caller-override pose outside the mate's declared travel range.
 *  Advisory on the solver result (the pose is still applied, matching the
 *  v0.6 `kinematic.pose.out-of-limits` convention used by `Assembly.solve`);
 *  the MCP `solve_mates` tool turns it into a hard `ok: false` because the
 *  override is the caller's own argument. */
export interface SolveLimitDiagnostic {
  readonly code: 'kinematic.pose.out-of-limits';
  readonly severity: 'warning';
  readonly message: string;
  readonly mateName: string;
  readonly pose: number;
  readonly field: 'limitsDeg' | 'limitsMm';
  readonly limits: readonly [number, number];
}

/**
 * Declared travel range a scalar pose of this mate must stay inside, if any.
 * Ball mates declare no per-axis range, so they are skipped.
 */
function scalarPoseLimitField(
  mate: MateRecord,
): { field: 'limitsDeg' | 'limitsMm'; limits: readonly [number, number] } | undefined {
  if (mate.type === 'revolute' || mate.type === 'cylindrical' || mate.type === 'pin_slot') {
    return mate.limitsDeg === undefined ? undefined : { field: 'limitsDeg', limits: mate.limitsDeg };
  }
  if (mate.type === 'prismatic') {
    return mate.limitsMm === undefined ? undefined : { field: 'limitsMm', limits: mate.limitsMm };
  }
  return undefined;
}

/** One `kinematic.pose.out-of-limits` warning when `pose` leaves the mate's
 *  declared travel range. Exported so the MCP `solve_mates` tool can reject
 *  the same override as an argument error instead of solving it silently. */
export function mateLimitViolation(mate: MateRecord, pose: number): SolveLimitDiagnostic | undefined {
  if (!Number.isFinite(pose)) return undefined;
  const declared = scalarPoseLimitField(mate);
  if (declared === undefined) return undefined;
  const [min, max] = declared.limits;
  if (pose >= min && pose <= max) return undefined;
  const unit = declared.field === 'limitsDeg' ? '°' : 'mm';
  return {
    code: 'kinematic.pose.out-of-limits',
    severity: 'warning',
    message: `mate '${mate.name}' pose ${pose}${unit} exceeds declared ${declared.field} [${min}, ${max}]`,
    mateName: mate.name,
    pose,
    field: declared.field,
    limits: declared.limits,
  };
}

function poseValueText(raw: unknown): string {
  try {
    return JSON.stringify(raw) ?? String(raw);
  } catch {
    return String(raw);
  }
}

/**
 * A resolved mate pose MUST be a finite number. Fails loudly at the pose so a
 * bad pose can never reach the SE(3) math (issue #1765).
 */
export function requireFinitePose(
  mate: MateRecord,
  raw: unknown,
  axis: 'x' | 'y' | 'z' | undefined,
): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const component = axis === undefined ? '' : ` for the ${axis} component`;
  const legacyParamObject = raw !== null && typeof raw === 'object' && 'param' in (raw as Record<string, unknown>);
  invalidArgs({
    api: `mate('${mate.name}', a, b, '${mate.type}', { pose })`,
    path: axis === undefined ? `mate('${mate.name}').pose` : `mate('${mate.name}').pose.${axis}`,
    gotText: `${poseValueText(raw)} (${raw === null ? 'null' : typeof raw})`,
    requires:
      `a finite number or a ParamRef<number>${component} ` +
      `(${mate.type === 'prismatic' ? 'mm' : 'deg'}) for the '${mate.type}' mate pose`,
    unit: mate.type === 'prismatic' ? 'mm' : 'deg',
    example: mate.type === 'prismatic'
      ? `const stroke = param('Stroke', 25, { min: -40, max: 40 }); arm.mate('${mate.name}', 'rail.track', 'carriage.bore', 'prismatic', { pose: stroke })`
      : `const angle = param('Angle', 45, { min: -90, max: 90 }); arm.mate('${mate.name}', 'base.hinge', 'link.hinge', '${mate.type}', { pose: angle })`,
    ...(legacyParamObject
      ? { hint: "{ param: '<Name>' } is not a .kcad.ts pose. Pass the declared param binding instead (const <binding> = param('<Name>', ...))." }
      : {}),
    hintSlug: 'invalid-args.assembly.mate-pose-not-finite',
  });
}

/** Every solved placement must be finite. NaN / Infinity here means a pose
 *  never resolved to a number, so the whole solve is untrustworthy. */
export function assertFinitePlacements(poses: ReadonlyMap<string, Transform>): void {
  for (const [partName, placement] of poses) {
    const matrix = placement.toMat4();
    if (matrix.every((value) => Number.isFinite(value))) continue;
    invalidArgs({
      api: 'solve_mates',
      path: `poses.${partName}`,
      gotText: matrix.some((value) => Number.isNaN(value)) ? 'NaN' : 'Infinity',
      requires: 'a finite solved transform for every part; NaN / Infinity means a mate pose did not resolve to a number',
      example: "const stroke = param('Stroke', 25); arm.mate('stage-slide', 'rail.track', 'carriage.bore', 'prismatic', { pose: stroke })",
      hint:
        `Part '${partName}' solved to a non-finite transform. Check that every mate pose is a finite number ` +
        "or a declared ParamRef; a { param: '<Name>' } pose object resolves to NaN.",
      hintSlug: 'invalid-args.assembly.solved-transform-not-finite',
    });
  }
}

/** Attach caller-override limit warnings to a solve result when any fired. */
export function withLimitDiagnostics<T extends object>(
  result: T,
  diagnostics: readonly SolveLimitDiagnostic[],
): T & { diagnostics?: readonly SolveLimitDiagnostic[] } {
  return diagnostics.length === 0 ? result : { ...result, diagnostics };
}
