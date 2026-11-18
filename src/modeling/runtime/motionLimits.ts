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
//   - A mate coupled to an animated joint (`coupleMates`) moves with it, at
//     source * ratio + offset, so its keys are checked against its own limits.
//
// Eases do not overshoot, so the keys bound every pose the timeline visits.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { NormalizedAnimationTrack } from '../../shared/intent/animationViewRecord';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { isParamRef, type ParamRefExpr } from '../../shared/runtime/paramRef';
import type { Assembly } from '../capture/assembly';
import type { MateCouplingRecord } from '../mates/coupledPoses';
import type { MateLimitRange } from '../mates/mate';
import { dofLimit, posedDof, unlimitedDofs, type MateDof } from '../mates/mateLimits';
import {
  animatedParams,
  checkMotionIntent,
  hasMotionIntent,
  poseDrivers,
  sessionRecords,
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
    case 'min': return Math.min(evaluate(expr.left, valueOf), evaluate(expr.right, valueOf));
    case 'max': return Math.max(evaluate(expr.left, valueOf), evaluate(expr.right, valueOf));
    case 'abs': return Math.abs(evaluate(expr.expr, valueOf));
    case 'clamp': {
      const v = evaluate(expr.value, valueOf);
      const lo = evaluate(expr.min, valueOf);
      const hi = evaluate(expr.max, valueOf);
      return Math.min(hi, Math.max(lo, v));
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

/** Clamp a sampled animation value to the param range used by pose evaluation. */
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

/** How an animated param sets one joint: the pose at a key value, and the
 *  coupling source when the joint follows another joint. */
interface PosedJoint {
  readonly poseAt: (value: number) => number;
  readonly coupledTo?: string;
}

function outOfLimits(param: string, name: string, joint: LimitedJoint, posed: PosedJoint, key: Key, pose: number): CompilerDiagnostic {
  const unit = joint.dof === 'rotation' ? '°' : ' mm';
  const [min, max] = joint.limits;
  const spec = HINT_TEMPLATES[OUT_OF_LIMITS];
  const d: CompilerDiagnostic & { mateName: string; paramName: string } = {
    target: 'export-occt',
    code: OUT_OF_LIMITS,
    severity: 'error',
    message:
      `The animation sets param '${param}' to ${fmt(key.value)} at ${fmt(key.atMs)} ms, which puts joint '${name}' at ` +
      `${fmt(pose)}${unit}${posed.coupledTo === undefined ? '' : ` through its coupling to '${posed.coupledTo}'`}, ` +
      `outside its limits [${fmt(min)}, ${fmt(max)}]${unit}.`,
    hint: spec.template,
    nextAction: spec.nextAction,
    mateName: name,
    paramName: param,
  };
  return d;
}

function trackKeys(arm: Assembly): Map<string, Key[]> {
  const keys = new Map<string, Key[]>();
  for (const r of sessionRecords(arm)) {
    if (r.kind !== 'animationView' || r.suppressed) continue;
    const tracks = (r.metadata as { tracks?: NormalizedAnimationTrack[] } | undefined)?.tracks ?? [];
    for (const t of tracks) {
      keys.set(t.param, [
        ...(keys.get(t.param) ?? []),
        ...t.keys.map((key) => ({ atMs: key.atMs, value: key.authoredValue ?? key.value })),
      ]);
    }
  }
  return keys;
}

/** The first key that puts the joint outside its limits, with that pose. */
function firstKeyOutside(
  posed: PosedJoint,
  joint: LimitedJoint,
  keys: readonly Key[],
): { key: Key; pose: number } | undefined {
  for (const key of keys) {
    const pose = posed.poseAt(key.value);
    if (!Number.isFinite(pose)) continue;
    if (pose < joint.limits[0] - LIMIT_EPS || pose > joint.limits[1] + LIMIT_EPS) {
      return { key, pose };
    }
  }
  return undefined;
}

/** Every coupleMates record in the session (a sub-assembly may own one). */
function sessionCouplings(arm: Assembly): MateCouplingRecord[] {
  const assemblies = Array.from(arm.__session().assemblies.values()) as Assembly[];
  return assemblies.flatMap((a) => a.__mateCouplings());
}

/** The joints one animated param moves: the joints whose pose expression
 *  reads it, then every mate coupled to one of those, through chains. */
function posedJoints(
  table: ParamTable,
  param: string,
  drivers: ReturnType<typeof poseDrivers>,
  couplings: readonly MateCouplingRecord[],
): Map<string, PosedJoint> {
  const posed = new Map<string, PosedJoint>();
  for (const driver of drivers.get(param) ?? []) {
    const expr = exprOf(driver.pose);
    if (expr === undefined || posed.has(driver.name)) continue;
    posed.set(driver.name, {
      poseAt: (value) => evaluate(expr, (n) => (n === param ? value : currentValue(table, n))),
    });
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of couplings) {
      const source = posed.get(c.source);
      if (source === undefined || posed.has(c.driven)) continue;
      posed.set(c.driven, {
        poseAt: (value) => source.poseAt(value) * c.ratio + (c.offset ?? 0),
        coupledTo: c.source,
      });
      grew = true;
    }
  }
  return posed;
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
  const couplings = sessionCouplings(arm);
  const checked = new Set<string>();
  for (const param of animated) {
    for (const [name, posed] of posedJoints(table, param, drivers, couplings)) {
      const joint = limited.get(name);
      if (joint === undefined || checked.has(name)) continue;
      checked.add(name);
      const hit = firstKeyOutside(posed, joint, keys.get(param) ?? []);
      if (hit) failures.push(outOfLimits(param, name, joint, posed, hit.key, hit.pose));
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
