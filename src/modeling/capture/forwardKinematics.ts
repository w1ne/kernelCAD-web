// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/forwardKinematics.ts
//
// Pure body-tree forward kinematics, extracted from Assembly.solve so the
// OCCT lowerer can reach FK directly without going through CaptureSession
// or Assembly state. Math is unchanged from the original Assembly.solve
// body — this file just owns the graph walk + SE(3) composition.

import { KernelError } from '../../shared/intent/kernelError';
import type { FeatureId } from '../../shared/intent/types';
import { Transform, type Vec3 as Se3Vec3 } from '../../shared/runtime/se3';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { solveLoops, type LoopJoint, type LoopSolveResult } from '../../shared/kinematics/loopClosure';
import type { AssemblyJointStored, AssemblyPartStored } from './assembly';

/**
 * Numeric pose payload consumed by forwardKinematics. Per-joint:
 *   - revolute, prismatic: number (degrees / mm)
 *   - ball: [number, number, number] (XYZ Euler degrees, extrinsic)
 *   - fixed: must NOT appear (validated upstream)
 *
 * Joints absent from the map default to 0 / [0,0,0].
 */
export type NumericPoses = Record<string, number | [number, number, number]>;

/**
 * Pure body-tree forward kinematics. Walks parts + joints, composes
 * SE(3) transforms per part, returns a map keyed by part FeatureId.
 *
 * Pure data in / pure data out — no CaptureSession or Assembly state.
 * The lowerer calls this directly with resolved numeric poses; Assembly.solve
 * wraps it for the in-script case (after running its own pose-shape
 * validation).
 *
 * A part with several parent joints closes a kinematic loop: the first
 * parent joint stays in the tree, the others are loop-closure joints, and
 * the loop solver poses the joints `poses` does not drive. Throws on a
 * directed cycle (no root) and on a pose the loop cannot reach.
 */
export function forwardKinematics(
  parts: readonly AssemblyPartStored[],
  joints: readonly AssemblyJointStored[],
  poses: NumericPoses,
): Map<FeatureId, Transform> {
  // 1. Build the parent-joint index: each part's first parent joint is its
  //    tree edge; any further parent joint closes a kinematic loop.
  const { parentJointByPart, loopJoints } = buildParentJointIndex(joints);

  // 2. Cycle detection via DFS through joint-parent links.
  detectJointGraphCycles(parts, parentJointByPart);

  // 3. Topological sort: roots first, then walk down to leaves via parent-joint links.
  const topoOrder = topoSortParts(parts, parentJointByPart);

  // 4. Closed loops: the posed joints drive, the loop solver poses the rest.
  if (loopJoints.length > 0) return solveJointLoops(parts, joints, poses);

  // 5. Forward kinematics: walk in topo order, computing world transform per part.
  return computeWorldTransforms(topoOrder, parentJointByPart, poses);
}

/** True when some part has more than one parent joint (a closed loop). */
export function jointGraphHasLoops(joints: readonly AssemblyJointStored[]): boolean {
  return buildParentJointIndex(joints).loopJoints.length > 0;
}

/** Parent-joint index: the first parent joint of each part is its tree
 *  edge; every later parent joint of the same part closes a loop. */
function buildParentJointIndex(
  joints: readonly AssemblyJointStored[],
): { parentJointByPart: Map<FeatureId, AssemblyJointStored>; loopJoints: AssemblyJointStored[] } {
  const parentJointByPart = new Map<FeatureId, AssemblyJointStored>();
  const loopJoints: AssemblyJointStored[] = [];
  for (const j of joints) {
    if (parentJointByPart.has(j.childPartId)) loopJoints.push(j);
    else parentJointByPart.set(j.childPartId, j);
  }
  return { parentJointByPart, loopJoints };
}

function toLoopJoint(j: AssemblyJointStored): LoopJoint {
  return {
    name: j.name,
    kind: j.kind,
    a: j.parentPartId,
    b: j.childPartId,
    aOrigin: j.origin as Se3Vec3,
    bOrigin: [0, 0, 0],
    axis: (j.axis ?? [0, 0, 1]) as Se3Vec3,
  };
}

/** Loop solve of a joint graph at `poses` (every posed joint is driven,
 *  the other loop joints start from zero — the as-modeled pose — and are
 *  solved), or undefined when the graph has no loop. */
export function solveJointGraphLoops(
  parts: readonly AssemblyPartStored[],
  joints: readonly AssemblyJointStored[],
  poses: NumericPoses,
): LoopSolveResult | undefined {
  const { parentJointByPart, loopJoints } = buildParentJointIndex(joints);
  if (loopJoints.length === 0) return undefined;
  detectJointGraphCycles(parts, parentJointByPart);
  const topoOrder = topoSortParts(parts, parentJointByPart);
  const roots = topoOrder.filter((p) => !parentJointByPart.has(p.id)).map((p) => ({ body: p.id as string, placement: Transform.identity() }));
  const tree = topoOrder.flatMap((p) => {
    const j = parentJointByPart.get(p.id);
    return j === undefined ? [] : [toLoopJoint(j)];
  });
  return solveLoops({ model: { roots, tree, cuts: loopJoints.map(toLoopJoint) }, driven: poses, seed: {} });
}

function solveJointLoops(
  parts: readonly AssemblyPartStored[],
  joints: readonly AssemblyJointStored[],
  poses: NumericPoses,
): Map<FeatureId, Transform> {
  const result = solveJointGraphLoops(parts, joints, poses)!;
  if (result.status !== 'solved') {
    const finding = result.diagnostics.find((d) => d.severity === 'error' || d.code === 'kinematic.loop.branch-flip');
    return invalidArgs({
      api: 'assembly.solve(poses)',
      path: 'poses',
      gotText: JSON.stringify(poses),
      requires: `a pose the closed loop can reach (${finding?.code ?? 'kinematic.loop.lockup'}: ${finding?.message ?? 'the loop does not close'})`,
      example: `arm.solve({ ${result.mobility[0]?.independent[0] ?? 'crank'}: 10 })`,
    });
  }
  return result.transforms as Map<FeatureId, Transform>;
}

/** Cycle detection via DFS through joint-parent links. */
function detectJointGraphCycles(
  parts: readonly AssemblyPartStored[],
  parentJointByPart: Map<FeatureId, AssemblyJointStored>,
): void {
  const visited = new Set<FeatureId>();
  const stack = new Set<FeatureId>();
  const dfs = (partId: FeatureId): void => {
    if (visited.has(partId)) return;
    if (stack.has(partId)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.solve: cycle detected in joint graph at part '${partId}'.`,
        undefined,
        'invalid-args.solve.cycle — joint parents must form a tree (no cycles).',
      );
    }
    stack.add(partId);
    const parentJ = parentJointByPart.get(partId);
    if (parentJ) dfs(parentJ.parentPartId);
    stack.delete(partId);
    visited.add(partId);
  };
  for (const part of parts) dfs(part.id);
}

/** Topological sort: roots first, then walk down to leaves via parent-joint links. */
function topoSortParts(
  parts: readonly AssemblyPartStored[],
  parentJointByPart: Map<FeatureId, AssemblyJointStored>,
): AssemblyPartStored[] {
  const topoOrder: AssemblyPartStored[] = [];
  const seen = new Set<FeatureId>();
  const visit = (part: AssemblyPartStored): void => {
    if (seen.has(part.id)) return;
    seen.add(part.id);
    const parentJ = parentJointByPart.get(part.id);
    if (parentJ) {
      const parentPart = parts.find(p => p.id === parentJ.parentPartId);
      if (parentPart) visit(parentPart);
    }
    topoOrder.push(part);
  };
  for (const part of parts) visit(part);
  return topoOrder;
}

/** Local SE(3) transform for one parent joint at the supplied numeric pose. */
function jointLocalTransform(parentJ: AssemblyJointStored, poses: NumericPoses): Transform {
  let jointLocalT: Transform;
  switch (parentJ.kind) {
    case 'revolute': {
      const deg = (poses[parentJ.name] as number | undefined) ?? 0;
      const ax = parentJ.axis as Se3Vec3;
      jointLocalT = Transform.translation(parentJ.origin[0], parentJ.origin[1], parentJ.origin[2])
        .compose(Transform.rotationAxisAngleDeg(ax, deg));
      break;
    }
    case 'prismatic': {
      const stroke = (poses[parentJ.name] as number | undefined) ?? 0;
      const ax = parentJ.axis as Se3Vec3;
      const len = Math.hypot(ax[0], ax[1], ax[2]) || 1;
      const dx = (ax[0] / len) * stroke;
      const dy = (ax[1] / len) * stroke;
      const dz = (ax[2] / len) * stroke;
      jointLocalT = Transform.translation(parentJ.origin[0], parentJ.origin[1], parentJ.origin[2])
        .compose(Transform.translation(dx, dy, dz));
      break;
    }
    case 'fixed': {
      jointLocalT = Transform.translation(parentJ.origin[0], parentJ.origin[1], parentJ.origin[2]);
      break;
    }
    case 'ball': {
      const euler = (poses[parentJ.name] as [number, number, number] | undefined) ?? [0, 0, 0];
      jointLocalT = Transform.translation(parentJ.origin[0], parentJ.origin[1], parentJ.origin[2])
        .compose(Transform.eulerXYZDeg(euler[0], euler[1], euler[2]));
      break;
    }
  }
  return jointLocalT;
}

/** Forward kinematics: walk in topo order, computing world transform per part. */
function computeWorldTransforms(
  topoOrder: readonly AssemblyPartStored[],
  parentJointByPart: Map<FeatureId, AssemblyJointStored>,
  poses: NumericPoses,
): Map<FeatureId, Transform> {
  const worldT = new Map<FeatureId, Transform>();
  for (const part of topoOrder) {
    const parentJ = parentJointByPart.get(part.id);
    if (!parentJ) {
      // Root part — no parent joint, identity transform.
      worldT.set(part.id, Transform.identity());
      continue;
    }
    const parentT = worldT.get(parentJ.parentPartId);
    if (!parentT) {
      // Should be impossible if topo sort is correct.
      throw new KernelError(
        'feature.invalid-args',
        `assembly.solve: internal error — parent part '${parentJ.parentPartId}' of joint '${parentJ.name}' has no computed transform.`,
        undefined,
        'invalid-args.solve.internal — please file a bug.',
      );
    }
    worldT.set(part.id, parentT.compose(jointLocalTransform(parentJ, poses)));
  }
  return worldT;
}
