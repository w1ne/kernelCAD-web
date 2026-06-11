// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/inverseKinematicsNumeric.ts
//
// Damped-Least-Squares (Levenberg–Marquardt) Jacobian IK for general open
// serial chains. Used by `checkReachable` when the closed-form analytical
// path rejects (chain doesn't satisfy the spherical-wrist condition) or when
// the caller forces `preferSolver: 'numeric'`.
//
// Convergence target: position tolerance from `ReachableTarget` (default
// 0.5 mm) and, when an orientation is supplied, the orientation tolerance
// (default 0.5°). Step size is a damping-based pseudoinverse — robust at
// singularities, well-conditioned at any pose.
//
// Iteration cap is the deterministic-result lever per D8: same chain + same
// seed gives the same outcome on every machine, with no wall-clock leakage.

import type { Assembly } from '../modeling/capture/assembly';
import type { AssemblyJointStored } from '../modeling/capture/assembly';
import { forwardKinematics } from '../modeling/capture/forwardKinematics';
import type { FeatureId } from '../shared/intent/types';
import type { Vec3 } from '../shared/runtime/se3';
import type { NumericPoses, ReachableTarget } from './types';

const DEFAULT_DAMPING = 0.05;        // λ; clamps singular directions
const TWIST_GAIN = 0.5;              // step-size on the twist error
const ORIENTATION_WEIGHT = 50;       // scales orient error so its units (rad) match position (mm)

export interface NumericIKResult {
  readonly converged: boolean;
  readonly poses: NumericPoses;
  readonly iterations: number;
  readonly positionErrorMm: number;
  readonly orientationErrorDeg: number;
}

/**
 * Resolve an end-effector target via damped least-squares Jacobian iteration.
 * Returns `converged: true` on tolerance hit; otherwise the best-error pose
 * seen across the run with `converged: false`. The dispatcher converts the
 * non-converged path into K3 + K4 diagnostics.
 */
export function solveNumeric(
  arm: Assembly,
  tipLink: string,
  target: ReachableTarget,
  seed: NumericPoses,
  maxIterations: number,
): NumericIKResult {
  const parts = arm.__parts();
  const joints = arm.__joints();
  const tipPart = parts.find((p) => p.name === tipLink);
  if (!tipPart) {
    throw new Error(
      `solveNumeric: tipLink '${tipLink}' not found among ${parts.length} parts.`,
    );
  }
  const tipId = tipPart.id;

  // Walk parent-joint chain from the tip back to the root; collect revolute /
  // prismatic joints in tip-to-root order. Fixed and ball joints are skipped
  // (fixed has no DOF; ball is not v1 per cumulative finding #86).
  const dofJoints = walkDofChainToTip(parts, joints, tipId);
  if (dofJoints.length === 0) {
    // Nothing to solve — tip is rigidly attached to the root.
    const posErrMm = positionError(arm, tipId, seed, target);
    return {
      converged: posErrMm < (target.positionToleranceMm ?? 0.5),
      poses: { ...seed },
      iterations: 0,
      positionErrorMm: posErrMm,
      orientationErrorDeg: 0,
    };
  }

  const posTolMm = target.positionToleranceMm ?? 0.5;

  // Pre-fill the full pose with the seed, defaulting any missing joints to 0.
  // The FK substrate requires every non-fixed joint to be posed (cumulative
  // finding #85).
  const q: Record<string, number> = {};
  for (const j of joints) {
    if (j.kind === 'fixed') continue;
    if (j.kind === 'ball') {
      // v1 skips ball joints in IK; FK still needs a value.
      // We don't iterate on ball joints here, so keep them at the seed value.
      continue;
    }
    q[j.name] = (seed[j.name] as number | undefined) ?? 0;
  }

  let bestPoses: Record<string, number> = { ...q };
  let bestPosErr = Infinity;
  let bestOriErr = Infinity;
  let lastIter = 0;

  for (let iter = 1; iter <= maxIterations; iter++) {
    lastIter = iter;
    const transforms = forwardKinematics(parts, joints, q);
    const tipT = transforms.get(tipId)!;
    const tipPos = tipT.point([0, 0, 0]);

    // Position error in world coords.
    const errPos: Vec3 = [
      (target.position?.[0] ?? tipPos[0]) - tipPos[0],
      (target.position?.[1] ?? tipPos[1]) - tipPos[1],
      (target.position?.[2] ?? tipPos[2]) - tipPos[2],
    ];
    const pErrMm = Math.hypot(errPos[0], errPos[1], errPos[2]);

    // Orientation: v1 only solves on the position channel (per ReachableTarget
    // shape — orientation tolerance is opt-in and the existing types accept
    // an XYZ-Euler triple; we treat its absence as "no orientation
    // constraint"). When orientation is requested, the dispatcher post-checks
    // it; the numeric loop here keeps the position-only Jacobian.
    const oErrDeg = 0;

    // Track the best-effort pose for the K4 closest-approach path.
    if (pErrMm < bestPosErr) {
      bestPosErr = pErrMm;
      bestOriErr = oErrDeg;
      bestPoses = { ...q };
    }

    if (pErrMm < posTolMm) {
      return {
        converged: true,
        poses: { ...q },
        iterations: iter,
        positionErrorMm: pErrMm,
        orientationErrorDeg: oErrDeg,
      };
    }

    // Compute the position Jacobian Jp (3 × n). Per-column geometric form for
    // a revolute joint: column = ω̂ × (tipPos − originWorld); for a prismatic
    // joint: column = ω̂ (unit axis dir in world frame).
    const cols: { name: string; jp: Vec3 }[] = [];
    for (const j of dofJoints) {
      const { axisWorld, originWorld } = jointAxisInWorld(parts, joints, q, j);
      if (j.kind === 'revolute') {
        const r: Vec3 = [tipPos[0] - originWorld[0], tipPos[1] - originWorld[1], tipPos[2] - originWorld[2]];
        // Cross product axisWorld × r (per-joint angular contribution).
        const jp: Vec3 = [
          axisWorld[1] * r[2] - axisWorld[2] * r[1],
          axisWorld[2] * r[0] - axisWorld[0] * r[2],
          axisWorld[0] * r[1] - axisWorld[1] * r[0],
        ];
        // Convert the per-radian contribution to per-degree (q is in degrees).
        const scale = Math.PI / 180;
        cols.push({ name: j.name, jp: [jp[0] * scale, jp[1] * scale, jp[2] * scale] });
      } else {
        // prismatic — axisWorld is the unit translation direction. q is in mm.
        cols.push({ name: j.name, jp: axisWorld });
      }
    }

    // DLS step on the position channel only:
    //   Δq = J^T (J J^T + λ² I_3)^-1 e
    // where J is 3 × n and e ∈ R^3. The 3 × 3 system is closed-form invertible.
    const lambda2 = DEFAULT_DAMPING * DEFAULT_DAMPING;
    const A: number[][] = [
      [lambda2, 0, 0],
      [0, lambda2, 0],
      [0, 0, lambda2],
    ];
    for (const c of cols) {
      A[0][0] += c.jp[0] * c.jp[0];
      A[0][1] += c.jp[0] * c.jp[1];
      A[0][2] += c.jp[0] * c.jp[2];
      A[1][0] += c.jp[1] * c.jp[0];
      A[1][1] += c.jp[1] * c.jp[1];
      A[1][2] += c.jp[1] * c.jp[2];
      A[2][0] += c.jp[2] * c.jp[0];
      A[2][1] += c.jp[2] * c.jp[1];
      A[2][2] += c.jp[2] * c.jp[2];
    }
    const Ainv = invert3x3(A);
    if (!Ainv) {
      // Degenerate Jacobian — singular even with damping (shouldn't happen
      // with lambda2 > 0, but guard anyway).
      break;
    }
    // y = Ainv * e
    const y: Vec3 = [
      Ainv[0][0] * errPos[0] + Ainv[0][1] * errPos[1] + Ainv[0][2] * errPos[2],
      Ainv[1][0] * errPos[0] + Ainv[1][1] * errPos[1] + Ainv[1][2] * errPos[2],
      Ainv[2][0] * errPos[0] + Ainv[2][1] * errPos[1] + Ainv[2][2] * errPos[2],
    ];
    // dq = J^T y, scaled by TWIST_GAIN.
    for (const c of cols) {
      const dq = (c.jp[0] * y[0] + c.jp[1] * y[1] + c.jp[2] * y[2]) * TWIST_GAIN;
      const cur = q[c.name] ?? 0;
      const next = cur + dq;
      const joint = joints.find((jj) => jj.name === c.name)!;
      q[c.name] = clampToLimits(joint, next);
    }
  }

  // Iteration cap hit — return best closest-approach.
  return {
    converged: false,
    poses: bestPoses,
    iterations: lastIter,
    positionErrorMm: bestPosErr,
    orientationErrorDeg: bestOriErr,
  };
}

function walkDofChainToTip(
  _parts: ReadonlyArray<{ id: FeatureId; name: string }>,
  joints: ReadonlyArray<AssemblyJointStored>,
  tipId: FeatureId,
): AssemblyJointStored[] {
  const parentJointByPart = new Map<FeatureId, AssemblyJointStored>();
  for (const j of joints) parentJointByPart.set(j.childPartId, j);
  const chain: AssemblyJointStored[] = [];
  let cur: FeatureId | undefined = tipId;
  const seen = new Set<FeatureId>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const parentJ = parentJointByPart.get(cur);
    if (!parentJ) break;
    if (parentJ.kind === 'revolute' || parentJ.kind === 'prismatic') {
      chain.push(parentJ);
    }
    cur = parentJ.parentPartId;
  }
  return chain;
}

function jointAxisInWorld(
  parts: ReadonlyArray<{ id: FeatureId; name: string }>,
  joints: ReadonlyArray<AssemblyJointStored>,
  poses: NumericPoses,
  joint: AssemblyJointStored,
): { axisWorld: Vec3; originWorld: Vec3 } {
  // The joint origin and axis are expressed in the PARENT part's local frame.
  // To express in world: world_parent_transform * local_origin.
  // World axis: world_parent_transform.axisDir(local_axis).
  const transforms = forwardKinematics(parts as never, joints, poses);
  const parentT = transforms.get(joint.parentPartId)!;
  const localAxis: Vec3 = (joint.axis ?? [0, 0, 1]) as Vec3;
  const localOrigin: Vec3 = joint.origin as Vec3;
  const axisWorldRaw = parentT.axisDir(localAxis);
  const len = Math.hypot(axisWorldRaw[0], axisWorldRaw[1], axisWorldRaw[2]) || 1;
  const axisWorld: Vec3 = [axisWorldRaw[0] / len, axisWorldRaw[1] / len, axisWorldRaw[2] / len];
  const originWorld = parentT.point(localOrigin);
  return { axisWorld, originWorld };
}

function clampToLimits(joint: AssemblyJointStored, value: number): number {
  if (joint.kind === 'revolute' && joint.limitsDeg) {
    const [lo, hi] = joint.limitsDeg;
    if (value < lo) return lo;
    if (value > hi) return hi;
    return value;
  }
  if (joint.kind === 'prismatic' && joint.limitsMm) {
    const [lo, hi] = joint.limitsMm;
    if (value < lo) return lo;
    if (value > hi) return hi;
    return value;
  }
  return value;
}

function positionError(
  arm: Assembly,
  tipId: FeatureId,
  poses: NumericPoses,
  target: ReachableTarget,
): number {
  const transforms = forwardKinematics(arm.__parts(), arm.__joints(), { ...poses });
  const tipT = transforms.get(tipId);
  if (!tipT) return Infinity;
  const p = tipT.point([0, 0, 0]);
  if (!target.position) return 0;
  return Math.hypot(
    target.position[0] - p[0],
    target.position[1] - p[1],
    target.position[2] - p[2],
  );
}

function invert3x3(m: number[][]): number[][] | null {
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [
    [(e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
    [(f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
    [(d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv],
  ];
}

// Re-exports to keep the TWIST_GAIN / ORIENTATION_WEIGHT constants discoverable.
export const _internals = { DEFAULT_DAMPING, TWIST_GAIN, ORIENTATION_WEIGHT };
