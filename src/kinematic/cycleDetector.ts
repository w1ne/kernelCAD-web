// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/cycleDetector.ts
//
// Closed-loop classifier for the kinematic dispatcher. A joint graph with a
// part that has several parent joints (or a cycle through parent links) is a
// closed loop: `checkReachable` routes it to the loop-aware numeric IK
// (`inverseKinematicsLoops`), which drives only the loop's independent
// joints while forward kinematics closes the loop. Pure classification —
// no solving here.

import type { Assembly } from '../modeling/capture/assembly';

export interface CycleDetectionResult {
  /** True when the joint graph has either a part with multiple parent joints
   *  or a cycle reachable through parent-joint links. */
  readonly hasCycle: boolean;
  /** Joint names that participate in the offending structure. Empty when
   *  `hasCycle === false`. */
  readonly cycleNodes: ReadonlyArray<string>;
}

/**
 * Classify an assembly's joint graph as open serial vs closed-loop /
 * parallel-kinematics. Returns the offending joint names when a cycle is
 * detected so the dispatcher can name them in the diagnostic message.
 */
export function cycleDetector(arm: Assembly): CycleDetectionResult {
  const joints = arm.__joints();

  // Shape 1: multi-parent. If two joints share the same child part, the graph
  // is no longer a tree — name every joint that lands on a re-used child.
  const childCount = new Map<string, string[]>(); // child id → joint names
  for (const j of joints) {
    const list = childCount.get(j.childPartId) ?? [];
    list.push(j.name);
    childCount.set(j.childPartId, list);
  }
  const multiParentJoints: string[] = [];
  for (const list of childCount.values()) {
    if (list.length > 1) multiParentJoints.push(...list);
  }
  if (multiParentJoints.length > 0) {
    return { hasCycle: true, cycleNodes: multiParentJoints };
  }

  // Shape 2: cycle through parent-joint links. With single-parent guaranteed
  // above, this can only happen if the graph contains a back-edge. DFS from
  // every part, walking parent links; revisit of an in-stack part is a cycle.
  const parentJointByPart = new Map<string, { name: string; parentPartId: string }>();
  for (const j of joints) parentJointByPart.set(j.childPartId, { name: j.name, parentPartId: j.parentPartId });

  const visited = new Set<string>();
  const stack = new Set<string>();
  const cyclePath: string[] = [];

  const dfs = (partId: string): boolean => {
    if (stack.has(partId)) return true;
    if (visited.has(partId)) return false;
    stack.add(partId);
    const parentJ = parentJointByPart.get(partId);
    if (parentJ && dfs(parentJ.parentPartId)) {
      cyclePath.push(parentJ.name);
      return true;
    }
    stack.delete(partId);
    visited.add(partId);
    return false;
  };

  for (const part of arm.__parts()) {
    if (dfs(part.id)) {
      return { hasCycle: true, cycleNodes: cyclePath };
    }
  }

  return { hasCycle: false, cycleNodes: [] };
}
