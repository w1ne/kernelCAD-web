// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/inverseKinematicsLoops.ts
//
// Damped-least-squares IK for joint graphs with closed loops (a part with
// several parent joints). The geometric chain Jacobian of
// `inverseKinematicsNumeric` assumes one parent chain, so here the IK drives
// only the loops' independent joints (plus open-chain joints) and lets the
// loop solver pose the rest: forward kinematics is `forwardKinematics`,
// which closes every loop, and the Jacobian is a forward difference.

import type { Assembly } from '../modeling/capture/assembly';
import { forwardKinematics, solveJointGraphLoops } from '../modeling/capture/forwardKinematics';
import type { Vec3 } from '../shared/runtime/se3';
import { solveDlsStep, type NumericIKResult } from './inverseKinematicsNumeric';
import type { NumericPoses, ReachableTarget } from './types';

const FD_STEP = 1e-3;
const MAX_STEP = 20;

/** Joints the IK drives: revolute/prismatic joints off every loop plus the
 *  loops' independent joints. */
function drivableJoints(arm: Assembly): string[] {
  const report = solveJointGraphLoops(arm.__parts(), arm.__joints(), {});
  const onLoop = new Set(report?.loops.flatMap((l) => l.joints) ?? []);
  const independent = new Set(report?.mobility.flatMap((m) => m.independent) ?? []);
  return arm
    .__joints()
    .filter((j) => (j.kind === 'revolute' || j.kind === 'prismatic') && (!onLoop.has(j.name) || independent.has(j.name)))
    .map((j) => j.name);
}

function tipWorld(arm: Assembly, tipId: string, q: NumericPoses): Vec3 | undefined {
  try {
    const t = forwardKinematics(arm.__parts(), arm.__joints(), q).get(tipId as never);
    return t === undefined ? undefined : t.point([0, 0, 0]);
  } catch {
    return undefined; // a pose the loop cannot reach
  }
}

export function solveNumericJointLoops(
  arm: Assembly,
  tipLink: string,
  target: ReachableTarget,
  seed: NumericPoses,
  maxIterations: number,
): NumericIKResult {
  const tip = arm.__parts().find((p) => p.name === tipLink)!;
  const dof = drivableJoints(arm);
  const posTolMm = target.positionToleranceMm ?? 0.5;
  const q: Record<string, number> = {};
  for (const name of dof) q[name] = typeof seed[name] === 'number' ? (seed[name] as number) : 0;
  let best = { poses: { ...q }, err: Infinity };
  let iterations = 0;
  for (let iter = 1; iter <= Math.max(1, maxIterations); iter++) {
    iterations = iter;
    const p = tipWorld(arm, tip.id, q);
    if (p === undefined) break;
    const goal = target.position ?? p;
    const e: Vec3 = [goal[0] - p[0], goal[1] - p[1], goal[2] - p[2]];
    const err = Math.hypot(...e);
    if (err < best.err) best = { poses: { ...q }, err };
    if (err < posTolMm) return { converged: true, poses: { ...q }, iterations, positionErrorMm: err, orientationErrorDeg: 0 };
    const cols = dof.flatMap((name) => {
      const moved = tipWorld(arm, tip.id, { ...q, [name]: q[name] + FD_STEP });
      return moved === undefined ? [] : [{ name, jp: [0, 1, 2].map((i) => (moved[i] - p[i]) / FD_STEP) as unknown as Vec3 }];
    });
    const y = solveDlsStep(cols, e);
    if (y === undefined || cols.length === 0) break;
    for (const c of cols) {
      const dq = c.jp[0] * y[0] + c.jp[1] * y[1] + c.jp[2] * y[2];
      q[c.name] += Math.max(-MAX_STEP, Math.min(MAX_STEP, dq));
    }
  }
  return { converged: false, poses: best.poses, iterations, positionErrorMm: best.err, orientationErrorDeg: 0 };
}
