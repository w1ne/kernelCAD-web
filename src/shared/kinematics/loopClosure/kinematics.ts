// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/kinematics/loopClosure/kinematics.ts
//
// Forward kinematics over the spanning tree, closure residuals at the cut
// joints, measured cut coordinates and loop elbow signs.
//
// Residual scaling: position rows are joint-origin gaps divided by the loop's
// characteristic length `lref` (mm), orientation rows are dimensionless
// (sine-like) — so both are O(1) and one damping factor fits both.

import { Transform, type Vec3 } from '../../runtime/se3';
import { isRevoluteLike, type CycleStep, type LoopTopology, type UnknownSlot } from './topology';
import type { JointValue, LoopJoint, LoopJointKind, LoopModel } from './types';

const DEG = Math.PI / 180;

export type Coordinates = Record<string, JointValue>;

/** Joint motion at coordinate `q`, the same math as the mate and joint-graph
 *  forward kinematics: rotation about `axis` (deg), translation along it
 *  (mm), or an extrinsic XYZ Euler triple (deg). */
export function jointMotion(kind: LoopJointKind, q: JointValue | undefined, axis: Vec3): Transform {
  switch (kind) {
    case 'revolute':
    case 'cylindrical':
    case 'pin_slot':
      return Transform.rotationAxisAngleDeg(axis, typeof q === 'number' ? q : 0);
    case 'prismatic': {
      const s = typeof q === 'number' ? q : 0;
      const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
      return Transform.translation((axis[0] / len) * s, (axis[1] / len) * s, (axis[2] / len) * s);
    }
    case 'ball': {
      const e = Array.isArray(q) ? q : [0, 0, 0];
      return Transform.eulerXYZDeg(e[0], e[1], e[2]);
    }
    default:
      return Transform.identity();
  }
}

/** Child-in-parent transform of one tree joint. */
export function jointLocal(j: LoopJoint, q: JointValue | undefined): Transform {
  return Transform.translation(j.aOrigin[0], j.aOrigin[1], j.aOrigin[2])
    .compose(jointMotion(j.kind, q, j.axis))
    .compose(Transform.translation(-j.bOrigin[0], -j.bOrigin[1], -j.bOrigin[2]));
}

/** World transform of every body reached by the tree. */
export function forwardTree(model: LoopModel, coords: Readonly<Coordinates>): Map<string, Transform> {
  const world = new Map<string, Transform>();
  for (const r of model.roots) world.set(r.body, r.placement);
  for (const e of model.tree) {
    const parent = world.get(e.a);
    if (parent === undefined) {
      throw new Error(`loopClosure: tree joint '${e.name}' is reached before its parent body '${e.a}'.`);
    }
    world.set(e.b, parent.compose(jointLocal(e, coords[e.name])));
  }
  return world;
}

/** Write an unknown vector (internal units) into a coordinates record. */
export function applySlots(base: Readonly<Coordinates>, slots: readonly UnknownSlot[], x: ArrayLike<number>, lref: number): Coordinates {
  const out: Coordinates = { ...base };
  slots.forEach((s, i) => {
    const v = s.unit === 'lin' ? x[i] * lref : x[i] / DEG;
    const cur = out[s.joint];
    if (Array.isArray(cur) || s.component > 0 || isTripleSlot(slots, s.joint)) {
      const t: [number, number, number] = Array.isArray(cur) ? [cur[0], cur[1], cur[2]] : [0, 0, 0];
      t[s.component] = v;
      out[s.joint] = t;
    } else {
      out[s.joint] = v;
    }
  });
  return out;
}

function isTripleSlot(slots: readonly UnknownSlot[], joint: string): boolean {
  return slots.some((s) => s.joint === joint && s.component > 0);
}

/** Read the unknown vector (internal units) out of a coordinates record. */
export function readSlots(coords: Readonly<Coordinates>, slots: readonly UnknownSlot[], lref: number): Float64Array {
  return Float64Array.from(slots, (s) => {
    const cur = coords[s.joint];
    const v = Array.isArray(cur) ? cur[s.component] : typeof cur === 'number' ? cur : 0;
    return s.unit === 'lin' ? v / lref : v * DEG;
  });
}

function unit(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** A unit vector perpendicular to `a` (deterministic). */
export function perpendicular(a: Vec3): Vec3 {
  const ax = Math.abs(a[0]), ay = Math.abs(a[1]), az = Math.abs(a[2]);
  const e: Vec3 = ax <= ay && ax <= az ? [1, 0, 0] : ay <= az ? [0, 1, 0] : [0, 0, 1];
  return unit(cross(a, e));
}

/** Body `b`'s joint frame expressed in body `a`'s joint frame. */
interface CutFrame {
  /** Origin gap in `a`'s frame (mm). */
  readonly d: Vec3;
  /** Relative rotation applied to a vector (a-frame → a-frame). */
  readonly rot: (v: Vec3) => Vec3;
  readonly axis: Vec3;
}

function cutFrame(j: LoopJoint, world: ReadonlyMap<string, Transform>): CutFrame {
  const ta = world.get(j.a);
  const tb = world.get(j.b);
  if (ta === undefined || tb === undefined) {
    throw new Error(`loopClosure: cut joint '${j.name}' joins a body the tree does not reach.`);
  }
  const taInv = ta.inverse();
  const pa = ta.point(j.aOrigin);
  const pb = tb.point(j.bOrigin);
  const d = taInv.axisDir([pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]]);
  return { d, rot: (v) => taInv.axisDir(tb.axisDir(v)), axis: unit(j.axis) };
}

export interface ResidualRows {
  readonly r: Float64Array;
  /** True for a position row (scaled by 1/lref), false for an angle row. */
  readonly isPos: readonly boolean[];
}

function pushVec(out: number[], isPos: boolean[], v: Vec3, scale: number, pos: boolean): void {
  out.push(v[0] * scale, v[1] * scale, v[2] * scale);
  isPos.push(pos, pos, pos);
}

function rotationDefect(f: CutFrame, v: Vec3): Vec3 {
  const w = f.rot(v);
  return [w[0] - v[0], w[1] - v[1], w[2] - v[2]];
}

function perpendicularPart(d: Vec3, a: Vec3): Vec3 {
  const s = dot(d, a);
  return [d[0] - s * a[0], d[1] - s * a[1], d[2] - s * a[2]];
}

/** Closure rows for one cut joint (see file header for scaling). */
function cutRows(j: LoopJoint, f: CutFrame, lref: number, out: number[], isPos: boolean[]): void {
  const inv = 1 / lref;
  if (isRevoluteLike(j.kind)) {
    pushVec(out, isPos, f.d, inv, true);
    pushVec(out, isPos, rotationDefect(f, f.axis), 1, false);
  } else if (j.kind === 'prismatic') {
    pushVec(out, isPos, perpendicularPart(f.d, f.axis), inv, true);
    pushVec(out, isPos, rotationDefect(f, [1, 0, 0]), 1, false);
    pushVec(out, isPos, rotationDefect(f, [0, 1, 0]), 1, false);
  } else if (j.kind === 'ball') {
    pushVec(out, isPos, f.d, inv, true);
  } else if (j.kind === 'planar') {
    out.push(dot(f.d, f.axis) * inv);
    isPos.push(true);
    pushVec(out, isPos, rotationDefect(f, f.axis), 1, false);
  } else {
    pushVec(out, isPos, f.d, inv, true);
    pushVec(out, isPos, rotationDefect(f, [1, 0, 0]), 1, false);
    pushVec(out, isPos, rotationDefect(f, [0, 1, 0]), 1, false);
  }
}

/** Signed angle (rad) of the cut frame about its axis. */
function measuredAngle(f: CutFrame): number {
  const u = perpendicular(f.axis);
  const w = f.rot(u);
  return Math.atan2(dot(f.axis, cross(u, w)), dot(u, w));
}

function wrapPi(x: number): number {
  return x - 2 * Math.PI * Math.round(x / (2 * Math.PI));
}

/** All closure rows, plus one row per driven cut joint. */
export function closureResidual(
  cuts: readonly LoopJoint[],
  world: ReadonlyMap<string, Transform>,
  lref: number,
  drivenCuts: Readonly<Record<string, number>>,
): ResidualRows {
  const out: number[] = [];
  const isPos: boolean[] = [];
  for (const j of cuts) {
    const f = cutFrame(j, world);
    cutRows(j, f, lref, out, isPos);
    const target = drivenCuts[j.name];
    if (target === undefined) continue;
    if (j.kind === 'prismatic') {
      out.push((dot(f.d, f.axis) - target) / lref);
      isPos.push(true);
    } else {
      out.push(wrapPi(measuredAngle(f) - target * DEG));
      isPos.push(false);
    }
  }
  return { r: Float64Array.from(out), isPos };
}

/** Scalar coordinate of each cut joint at the given configuration. */
export function measuredCutCoordinates(cuts: readonly LoopJoint[], world: ReadonlyMap<string, Transform>): Coordinates {
  const out: Coordinates = {};
  for (const j of cuts) {
    const f = cutFrame(j, world);
    if (j.kind === 'prismatic') out[j.name] = dot(f.d, f.axis);
    else if (isRevoluteLike(j.kind)) out[j.name] = measuredAngle(f) / DEG;
  }
  return out;
}

function jointPoint(step: CycleStep, world: ReadonlyMap<string, Transform>): Vec3 {
  return world.get(step.joint.a)!.point(step.joint.aOrigin);
}

/** Elbow sign at each revolute-like joint of a loop, keyed `loop/joint`.
 *  The elbow at joint j is the turn from the link on j's sign-body side to
 *  the link on its other side, about the joint axis: +1 counter-clockwise
 *  (right-hand rule), −1 clockwise, 0 straight or folded. */
export function loopElbows(loop: LoopTopology, world: ReadonlyMap<string, Transform>, tol: number): Record<string, -1 | 0 | 1> {
  const out: Record<string, -1 | 0 | 1> = {};
  const n = loop.steps.length;
  for (let i = 0; i < n; i++) {
    const step = loop.steps[i];
    if (!isRevoluteLike(step.joint.kind)) continue;
    out[`${loop.name}/${step.joint.name}`] = elbowSign(loop.steps, i, world, tol);
  }
  return out;
}

function elbowSign(steps: readonly CycleStep[], i: number, world: ReadonlyMap<string, Transform>, tol: number): -1 | 0 | 1 {
  const n = steps.length;
  const step = steps[i];
  const pPrev = jointPoint(steps[(i - 1 + n) % n], world);
  const p = jointPoint(step, world);
  const pNext = jointPoint(steps[(i + 1) % n], world);
  const u: Vec3 = [p[0] - pPrev[0], p[1] - pPrev[1], p[2] - pPrev[2]];
  const w: Vec3 = [pNext[0] - p[0], pNext[1] - p[1], pNext[2] - p[2]];
  const signBody = step.joint.signBody ?? step.joint.a;
  const axisLocal = step.joint.signAxis ?? step.joint.axis;
  const axisWorld = unit(world.get(signBody)!.axisDir(axisLocal));
  const lens = Math.hypot(...u) * Math.hypot(...w);
  if (!(lens > 0)) return 0;
  const s = dot(axisWorld, cross(u, w)) / lens;
  // u points into j along the `from` body; flip when the sign body is `to`.
  const oriented = signBody === step.from ? s : -s;
  if (Math.abs(oriented) <= tol) return 0;
  return oriented > 0 ? 1 : -1;
}

/** Characteristic loop length: the largest distance between two loop joint
 *  origins at the given configuration, never below 1 mm. */
export function characteristicLength(loops: readonly LoopTopology[], world: ReadonlyMap<string, Transform>): number {
  const pts: Vec3[] = [];
  for (const loop of loops) for (const s of loop.steps) pts.push(jointPoint(s, world));
  let best = 1;
  for (let i = 0; i < pts.length; i++) {
    for (let k = i + 1; k < pts.length; k++) {
      best = Math.max(best, Math.hypot(pts[i][0] - pts[k][0], pts[i][1] - pts[k][1], pts[i][2] - pts[k][2]));
    }
  }
  return best;
}
