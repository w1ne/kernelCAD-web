// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/loopAdapter.ts
//
// Bridges the mate graph to the closed-loop solver
// (`shared/kinematics/loopClosure`). Both mate walks — the capture-time
// `solveMates` and the pure recompute-time `mateFk` — record the spanning
// tree they build (which part reached which, through which mate, from which
// side) and the mates the tree left out. This module turns that record into
// a `LoopModel`, decides which mate poses are driven, and runs the solve.
//
// Conventions kept from the tree walk: a tree mate rotates / slides about
// the PARENT side's connector axis, so walking a mate from its `b` side uses
// `b`'s connector. Loop names, cut joints and `loopMode` pins use the mate's
// authored `a` side, so they do not depend on the walk direction.

import type { NumericPoses } from '../capture/forwardKinematics';
import {
  solveLoops,
  type JointValue,
  type LoopBranchState,
  type LoopJoint,
  type LoopJointKind,
  type LoopPin,
  type LoopSolveResult,
} from '../../shared/kinematics/loopClosure';
import type { Transform, Vec3 } from '../../shared/runtime/se3';
import type { MateCouplingRecord } from './coupledPoses';
import { parseConnectorRef, type MateRecord } from './mate';
import type { MateType } from './mateTypes';

/** One tree edge as the walk took it. */
export interface MateTreeStep {
  readonly mate: MateRecord;
  /** True when the walk entered the mate from its `a` side. */
  readonly partIsA: boolean;
}

export interface MateWalkRecord {
  readonly roots: ReadonlyArray<{ readonly body: string; readonly placement: Transform }>;
  readonly tree: readonly MateTreeStep[];
  readonly loopMates: readonly MateRecord[];
}

/** Connector origin (part-local mm) and axis for `part.connector`. */
export type ConnectorLookup = (partName: string, connectorName: string) => { origin: Vec3; axis: Vec3 };

export interface MateLoopOptions {
  /** Mate poses the caller drives; every other loop mate is solved. */
  readonly driven: ReadonlySet<string>;
  /** Driven mate pose targets (extra keys are ignored). */
  readonly poses: NumericPoses;
  /** As-built mate poses (capture-time `pose`); missing ones are zero. */
  readonly asBuilt: NumericPoses;
  /** Previous solved coordinates along a sweep (continuation seed). */
  readonly seed?: NumericPoses;
  readonly previous?: LoopBranchState;
  readonly pins?: readonly LoopPin[];
}

function loopKind(type: MateType): LoopJointKind {
  return type === 'fastened' ? 'fixed' : type;
}

function treeJoint(step: MateTreeStep, connector: ConnectorLookup): LoopJoint {
  const a = parseConnectorRef(step.mate.a);
  const b = parseConnectorRef(step.mate.b);
  const parent = step.partIsA ? a : b;
  const child = step.partIsA ? b : a;
  const pc = connector(parent.partName, parent.connectorName);
  const cc = connector(child.partName, child.connectorName);
  const ac = connector(a.partName, a.connectorName);
  return {
    name: step.mate.name,
    kind: loopKind(step.mate.type),
    a: parent.partName,
    b: child.partName,
    aOrigin: pc.origin,
    bOrigin: cc.origin,
    axis: pc.axis,
    signBody: a.partName,
    signAxis: ac.axis,
  };
}

function cutJoint(mate: MateRecord, connector: ConnectorLookup): LoopJoint {
  const a = parseConnectorRef(mate.a);
  const b = parseConnectorRef(mate.b);
  const ac = connector(a.partName, a.connectorName);
  const bc = connector(b.partName, b.connectorName);
  return { name: mate.name, kind: loopKind(mate.type), a: a.partName, b: b.partName, aOrigin: ac.origin, bOrigin: bc.origin, axis: ac.axis };
}

/** True when some loop runs through an articulated mate (a fastened-only
 *  loop has nothing to solve and keeps the residual classification). */
export function hasArticulatedLoop(walk: MateWalkRecord, connector: ConnectorLookup): boolean {
  if (walk.loopMates.length === 0) return false;
  if (walk.loopMates.some((m) => m.type !== 'fastened')) return true;
  const model = { roots: walk.roots, tree: walk.tree.map((s) => treeJoint(s, connector)), cuts: [] };
  const parentEdge = new Map(model.tree.map((e) => [e.b, e]));
  for (const cut of walk.loopMates) {
    const onPath = pathJoints(parseConnectorRef(cut.a).partName, parseConnectorRef(cut.b).partName, parentEdge);
    if (onPath.some((e) => e.kind !== 'fixed')) return true;
  }
  return false;
}

function pathJoints(x: string, y: string, parentEdge: ReadonlyMap<string, LoopJoint>): LoopJoint[] {
  const up = (from: string): LoopJoint[] => {
    const out: LoopJoint[] = [];
    const seen = new Set<string>([from]);
    for (let e = parentEdge.get(from); e !== undefined && !seen.has(e.a); e = parentEdge.get(e.a)) {
      out.push(e);
      seen.add(e.a);
    }
    return out;
  };
  const ux = up(x);
  const uy = up(y);
  const shared = new Set(ux.map((e) => e.name).filter((n) => uy.some((e) => e.name === n)));
  return [...ux, ...uy].filter((e) => !shared.has(e.name));
}

function zeroFor(type: MateType): JointValue {
  return type === 'ball' ? [0, 0, 0] : 0;
}

/** Solve the loops of a recorded mate walk. Throws `Error` on a bad pin. */
export function solveMateLoops(walk: MateWalkRecord, connector: ConnectorLookup, opts: MateLoopOptions): LoopSolveResult {
  const model = {
    roots: walk.roots,
    tree: walk.tree.map((s) => treeJoint(s, connector)),
    cuts: walk.loopMates.map((m) => cutJoint(m, connector)),
  };
  const driven: Record<string, JointValue> = {};
  const seed: Record<string, JointValue> = {};
  const allMates = [...walk.tree.map((s) => s.mate), ...walk.loopMates];
  for (const m of allMates) {
    if (m.type === 'fastened' || m.type === 'planar') continue;
    const value = opts.poses[m.name];
    if (opts.driven.has(m.name) && value !== undefined) driven[m.name] = value;
    seed[m.name] = opts.seed?.[m.name] ?? opts.asBuilt[m.name] ?? zeroFor(m.type);
  }
  return solveLoops({ model, driven, seed, pins: opts.pins, previous: opts.previous });
}

/** Driven mates: the caller's pose keys, plus mates a coupling derives from
 *  a driven mate. */
export function drivenMateNames(
  mates: readonly MateRecord[],
  couplings: readonly MateCouplingRecord[],
  callerPoses: NumericPoses | undefined,
): Set<string> {
  const names = new Set(mates.map((m) => m.name));
  const driven = new Set(Object.keys(callerPoses ?? {}).filter((k) => names.has(k)));
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of couplings) {
      if (driven.has(c.source) && !driven.has(c.driven)) {
        driven.add(c.driven);
        grew = true;
      }
    }
  }
  return driven;
}
