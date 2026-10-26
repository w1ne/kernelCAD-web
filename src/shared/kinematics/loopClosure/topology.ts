// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/kinematics/loopClosure/topology.ts
//
// Graph bookkeeping for the loop solver: one loop per cut joint (the cut plus
// the tree path between its two bodies), clusters of loops that share tree
// joints, and the unknown-coordinate layout.

import type { JointValue, LoopInfo, LoopJoint, LoopJointKind, LoopModel } from './types';

/** A joint on a loop, walked in cycle order from body `from` to body `to`. */
export interface CycleStep {
  readonly joint: LoopJoint;
  readonly from: string;
  readonly to: string;
  readonly isCut: boolean;
}

export interface LoopTopology extends LoopInfo {
  readonly steps: readonly CycleStep[];
  /** Tree joints on this loop. */
  readonly treeJoints: readonly string[];
}

export interface UnknownSlot {
  readonly joint: string;
  /** Index into a ball triple; 0 for scalar joints. */
  readonly component: number;
  readonly unit: 'ang' | 'lin';
}

export interface Cluster {
  readonly loops: readonly LoopTopology[];
  readonly treeJoints: readonly string[];
}

export function coordinateCount(kind: LoopJointKind): number {
  if (kind === 'ball') return 3;
  if (kind === 'fixed' || kind === 'planar') return 0;
  return 1;
}

export function isRevoluteLike(kind: LoopJointKind): boolean {
  return kind === 'revolute' || kind === 'cylindrical' || kind === 'pin_slot';
}

/** Physical freedom of a joint for the Grübler count. The solver models
 *  `cylindrical` / `pin_slot` with their rotation only (one coordinate), so
 *  they count as one here too. */
export function jointFreedom(kind: LoopJointKind): number {
  if (kind === 'ball' || kind === 'planar') return 3;
  if (kind === 'fixed') return 0;
  return 1;
}

/** Loops of the model, one per cut joint, in cut declaration order. */
export function buildLoops(model: LoopModel): LoopTopology[] {
  const parentEdge = new Map<string, LoopJoint>();
  for (const e of model.tree) parentEdge.set(e.b, e);
  return model.cuts.map((cut) => buildLoop(cut, parentEdge));
}

function chainToRoot(body: string, parentEdge: ReadonlyMap<string, LoopJoint>): string[] {
  const chain = [body];
  const seen = new Set(chain);
  let cur = body;
  for (let e = parentEdge.get(cur); e !== undefined && !seen.has(e.a); e = parentEdge.get(cur)) {
    cur = e.a;
    seen.add(cur);
    chain.push(cur);
  }
  return chain;
}

function buildLoop(cut: LoopJoint, parentEdge: ReadonlyMap<string, LoopJoint>): LoopTopology {
  const upFromB = chainToRoot(cut.b, parentEdge);
  const upFromA = chainToRoot(cut.a, parentEdge);
  const onA = new Set(upFromA);
  const lcaIndexB = upFromB.findIndex((x) => onA.has(x));
  if (lcaIndexB < 0) {
    throw new Error(`loopClosure: cut joint '${cut.name}' connects bodies in different trees.`);
  }
  const lca = upFromB[lcaIndexB];
  const steps: CycleStep[] = [{ joint: cut, from: cut.a, to: cut.b, isCut: true }];
  for (let i = 0; i < lcaIndexB; i++) {
    const e = parentEdge.get(upFromB[i])!;
    steps.push({ joint: e, from: e.b, to: e.a, isCut: false });
  }
  const down = upFromA.slice(0, upFromA.indexOf(lca)).reverse();
  for (const body of down) {
    const e = parentEdge.get(body)!;
    steps.push({ joint: e, from: e.a, to: e.b, isCut: false });
  }
  const treeJoints = steps.filter((s) => !s.isCut).map((s) => s.joint.name);
  return { name: cut.name, cutJoint: cut.name, joints: steps.map((s) => s.joint.name), steps, treeJoints };
}

/** Group loops that share a tree joint (union-find, deterministic order). */
export function buildClusters(loops: readonly LoopTopology[]): Cluster[] {
  const parent = loops.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map<string, number>();
  loops.forEach((loop, i) => {
    for (const j of loop.treeJoints) {
      const o = owner.get(j);
      if (o === undefined) owner.set(j, i);
      else parent[find(i)] = find(o);
    }
  });
  const groups = new Map<number, LoopTopology[]>();
  loops.forEach((loop, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), loop]);
  });
  return [...groups.values()].map((group) => ({
    loops: group,
    treeJoints: [...new Set(group.flatMap((l) => l.treeJoints))],
  }));
}

/** Unknown coordinates: tree joints on a loop, with freedom, not driven. */
export function unknownSlots(
  model: LoopModel,
  loops: readonly LoopTopology[],
  driven: Readonly<Record<string, JointValue>>,
): UnknownSlot[] {
  const onLoop = new Set(loops.flatMap((l) => l.treeJoints));
  const slots: UnknownSlot[] = [];
  for (const e of model.tree) {
    if (!onLoop.has(e.name) || driven[e.name] !== undefined) continue;
    const n = coordinateCount(e.kind);
    for (let c = 0; c < n; c++) {
      slots.push({ joint: e.name, component: c, unit: e.kind === 'prismatic' ? 'lin' : 'ang' });
    }
  }
  return slots;
}

/** Every coordinate slot of the given tree joints (driven or not). */
export function allSlots(model: LoopModel, joints: readonly string[]): UnknownSlot[] {
  const wanted = new Set(joints);
  const slots: UnknownSlot[] = [];
  for (const e of model.tree) {
    if (!wanted.has(e.name)) continue;
    for (let c = 0; c < coordinateCount(e.kind); c++) {
      slots.push({ joint: e.name, component: c, unit: e.kind === 'prismatic' ? 'lin' : 'ang' });
    }
  }
  return slots;
}
