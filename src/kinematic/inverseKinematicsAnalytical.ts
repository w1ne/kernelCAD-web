// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/inverseKinematicsAnalytical.ts
//
// Closed-form analytical IK for the spherical-wrist 6-DOF serial chain. The
// position channel is solved geometrically — q1 (base yaw), q2 (shoulder
// pitch), q3 (elbow pitch) — by inverting the wrist-center-position equation
// against the chain's link lengths. The three wrist DOFs (q4, q5, q6) only
// affect orientation and are left at zero on the position-only path; the
// dispatcher falls back to the DLS numeric solver when an orientation target
// is supplied.
//
// Closed-form math: Paul, "Robot Manipulators: Mathematics, Programming, and
// Control" (1981) — the Pieper-condition decomposition. The first three
// joints determine the wrist-center position; once the wrist center is
// reached, the last three joints (whose axes intersect at that center)
// resolve the orientation independently.

import type { Assembly, AssemblyJointStored } from '../modeling/capture/assembly';
import { forwardKinematics } from '../modeling/capture/forwardKinematics';
import type { FeatureId } from '../shared/intent/types';
import type { Vec3 } from '../shared/runtime/se3';
import { pieperDetector } from './pieperDetector';
import type { NumericPoses, ReachableTarget } from './types';

export interface AnalyticalIKResult {
  readonly poses: NumericPoses;
  readonly solverUsed: 'analytical';
}

/**
 * Solve the position channel of the IK target in closed form. Returns null
 * when the chain doesn't match the spherical-wrist condition, when the target
 * is outside the reachable workspace, or when the chain layout doesn't match
 * the Z-yaw + Y-pitch + Y-pitch geometry the v1 solver supports.
 *
 * Orientation targets are NOT solved here — the dispatcher routes those to
 * the numeric path.
 */
export function solveAnalytical(
  arm: Assembly,
  tipLink: string,
  target: ReachableTarget,
): AnalyticalIKResult | null {
  if (!target.position) return null;

  const detect = pieperDetector(arm, tipLink);
  if (!detect.matches) return null;

  const parts = arm.__parts();
  const joints = arm.__joints();
  const tipPart = parts.find((p) => p.name === tipLink);
  if (!tipPart) return null;

  // Walk parent-joint chain tip → root, keeping revolute joints in tip-to-root
  // order; reverse for proximal-first.
  const chain = collectChainRev(parts, joints, tipPart.id);
  if (chain.length !== 6) return null;

  // Inspect the first three joints' axes (in their parent's local frame) and
  // the layout offsets to choose the closed-form branch. The v1 solver
  // recognises the Z-yaw → Y-pitch → Y-pitch (Puma) layout with:
  //   j1 origin = (0, 0, baseH), axis +Z
  //   j2 origin = (0, 0, 0),     axis +Y
  //   j3 origin = (L1, 0, 0),    axis +Y
  // Wrist center under the IDENTITY pose is the wrist-center world position
  // the detector already located; link lengths fall out from joint origins.
  const j1 = chain[0];
  const j2 = chain[1];
  const j3 = chain[2];
  if (!axisAligned(j1.axis, [0, 0, 1])) return null;
  if (!axisAligned(j2.axis, [0, 1, 0])) return null;
  if (!axisAligned(j3.axis, [0, 1, 0])) return null;

  const baseH = (j1.origin as Vec3)[2];
  const L1 = (j3.origin as Vec3)[0];
  // L2 = world-distance from j3's origin under identity pose to the wrist
  // center (= sum of the offsets accumulated by joints 4..6, which are all
  // at the same point in their respective parent frames per the spherical
  // wrist condition). Compute from zero-pose FK.
  const zeroPose: Record<string, number> = {};
  for (const j of joints) if (j.kind !== 'fixed' && j.kind !== 'ball') zeroPose[j.name] = 0;
  const transforms = forwardKinematics(parts, joints, zeroPose);
  const j3WorldOrigin = transforms.get(j3.parentPartId)!.point(j3.origin as Vec3);
  const wristCenterZero = detect.wristCenterWorld;
  const L2 = Math.hypot(
    wristCenterZero[0] - j3WorldOrigin[0],
    wristCenterZero[1] - j3WorldOrigin[1],
    wristCenterZero[2] - j3WorldOrigin[2],
  );
  // Additional sanity: at zero pose, the wrist center should sit at world
  // (L1 + L2, 0, baseH). Any other geometry is currently not handled by the
  // v1 closed-form layout — defer to numeric.
  if (
    Math.abs(wristCenterZero[0] - (L1 + L2)) > 1e-3 ||
    Math.abs(wristCenterZero[1]) > 1e-3 ||
    Math.abs(wristCenterZero[2] - baseH) > 1e-3
  ) {
    return null;
  }

  const [tx, ty, tz] = target.position;
  const x = tx;
  const y = ty;
  const z = tz - baseH;

  const rho = Math.hypot(x, y);
  const D = Math.hypot(rho, z);
  // Reachability: |L1 - L2| ≤ D ≤ L1 + L2.
  if (D > L1 + L2 + 1e-6) return null;
  if (D < Math.abs(L1 - L2) - 1e-6) return null;

  const q1Rad = Math.atan2(y, x);
  // Pick the elbow-down branch (q3 in [-π, 0]); flip via cos = ±.
  const cosQ3 = Math.min(1, Math.max(-1, (D * D - L1 * L1 - L2 * L2) / (2 * L1 * L2)));
  const sinQ3 = -Math.sqrt(Math.max(0, 1 - cosQ3 * cosQ3));        // elbow-down → negative q3
  const q3Rad = Math.atan2(sinQ3, cosQ3);
  const q2Rad = Math.atan2(-z, rho) - Math.atan2(L2 * sinQ3, L1 + L2 * cosQ3);

  // Confine to per-joint limits when declared; reject if out-of-limit.
  const q1Deg = (q1Rad * 180) / Math.PI;
  const q2Deg = (q2Rad * 180) / Math.PI;
  const q3Deg = (q3Rad * 180) / Math.PI;
  if (!withinLimits(j1, q1Deg)) return null;
  if (!withinLimits(j2, q2Deg)) return null;
  if (!withinLimits(j3, q3Deg)) return null;

  const poses: Record<string, number> = {
    [j1.name]: q1Deg,
    [j2.name]: q2Deg,
    [j3.name]: q3Deg,
  };
  // Pre-fill wrist DOFs (position-only target leaves them at zero so the FK
  // substrate accepts the pose — finding #85).
  for (let i = 3; i < chain.length; i++) poses[chain[i].name] = 0;
  // Pre-fill any non-DOF joints not on this chain so caller-side FK accepts.
  for (const j of joints) {
    if (j.kind === 'fixed') continue;
    if (j.kind === 'ball') continue;
    if (poses[j.name] === undefined) poses[j.name] = 0;
  }

  return { poses, solverUsed: 'analytical' };
}

function collectChainRev(
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
    if (parentJ.kind === 'revolute') chain.push(parentJ);
    cur = parentJ.parentPartId;
  }
  chain.reverse();
  return chain;
}

function axisAligned(axis: Vec3 | undefined, target: Vec3): boolean {
  if (!axis) return false;
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const ax = [axis[0] / len, axis[1] / len, axis[2] / len];
  const dot = ax[0] * target[0] + ax[1] * target[1] + ax[2] * target[2];
  return Math.abs(dot - 1) < 1e-4;
}

function withinLimits(joint: AssemblyJointStored, deg: number): boolean {
  if (joint.kind === 'revolute' && joint.limitsDeg) {
    const [lo, hi] = joint.limitsDeg;
    return deg >= lo - 1e-6 && deg <= hi + 1e-6;
  }
  return true;
}
