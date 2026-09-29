// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/inverseKinematicsMates.ts
//
// Damped-least-squares IK for mate-graph arms (`part.connector(...)` +
// `arm.mate(name, a, b, 'revolute' | 'prismatic', ...)`).
//
// The joint-graph solver (`inverseKinematicsNumeric.ts`) walks
// `arm.__joints()`, which a mate-built arm leaves EMPTY. Before this module
// the dispatcher therefore saw a zero-DOF chain on every mate-built arm and
// reported the distance from the tip part's un-posed origin to the target as
// `kinematic.unreachable` — even for the tip's own rest position.
//
// Forward kinematics here is the mate solver itself (`solveMates`), the same
// substrate `review_cad`'s pose envelope / `connectorWorkspace` samples, so
// an IK answer and the workspace report can never disagree about where the
// tip is. The Jacobian is a forward finite difference over the scalar mate
// poses (degrees for revolute, millimetres for prismatic — the
// `arm.solvedModel({ poses })` convention).

import type { Assembly } from '../modeling/capture/assembly';
import { solveMates } from '../modeling/mates/solver';
import type { MateRecord } from '../modeling/mates/mate';
import type { Vec3 } from '../shared/runtime/se3';
import { solveDlsStep, type NumericIKResult } from './inverseKinematicsNumeric';
import type { NumericPoses, ReachableTarget } from './types';

/** Finite-difference step: 1e-3 degree (revolute) or 1e-3 mm (prismatic). */
const FD_STEP = 1e-3;
/** Step gain on the DLS update. The finite-difference Jacobian is exact to
 *  first order, so a full step converges fastest; the best-error pose is
 *  tracked, so an overshoot never becomes the reported answer. */
const STEP_GAIN = 1;
/** Largest joint move per iteration (degrees or mm). Keeps a far-off target
 *  from flinging the chain through a joint limit in one step. */
const MAX_STEP = 20;

/** A resolved end-effector point: a part frame origin, or a vec3 connector
 *  origin on that part (both in the part's local frame). */
export interface MateTipPoint {
  readonly partName: string;
  readonly local: Vec3;
  /** Human-readable label for messages: `part` or `part.connector`. */
  readonly label: string;
}

/**
 * Resolve `tipLink` against a mate-built arm. Accepts a bare part name (the
 * part frame origin is tracked) or `part.connector` (that connector's vec3
 * origin is tracked — the same point `review_cad` reports in
 * `connectorWorkspace`). Returns a string error when the ref does not resolve.
 */
export function resolveMateTipPoint(arm: Assembly, tipLink: string): MateTipPoint | string {
  const parts = arm.__parts();
  const whole = parts.find((p) => p.name === tipLink);
  if (whole) return { partName: whole.name, local: [0, 0, 0], label: whole.name };
  const dot = tipLink.lastIndexOf('.');
  if (dot <= 0) return `Tip link '${tipLink}' was not found among the assembly's parts.`;
  const partName = tipLink.slice(0, dot);
  const connectorName = tipLink.slice(dot + 1);
  const part = parts.find((p) => p.name === partName);
  if (!part) return `Tip link '${tipLink}': part '${partName}' was not found among the assembly's parts.`;
  const connector = part.mateConnectors.find((c) => c.name === connectorName);
  if (!connector) {
    return `Tip link '${tipLink}': part '${partName}' has no connector named '${connectorName}'.`;
  }
  if (connector.origin.kind !== 'vec3') {
    return `Tip link '${tipLink}': connector '${connectorName}' has a topology-bound origin; IK needs a numeric origin ({ kind: 'vec3', value: [...] }).`;
  }
  const v = connector.origin.value;
  return { partName, local: [v[0], v[1], v[2]], label: tipLink };
}

/** True when the arm is articulated through mates rather than the joint graph. */
export function hasArticulatedMates(arm: Assembly): boolean {
  return articulatedMates(arm).length > 0;
}

/** Scalar articulated mates the solver may drive: revolute (deg) and
 *  prismatic (mm), minus mates whose pose a coupling derives from another. */
function articulatedMates(arm: Assembly): MateRecord[] {
  // Joint-graph-only stand-ins (unit-test stub arms) may not carry the mate
  // accessors at all; treat them as mate-free.
  const partial = arm as Partial<Pick<Assembly, '__mates' | '__mateCouplings'>>;
  const mates = partial.__mates?.() ?? [];
  const driven = new Set((partial.__mateCouplings?.() ?? []).map((c) => c.driven));
  return mates.filter(
    (m) => (m.type === 'revolute' || m.type === 'prismatic') && !driven.has(m.name),
  );
}

/** World position of the tip point at `poses`, via the mate solver. */
export async function mateTipWorld(
  arm: Assembly,
  tip: MateTipPoint,
  poses: NumericPoses,
): Promise<Vec3 | undefined> {
  const solved = await solveMates(arm, poses);
  const t = solved.poses.get(tip.partName);
  if (!t) return undefined;
  const p = t.point(tip.local);
  return [p[0], p[1], p[2]];
}

/**
 * Numeric DLS IK over a mate graph. Same result contract as `solveNumeric`:
 * `converged: true` on a tolerance hit, otherwise the best-error pose seen.
 */
export async function solveNumericMates(
  arm: Assembly,
  tip: MateTipPoint,
  target: ReachableTarget,
  seed: NumericPoses,
  maxIterations: number,
): Promise<NumericIKResult> {
  const dof = articulatedMates(arm);
  const posTolMm = target.positionToleranceMm ?? 0.5;
  const q: Record<string, number> = {};
  for (const m of dof) q[m.name] = initialPose(m, seed);

  let bestPoses: Record<string, number> = { ...q };
  let bestErr = Infinity;
  let iterations = 0;

  for (let iter = 1; iter <= Math.max(1, maxIterations); iter++) {
    iterations = iter;
    const tipPos = await mateTipWorld(arm, tip, q);
    if (!tipPos) break;
    const err: Vec3 = target.position
      ? [target.position[0] - tipPos[0], target.position[1] - tipPos[1], target.position[2] - tipPos[2]]
      : [0, 0, 0];
    const errMm = Math.hypot(err[0], err[1], err[2]);
    if (errMm < bestErr) {
      bestErr = errMm;
      bestPoses = { ...q };
    }
    if (errMm < posTolMm) {
      return { converged: true, poses: { ...q }, iterations: iter, positionErrorMm: errMm, orientationErrorDeg: 0 };
    }
    if (dof.length === 0) break;

    const cols: { name: string; jp: Vec3 }[] = [];
    for (const m of dof) {
      const probe = { ...q, [m.name]: q[m.name] + FD_STEP };
      const moved = await mateTipWorld(arm, tip, probe);
      if (!moved) continue;
      cols.push({
        name: m.name,
        jp: [(moved[0] - tipPos[0]) / FD_STEP, (moved[1] - tipPos[1]) / FD_STEP, (moved[2] - tipPos[2]) / FD_STEP],
      });
    }
    const y = solveDlsStep(cols, err);
    if (y === undefined) break;
    let moved = false;
    for (const c of cols) {
      let dq = (c.jp[0] * y[0] + c.jp[1] * y[1] + c.jp[2] * y[2]) * STEP_GAIN;
      dq = Math.max(-MAX_STEP, Math.min(MAX_STEP, dq));
      const mate = dof.find((m) => m.name === c.name)!;
      const next = clampToMateLimits(mate, q[c.name] + dq);
      if (Math.abs(next - q[c.name]) > 1e-12) moved = true;
      q[c.name] = next;
    }
    // Every joint pinned at a limit (or a zero step): no further progress.
    if (!moved) break;
  }

  return {
    converged: false,
    poses: bestPoses,
    iterations,
    positionErrorMm: bestErr,
    orientationErrorDeg: 0,
  };
}

function initialPose(m: MateRecord, seed: NumericPoses): number {
  const s = seed[m.name];
  if (typeof s === 'number' && Number.isFinite(s)) return clampToMateLimits(m, s);
  if (typeof m.pose === 'number' && Number.isFinite(m.pose)) return clampToMateLimits(m, m.pose);
  return clampToMateLimits(m, 0);
}

function clampToMateLimits(m: MateRecord, value: number): number {
  const lim = m.type === 'prismatic' ? m.limitsMm : m.limitsDeg;
  if (!lim) return value;
  return Math.min(lim[1], Math.max(lim[0], value));
}
