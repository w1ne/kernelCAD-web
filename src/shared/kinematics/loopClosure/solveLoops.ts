// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/kinematics/loopClosure/solveLoops.ts
//
// Closed-loop solve with continuation.
//
//   1. The spanning tree is given; each cut joint closes one loop. Closure of
//      a cut joint is a residual: its two joint frames must coincide up to
//      the joint's own motion (revolute: origins meet and axes align, etc.).
//   2. Driven coordinates come from the caller. Tree coordinates on a loop
//      that are not driven are the unknowns; tree joints off every loop keep
//      their seed value.
//   3. Driven coordinates march from their seed value to the target in small
//      steps (≤ 5° / 5 % of the loop size); every step is a damped
//      least-squares solve seeded from the previous step, so the mechanism
//      stays on the branch it started on.
//   4. After each step: the oriented volume det(Qᵀ J_dep) of the dependent
//      Jacobian, transported from the previous step, must stay positive; no
//      dependent coordinate may jump; every `loopMode` pin must hold. A
//      violation stops the march with `kinematic.loop.branch-flip`. A step
//      that does not close stops it with `kinematic.loop.lockup` (or
//      `kinematic.loop.mobility-mismatch` when the loop is over-driven).

import { clusterMobility } from './analysis';
import { jacobian, levenbergMarquardt } from './levenbergMarquardt';
import { orthonormalBasis, projectedDeterminant, singularValues, type Columns } from './linearAlgebra';
import {
  applySlots, characteristicLength, closureResidual, forwardTree, loopElbows, measuredCutCoordinates, readSlots,
  type Coordinates,
} from './kinematics';
import { buildClusters, buildLoops, coordinateCount, isRevoluteLike, unknownSlots, type Cluster, type LoopTopology, type UnknownSlot } from './topology';
import type {
  JointValue, LoopDiagnostic, LoopMobility, LoopPin, LoopSolveInput, LoopSolveResult, LoopSolveStatus,
} from './types';

const DEG = Math.PI / 180;
const DEFAULT_LENGTH_TOL_MM = 1e-6;
const MARCH_STEP_RAD = 5 * DEG;
const MARCH_STEP_LIN = 0.05;
/** A dependent coordinate moving more than this in one march step is a jump
 *  to another branch (rad, or loop-length units). */
const JUMP_RAD = 0.75;
const JUMP_LIN = 0.5;
/** Elbow |sin| at or below this counts as straight. */
const ELBOW_TOL = 1e-9;
/** Alternative seed offsets tried, per unknown, to meet a pin (rad / lref). */
const PIN_SEED_OFFSETS = [0.35, -0.35, 0.7, -0.7, 1.4, -1.4];

interface Ctx {
  readonly input: LoopSolveInput;
  readonly loops: readonly LoopTopology[];
  readonly clusters: readonly Cluster[];
  readonly slots: readonly UnknownSlot[];
  readonly lref: number;
  readonly tol: number;
  readonly start: Readonly<Record<string, JointValue>>;
  readonly target: Readonly<Record<string, JointValue>>;
  readonly cutNames: ReadonlySet<string>;
}

interface Point {
  readonly driven: Record<string, JointValue>;
  readonly x: Float64Array;
  readonly residual: Float64Array;
  readonly iterations: number;
  readonly converged: boolean;
}

export function solveLoops(input: LoopSolveInput): LoopSolveResult {
  const loops = buildLoops(input.model);
  validatePins(loops, input.pins ?? []);
  const ctx = makeContext(input, loops);
  return march(ctx);
}

function validatePins(loops: readonly LoopTopology[], pins: readonly LoopPin[]): void {
  for (const pin of pins) {
    const loop = loops.find((l) => l.name === pin.loop);
    if (loop === undefined) {
      const names = loops.map((l) => `'${l.name}'`).join(', ') || '(none)';
      throw new Error(`loopMode: no loop named '${pin.loop}'. Loops are named after the joint that closes them: ${names}.`);
    }
    const step = loop.steps.find((s) => s.joint.name === pin.joint);
    if (step === undefined || !isRevoluteLike(step.joint.kind)) {
      throw new Error(
        `loopMode: joint '${pin.joint}' is not a revolute joint on loop '${pin.loop}' (joints: ${loop.joints.join(', ')}).`,
      );
    }
  }
}

function makeContext(input: LoopSolveInput, loops: readonly LoopTopology[]): Ctx {
  const model = input.model;
  const cutNames = new Set(model.cuts.map((c) => c.name));
  for (const c of model.cuts) {
    const v = input.driven[c.name];
    if (v !== undefined && (Array.isArray(v) || coordinateCount(c.kind) !== 1)) {
      throw new Error(`loopClosure: joint '${c.name}' closes a loop and can only be driven by a scalar coordinate.`);
    }
  }
  const start: Record<string, JointValue> = {};
  for (const name of Object.keys(input.driven)) {
    if (!cutNames.has(name)) start[name] = input.seed[name] ?? zeroLike(input.driven[name]);
  }
  const startWorld = forwardTree(model, { ...input.seed, ...start });
  // A driven cut joint starts from where the seed pose puts it.
  const measured = measuredCutCoordinates(model.cuts, startWorld);
  for (const name of Object.keys(input.driven)) if (cutNames.has(name)) start[name] = measured[name] ?? 0;
  const lref = loops.length === 0 ? 1 : characteristicLength(loops, startWorld);
  return {
    input,
    loops,
    clusters: buildClusters(loops),
    slots: unknownSlots(model, loops, input.driven),
    lref,
    tol: (input.lengthToleranceMm ?? DEFAULT_LENGTH_TOL_MM) / lref,
    start,
    target: input.driven,
    cutNames,
  };
}

function zeroLike(v: JointValue): JointValue {
  return Array.isArray(v) ? [0, 0, 0] : 0;
}

function treeOnly(values: Readonly<Record<string, JointValue>>, cutNames: ReadonlySet<string>): Record<string, JointValue> {
  const out: Record<string, JointValue> = {};
  for (const [k, v] of Object.entries(values)) if (!cutNames.has(k)) out[k] = v;
  return out;
}

function cutTargets(driven: Readonly<Record<string, JointValue>>, cutNames: ReadonlySet<string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(driven)) if (cutNames.has(k) && typeof v === 'number') out[k] = v;
  return out;
}

function baseCoords(ctx: Ctx, driven: Readonly<Record<string, JointValue>>): Coordinates {
  return { ...ctx.input.seed, ...treeOnly(driven, ctx.cutNames) };
}

function residualFn(ctx: Ctx, driven: Readonly<Record<string, JointValue>>): (x: Float64Array) => Float64Array {
  const base = baseCoords(ctx, driven);
  const targets = cutTargets(driven, ctx.cutNames);
  return (x) => closureResidual(ctx.input.model.cuts, forwardTree(ctx.input.model, applySlots(base, ctx.slots, x, ctx.lref)), ctx.lref, targets).r;
}

function solveAt(ctx: Ctx, driven: Record<string, JointValue>, x0: Float64Array): Point {
  const tol = ctx.tol;
  const lm = levenbergMarquardt(
    { residual: residualFn(ctx, driven), converged: (r) => r.every((v) => Math.abs(v) <= tol) },
    x0,
  );
  return { driven, x: lm.x, residual: lm.r, iterations: lm.iterations, converged: lm.converged };
}

function coordsOf(ctx: Ctx, p: Point): Coordinates {
  return applySlots(baseCoords(ctx, p.driven), ctx.slots, p.x, ctx.lref);
}

function elbowsAt(ctx: Ctx, p: Point): Record<string, -1 | 0 | 1> {
  const world = forwardTree(ctx.input.model, coordsOf(ctx, p));
  return Object.assign({}, ...ctx.loops.map((l) => loopElbows(l, world, ELBOW_TOL)));
}

function dependentJacobian(ctx: Ctx, p: Point): Columns {
  return jacobian(residualFn(ctx, p.driven), p.x);
}

/** Interpolated driven values at fraction t of the march. */
function drivenAt(ctx: Ctx, t: number): Record<string, JointValue> {
  const out: Record<string, JointValue> = {};
  for (const [k, target] of Object.entries(ctx.target)) {
    const s = ctx.start[k];
    if (typeof target === 'number') {
      const a = typeof s === 'number' ? s : 0;
      out[k] = a + (target - a) * t;
    } else {
      const a = typeof s === 'number' || s === undefined ? [0, 0, 0] : s;
      out[k] = [0, 1, 2].map((i) => a[i] + (target[i] - a[i]) * t) as [number, number, number];
    }
  }
  return out;
}

function marchSteps(ctx: Ctx): number {
  let worst = 0;
  for (const [k, target] of Object.entries(ctx.target)) {
    const s = ctx.start[k];
    const isLin = jointKindOf(ctx, k) === 'prismatic';
    const deltas = typeof target === 'number'
      ? [target - (typeof s === 'number' ? s : 0)]
      : target.map((v, i) => v - (typeof s === 'number' || s === undefined ? 0 : s[i]));
    for (const d of deltas) worst = Math.max(worst, isLin ? Math.abs(d) / ctx.lref / MARCH_STEP_LIN : (Math.abs(d) * DEG) / MARCH_STEP_RAD);
  }
  return Math.ceil(worst - 1e-12);
}

function jointKindOf(ctx: Ctx, name: string): string | undefined {
  const m = ctx.input.model;
  return (m.tree.find((e) => e.name === name) ?? m.cuts.find((e) => e.name === name))?.kind;
}

function pinViolated(ctx: Ctx, elbows: Readonly<Record<string, -1 | 0 | 1>>): LoopPin | undefined {
  for (const pin of ctx.input.pins ?? []) {
    const s = elbows[`${pin.loop}/${pin.joint}`];
    if (s === (pin.sign === '+' ? -1 : 1)) return pin;
  }
  return undefined;
}

/** Solve at `driven`; when a pin is not met, retry from alternative seeds
 *  (the seed sits on the other branch, or flat where both branches meet). */
function solveMeetingPins(ctx: Ctx, driven: Record<string, JointValue>, x0: Float64Array): Point {
  const first = solveAt(ctx, driven, x0);
  if (!first.converged || pinViolated(ctx, elbowsAt(ctx, first)) === undefined) return first;
  for (let i = 0; i < x0.length; i++) {
    for (const off of PIN_SEED_OFFSETS) {
      const seed = Float64Array.from(first.x);
      seed[i] += off;
      const p = solveAt(ctx, driven, seed);
      if (p.converged && pinViolated(ctx, elbowsAt(ctx, p)) === undefined) return p;
    }
  }
  return first;
}

/** A pin whose elbow was straight at the previous pose has no branch to
 *  keep yet, so it may still choose one. */
function pinUndecided(ctx: Ctx, elbows: Readonly<Record<string, -1 | 0 | 1>>, next: Point): boolean {
  const pin = pinViolated(ctx, elbowsAt(ctx, next));
  return pin !== undefined && elbows[`${pin.loop}/${pin.joint}`] === 0;
}

interface Finding {
  readonly status: LoopSolveStatus;
  readonly diagnostic: LoopDiagnostic;
}

/** The seed already closes the loop at the target values (e.g. a caller
 *  passing every coordinate of a pose solved earlier): nothing to march. */
function closedAtTarget(ctx: Ctx): Point | undefined {
  const x0 = readSlots(ctx.input.seed, ctx.slots, ctx.lref);
  const driven = { ...ctx.target };
  const r = residualFn(ctx, driven)(x0);
  if (!r.every((v) => Math.abs(v) <= ctx.tol)) return undefined;
  const p: Point = { driven, x: x0, residual: r, iterations: 0, converged: true };
  return pinViolated(ctx, elbowsAt(ctx, p)) === undefined ? p : undefined;
}

function march(ctx: Ctx): LoopSolveResult {
  const direct = closedAtTarget(ctx);
  if (direct !== undefined) {
    const basis = orthonormalBasis(dependentJacobian(ctx, direct));
    return finish(ctx, direct, undefined, false, basis, 0);
  }
  let good = solveMeetingPins(ctx, { ...ctx.start }, readSlots(ctx.input.seed, ctx.slots, ctx.lref));
  let iterations = good.iterations;
  if (!good.converged) return finish(ctx, good, notClosed(ctx, good, good), false, undefined, iterations);
  const pinAtStart = pinViolated(ctx, elbowsAt(ctx, good));
  if (pinAtStart !== undefined) {
    return finish(ctx, good, { status: 'branch-flip', diagnostic: pinFlip(good, pinAtStart) }, false, undefined, iterations);
  }
  let basis = ctx.input.previous?.basis ?? orthonormalBasis(dependentJacobian(ctx, good));
  const singularStart = basis === undefined && ctx.input.previous === undefined;
  let elbows = ctx.input.previous?.elbows ?? elbowsAt(ctx, good);
  const n = marchSteps(ctx);
  for (let i = 1; i <= n; i++) {
    let next = solveAt(ctx, drivenAt(ctx, i / n), good.x);
    if (next.converged && pinUndecided(ctx, elbows, next)) next = solveMeetingPins(ctx, next.driven, good.x);
    iterations += next.iterations;
    if (!next.converged) return finish(ctx, good, notClosed(ctx, good, next), singularStart, basis, iterations);
    const J = dependentJacobian(ctx, next);
    const nextElbows = elbowsAt(ctx, next);
    const flip = branchCheck(ctx, good, next, basis, J, elbows, nextElbows);
    if (flip !== undefined) return finish(ctx, good, { status: 'branch-flip', diagnostic: flip }, singularStart, basis, iterations);
    basis = orthonormalBasis(J);
    elbows = nextElbows;
    good = next;
  }
  return finish(ctx, good, undefined, singularStart, basis, iterations);
}

function branchCheck(
  ctx: Ctx,
  prev: Point,
  next: Point,
  basis: Columns | undefined,
  J: Columns,
  elbows: Readonly<Record<string, -1 | 0 | 1>>,
  nextElbows: Readonly<Record<string, -1 | 0 | 1>>,
): LoopDiagnostic | undefined {
  const pin = pinViolated(ctx, nextElbows);
  if (pin !== undefined) return pinFlip(next, pin);
  const flipped = basis !== undefined && basis.length === J.length && orthonormalBasis(J) !== undefined && projectedDeterminant(basis, J) <= 0;
  const jump = largestJump(ctx, prev, next);
  if (!flipped && !jump.exceeded) return undefined;
  const changed = Object.keys(nextElbows).find((k) => elbows[k] !== undefined && elbows[k] !== nextElbows[k]);
  const [loop, joint] = changed !== undefined ? changed.split('/') : [loopOfJoint(ctx, jump.joint), jump.joint];
  const why = flipped
    ? 'the closure Jacobian changed orientation (the mechanism passed a singular configuration onto the other assembly mode)'
    : `joint '${jump.joint}' jumped ${jump.amount} in one step`;
  return {
    code: 'kinematic.loop.branch-flip',
    severity: 'warning',
    loop,
    joint,
    pose: { ...next.driven },
    message:
      `Loop '${loop}' changes branch at joint '${joint}' between ${formatPose(prev.driven)} and ${formatPose(next.driven)}: ${why}. ` +
      `Stopped at the last pose on the original branch. If going over center is intended this is the over-center point; ` +
      `otherwise limit the driven range or pin the branch with assembly.loopMode('${loop}', { joint, sign }).`,
  };
}

function largestJump(ctx: Ctx, prev: Point, next: Point): { exceeded: boolean; joint: string; amount: string } {
  let best = -1;
  let idx = -1;
  ctx.slots.forEach((s, i) => {
    const ratio = Math.abs(next.x[i] - prev.x[i]) / (s.unit === 'lin' ? JUMP_LIN : JUMP_RAD);
    if (ratio > best) {
      best = ratio;
      idx = i;
    }
  });
  if (idx < 0) return { exceeded: false, joint: '', amount: '' };
  const s = ctx.slots[idx];
  const d = Math.abs(next.x[idx] - prev.x[idx]);
  const amount = s.unit === 'lin' ? `${(d * ctx.lref).toFixed(2)} mm` : `${(d / DEG).toFixed(1)}°`;
  return { exceeded: best > 1, joint: s.joint, amount };
}

function loopOfJoint(ctx: Ctx, joint: string): string {
  return (ctx.loops.find((l) => l.joints.includes(joint)) ?? ctx.loops[0]).name;
}

function pinFlip(p: Point, pin: LoopPin): LoopDiagnostic {
  return {
    code: 'kinematic.loop.branch-flip',
    severity: 'warning',
    loop: pin.loop,
    joint: pin.joint,
    pose: { ...p.driven },
    message:
      `Loop '${pin.loop}' cannot keep the pinned elbow sign '${pin.sign}' at joint '${pin.joint}' at ${formatPose(p.driven)}: ` +
      `the mechanism goes over center there. Stopped at the last pose that meets the pin.`,
  };
}

function ambiguousStart(ctx: Ctx, p: Point, mobility: readonly LoopMobility[]): LoopDiagnostic | undefined {
  const pinned = new Set((ctx.input.pins ?? []).map((pin) => pin.loop));
  const m = mobility.find((x) => x.drivenDof > 0 && x.drivenDof === x.mobility && !x.loops.some((l) => pinned.has(l)));
  if (m === undefined) return undefined;
  const loop = m.loops[0];
  return {
    code: 'kinematic.loop.branch-ambiguous',
    severity: 'warning',
    loop,
    pose: { ...p.driven },
    message:
      `Loop '${loop}' starts at a singular configuration (folded flat or straight), so continuation had no branch to follow ` +
      `and the solver picked one. Pin the intended branch with assembly.loopMode('${loop}', { joint, sign: '+' | '-' }).`,
  };
}

function notClosed(ctx: Ctx, good: Point, failed: Point): Finding {
  const coords = coordsOf(ctx, good);
  const overDriven = ctx.clusters
    .map((c) => clusterMobility(ctx.input.model, c, coords, ctx.input.driven, ctx.lref))
    .find((m) => m.drivenDof > m.mobility);
  if (overDriven !== undefined) {
    return {
      status: 'over-driven',
      diagnostic: {
        code: 'kinematic.loop.mobility-mismatch',
        severity: 'error',
        loop: overDriven.loops[0],
        pose: { ...failed.driven },
        message:
          `Loop '${overDriven.loops[0]}' is over-driven: ${overDriven.drivenDof} driven coordinate(s) for ${overDriven.mobility} degree(s) of freedom, ` +
          `and the driven values at ${formatPose(failed.driven)} do not close the loop. Drive only ${overDriven.mobility} joint(s) of this loop.`,
      },
    };
  }
  return { status: 'lockup', diagnostic: lockup(ctx, good, failed) };
}

function lockup(ctx: Ctx, good: Point, failed: Point): LoopDiagnostic {
  const cutIdx = worstCut(ctx, failed);
  const loop = ctx.loops[cutIdx]?.name ?? ctx.loops[0].name;
  const joint = stuckJoint(ctx, good) ?? loop;
  const since = good === failed ? '' : ` (last closed pose: ${formatPose(good.driven)})`;
  return {
    code: 'kinematic.loop.lockup',
    severity: 'error',
    loop,
    joint,
    pose: { ...failed.driven },
    message:
      `Loop '${loop}' locks up at ${formatPose(failed.driven)}${since}: the loop cannot close there. ` +
      `Joint '${joint}' is at a singular configuration (the closure Jacobian loses rank), so the driven joint cannot move further this way. ` +
      `Limit the driven range, or change link lengths so the mechanism can pass this pose.`,
  };
}

/** Index of the cut joint whose closure rows are largest at the failed pose. */
function worstCut(ctx: Ctx, failed: Point): number {
  const per = ctx.loops.map((l) => {
    const rows = closureResidual([l.steps[0].joint], forwardTree(ctx.input.model, coordsOf(ctx, failed)), ctx.lref, {}).r;
    return rows.reduce((a, v) => Math.max(a, Math.abs(v)), 0);
  });
  return per.indexOf(Math.max(...per));
}

/** Dependent joint with the largest share of the near-null direction. */
function stuckJoint(ctx: Ctx, p: Point): string | undefined {
  if (ctx.slots.length === 0) return undefined;
  const { right } = singularValues(dependentJacobian(ctx, p));
  const v = right[right.length - 1];
  let best = 0;
  v.forEach((c, i) => {
    if (Math.abs(c) > Math.abs(v[best])) best = i;
  });
  return ctx.slots[best]?.joint;
}

function formatPose(pose: Readonly<Record<string, JointValue>>): string {
  const parts = Object.entries(pose).map(([k, v]) =>
    `${k}=${Array.isArray(v) ? `[${v.map((c) => c.toFixed(2)).join(', ')}]` : (v as number).toFixed(2)}`,
  );
  return parts.length === 0 ? 'the as-built pose' : parts.join(', ');
}

function mobilityWarnings(mobility: readonly LoopMobility[]): LoopDiagnostic[] {
  return mobility
    .filter((m) => m.drivenDof > 0 && m.drivenDof < m.mobility)
    .map((m) => ({
      code: 'kinematic.loop.mobility-mismatch' as const,
      severity: 'warning' as const,
      loop: m.loops[0],
      message:
        `Loop '${m.loops[0]}' is under-driven: ${m.drivenDof} driven coordinate(s) for ${m.mobility} degree(s) of freedom. ` +
        `The other ${m.mobility - m.drivenDof} free coordinate(s) stay as close to the seed pose as closure allows; drive them for a unique pose.`,
    }));
}

function finish(
  ctx: Ctx,
  p: Point,
  finding: Finding | undefined,
  singularStart: boolean,
  basis: Columns | undefined,
  iterations: number,
): LoopSolveResult {
  const coords = coordsOf(ctx, p);
  const world = forwardTree(ctx.input.model, coords);
  const mobility = ctx.clusters.map((c) => clusterMobility(ctx.input.model, c, coords, ctx.input.driven, ctx.lref));
  const amb = singularStart ? ambiguousStart(ctx, p, mobility) : undefined;
  const all = [...(amb ? [amb] : []), ...mobilityWarnings(mobility), ...(finding ? [finding.diagnostic] : [])];
  const elbows = elbowsAt(ctx, p);
  const closure = closureResidual(ctx.input.model.cuts, world, ctx.lref, {});
  let residualMm = 0;
  let residualRad = 0;
  closure.r.forEach((v, i) => {
    if (closure.isPos[i]) residualMm = Math.max(residualMm, Math.abs(v) * ctx.lref);
    else residualRad = Math.max(residualRad, Math.abs(v));
  });
  return {
    status: finding?.status ?? 'solved',
    transforms: world,
    coordinates: { ...coords, ...measuredCutCoordinates(ctx.input.model.cuts, world) },
    reachedDriven: { ...p.driven },
    loops: ctx.loops.map((l) => ({ name: l.name, cutJoint: l.cutJoint, joints: l.joints })),
    mobility,
    diagnostics: all,
    elbows,
    state: { basis: basis === undefined ? undefined : [...basis], elbows },
    residualMm,
    residualRad,
    iterations,
  };
}
