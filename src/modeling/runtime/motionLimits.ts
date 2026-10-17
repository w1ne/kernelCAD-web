// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/motionLimits.ts
//
// Joint ranges along the animation. Capture-only: no lowering, no solve.
//
//   - Every animation key of a param that is a joint's pose must put that
//     joint inside its declared limits. A key outside is
//     `kinematic.pose.out-of-limits` at error severity (the animation drives
//     the joint past its stops), so the mechanism verdict is 'broken'.
//   - A moving DOF with no declared limit (a revolute without limitsDeg, the
//     offset of a cylindrical joint, ...) cannot be range-checked. It is a
//     "skipped" note on the verdict, not a failure.
//
// Eases do not overshoot, so the keys bound every pose the timeline visits.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { NormalizedAnimationTrack } from '../../shared/intent/animationViewRecord';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { isParamRef, type ParamRefExpr } from '../../shared/runtime/paramRef';
import type { Assembly } from '../capture/assembly';
import type { MateLimitRange } from '../mates/mate';
import { dofLimit, posedDof, unlimitedDofs, type MateDof } from '../mates/mateLimits';
import {
  animatedParams,
  checkMotionIntent,
  hasMotionIntent,
  poseDrivers,
  sessionRecords,
  type PoseDriver,
} from './motionIntent';

const OUT_OF_LIMITS = 'kinematic.pose.out-of-limits' as const;
/** Slack for float noise in authored keys (deg or mm). */
const LIMIT_EPS = 1e-6;

export interface MotionLimitsResult {
  readonly failures: CompilerDiagnostic[];
  /** "joint 'elbow' rotation has no limits, range not checked" notes. */
  readonly skipped: string[];
  /** Animated joints whose keys were checked against declared limits. */
  readonly checked: number;
}

interface Key {
  readonly atMs: number;
  readonly value: number;
}

interface LimitedJoint {
  readonly limits: MateLimitRange;
  readonly dof: MateDof;
}

/** The param expression of a joint pose, or undefined for a fixed number. */
export function exprOf(pose: unknown): ParamRefExpr | undefined {
  if (isParamRef(pose)) return pose._expr;
  const ref = (pose as { paramRef?: unknown } | null)?.paramRef;
  if (typeof ref === 'string') return { kind: 'param', name: ref };
  if (ref !== null && typeof ref === 'object') return ref as ParamRefExpr;
  return undefined;
}

/** Evaluate a pose expression with the given param values. */
export function evaluate(expr: ParamRefExpr, valueOf: (name: string) => number): number {
  switch (expr.kind) {
    case 'lit': return expr.value;
    case 'param': return valueOf(expr.name);
    case 'neg': return -evaluate(expr.expr, valueOf);
    case 'binop': {
      const l = evaluate(expr.left, valueOf);
      const r = evaluate(expr.right, valueOf);
      if (expr.op === '+') return l + r;
      if (expr.op === '-') return l - r;
      if (expr.op === '*') return l * r;
      return l / r;
    }
  }
}

/** A numeric param's current value; NaN when it is missing or not numeric. */
export function currentValue(table: ParamTable, name: string): number {
  if (!table.has(name)) return Number.NaN;
  const v = table.get(name).value;
  if (typeof v === 'number') return v;
  return typeof v === 'boolean' ? (v ? 1 : 0) : Number.NaN;
}

/** Key value as the timeline applies it: clamped to the param's own range. */
export function clampToParam(table: ParamTable, name: string, value: number): number {
  const meta = table.has(name) ? table.get(name).meta : undefined;
  return Math.min(meta?.max ?? Infinity, Math.max(meta?.min ?? -Infinity, value));
}

function jointLimits(arm: Assembly): Map<string, LimitedJoint> {
  const out = new Map<string, LimitedJoint>();
  for (const m of arm.__mates()) {
    const dof = posedDof(m.type);
    const limits = dof === undefined ? undefined : dofLimit(m, dof);
    if (dof !== undefined && limits !== undefined) out.set(m.name, { limits, dof });
  }
  for (const j of arm.__joints()) {
    if (j.kind === 'revolute' && j.limitsDeg) out.set(j.name, { limits: j.limitsDeg, dof: 'rotation' });
    if (j.kind === 'prismatic' && j.limitsMm) out.set(j.name, { limits: j.limitsMm, dof: 'offset' });
  }
  return out;
}

function fmt(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

function outOfLimits(param: string, driver: PoseDriver, joint: LimitedJoint, key: Key, pose: number): CompilerDiagnostic {
  const unit = joint.dof === 'rotation' ? '°' : ' mm';
  const [min, max] = joint.limits;
  const spec = HINT_TEMPLATES[OUT_OF_LIMITS];
  const d: CompilerDiagnostic & { mateName: string; paramName: string } = {
    target: 'export-occt',
    code: OUT_OF_LIMITS,
    severity: 'error',
    message:
      `The animation sets param '${param}' to ${fmt(key.value)} at ${fmt(key.atMs)} ms, which puts joint '${driver.name}' at ` +
      `${fmt(pose)}${unit}, outside its limits [${fmt(min)}, ${fmt(max)}]${unit}.`,
    hint: spec.template,
    nextAction: spec.nextAction,
    mateName: driver.name,
    paramName: param,
  };
  return d;
}

function trackKeys(arm: Assembly): Map<string, Key[]> {
  const keys = new Map<string, Key[]>();
  for (const r of sessionRecords(arm)) {
    if (r.kind !== 'animationView' || r.suppressed) continue;
    const tracks = (r.metadata as { tracks?: NormalizedAnimationTrack[] } | undefined)?.tracks ?? [];
    for (const t of tracks) keys.set(t.param, [...(keys.get(t.param) ?? []), ...t.keys]);
  }
  return keys;
}

/** The first key that puts the joint outside its limits, with that pose. */
function firstKeyOutside(
  table: ParamTable,
  param: string,
  expr: ParamRefExpr,
  joint: LimitedJoint,
  keys: readonly Key[],
): { key: Key; pose: number } | undefined {
  for (const key of keys) {
    const value = clampToParam(table, param, key.value);
    const pose = evaluate(expr, (n) => (n === param ? value : currentValue(table, n)));
    if (!Number.isFinite(pose)) continue;
    if (pose < joint.limits[0] - LIMIT_EPS || pose > joint.limits[1] + LIMIT_EPS) {
      return { key: { atMs: key.atMs, value }, pose };
    }
  }
  return undefined;
}

/** Moving DOFs nobody limited, as verdict notes. */
function unlimitedNotes(arm: Assembly): string[] {
  return arm.__mates().flatMap((m) => unlimitedDofs(m).map((dof) => `joint '${m.name}' ${dof} has no limits, range not checked`));
}

/** Animation keys against joint limits, plus the moving DOFs nobody limited. */
export function checkMotionLimits(arm: Assembly): MotionLimitsResult {
  const skipped = unlimitedNotes(arm);
  const failures: CompilerDiagnostic[] = [];
  const animated = animatedParams(sessionRecords(arm));
  if (animated.size === 0) return { failures, skipped, checked: 0 };

  const table = arm.__session().paramTable;
  const limited = jointLimits(arm);
  const keys = trackKeys(arm);
  const drivers = poseDrivers(arm);
  const checked = new Set<string>();
  for (const param of animated) {
    for (const driver of drivers.get(param) ?? []) {
      const joint = limited.get(driver.name);
      const expr = exprOf(driver.pose);
      if (joint === undefined || expr === undefined || checked.has(driver.name)) continue;
      checked.add(driver.name);
      const hit = firstKeyOutside(table, param, expr, joint, keys.get(param) ?? []);
      if (hit) failures.push(outOfLimits(param, driver, joint, hit.key, hit.pose));
    }
  }
  return { failures, skipped, checked: checked.size };
}

/** Capture-only motion failures every mechanism surface reports, including
 *  the cheap paths that skip the pose sweep: motion on a fastened joint, and
 *  animation keys past a joint's limits. */
export function captureMotionFailures(arm: Assembly): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [...checkMotionIntent(arm)];
  if (hasMotionIntent(arm)) out.push(...checkMotionLimits(arm).failures);
  return out;
}
