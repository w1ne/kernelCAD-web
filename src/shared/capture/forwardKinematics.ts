// src/capture/forwardKinematics.ts
//
// Pure body-tree forward kinematics, extracted from Assembly.solve so the
// OCCT lowerer can reach FK directly without going through CaptureSession
// or Assembly state. Math is unchanged from the original Assembly.solve
// body — this file just owns the graph walk + SE(3) composition.

import { KernelError } from '../../intent/kernelError';
import type { FeatureId } from '../../intent/types';
import { Transform, type Vec3 as Se3Vec3 } from '../../runtime/se3';
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
 * Throws on malformed graphs (multiple parents, cycles) — same diagnostics
 * as the original Assembly.solve body.
 */
export function forwardKinematics(
  parts: readonly AssemblyPartStored[],
  joints: readonly AssemblyJointStored[],
  poses: NumericPoses,
): Map<FeatureId, Transform> {
  // 1. Build the parent-joint index: each part has at most one parent joint.
  const parentJointByPart = new Map<FeatureId, AssemblyJointStored>();
  for (const j of joints) {
    if (parentJointByPart.has(j.childPartId)) {
      const prior = parentJointByPart.get(j.childPartId)!;
      throw new KernelError(
        'feature.invalid-args',
        `assembly.solve: a part has two parent joints ('${prior.name}' and '${j.name}'); body-tree requires at most one.`,
        undefined,
        'invalid-args.solve.multi-parent — restructure with a single parent joint per part, or use fixed joints in a chain.',
      );
    }
    parentJointByPart.set(j.childPartId, j);
  }

  // 2. Cycle detection via DFS through joint-parent links.
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

  // 3. Topological sort: roots first, then walk down to leaves via parent-joint links.
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

  // 4. Forward kinematics: walk in topo order, computing world transform per part.
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
    worldT.set(part.id, parentT.compose(jointLocalT));
  }

  return worldT;
}
