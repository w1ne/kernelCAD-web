// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/kinematics/loopClosure/analysis.ts
//
// Mobility of each loop cluster: the spatial Grübler–Kutzbach count next to
// the rank of the closure Jacobian at the solved pose. The rank is the truth
// (it sees planar and parallel-axis geometry); Grübler is reported so the
// difference — redundant constraints — is visible.

import { jacobian } from './levenbergMarquardt';
import { dotCols, numericalRank, singularValues } from './linearAlgebra';
import { applySlots, closureResidual, forwardTree, readSlots, type Coordinates } from './kinematics';
import { allSlots, coordinateCount, jointFreedom, type Cluster } from './topology';
import type { JointValue, LoopMobility, LoopModel } from './types';

export function clusterMobility(
  model: LoopModel,
  cluster: Cluster,
  coords: Readonly<Coordinates>,
  driven: Readonly<Record<string, JointValue>>,
  lref: number,
): LoopMobility {
  const slots = allSlots(model, cluster.treeJoints);
  const cuts = cluster.loops.map((l) => l.steps[0].joint);
  const residual = (x: Float64Array): Float64Array =>
    closureResidual(cuts, forwardTree(model, applySlots(coords, slots, x, lref)), lref, {}).r;
  const J = jacobian(residual, readSlots(coords, slots, lref));
  const rank = numericalRank(singularValues(J).sigma);
  const independent = independentJoints(J, slots.map((x) => x.joint), rank);
  const mobility = slots.length - rank;
  const bodies = new Set(cluster.loops.flatMap((l) => l.steps.flatMap((s) => [s.from, s.to])));
  const joints = [...cluster.treeJoints.map((n) => model.tree.find((e) => e.name === n)!), ...cuts];
  const gruebler = 6 * (bodies.size - 1) - joints.reduce((acc, j) => acc + 6 - jointFreedom(j.kind), 0);
  let drivenDof = 0;
  for (const name of cluster.treeJoints) {
    if (driven[name] === undefined) continue;
    drivenDof += coordinateCount(model.tree.find((e) => e.name === name)!.kind);
  }
  for (const c of cuts) if (driven[c.name] !== undefined) drivenDof += 1;
  return {
    loops: cluster.loops.map((l) => l.name),
    coordinates: slots.length,
    rank,
    mobility,
    gruebler,
    redundantConstraints: mobility - gruebler,
    drivenDof,
    independent,
  };
}

/** Split the coordinates into `rank` dependent ones and the rest. Columns
 *  are taken as dependent from the last tree joint backwards, so the joints
 *  the spanning tree reaches first (next to the ground: usually the input
 *  crank) stay independent. */
function independentJoints(J: readonly Float64Array[], names: readonly string[], rank: number): string[] {
  const basis: Float64Array[] = [];
  const dependent = new Set<number>();
  let scale = 0;
  for (const c of J) scale = Math.max(scale, Math.sqrt(dotCols(c, c)));
  for (let k = J.length - 1; k >= 0 && basis.length < rank; k--) {
    const w = Float64Array.from(J[k]);
    for (const e of basis) {
      const d = dotCols(e, w);
      for (let i = 0; i < w.length; i++) w[i] -= d * e[i];
    }
    const len = Math.sqrt(dotCols(w, w));
    if (!(len > 1e-6 * Math.max(scale, 1e-12))) continue;
    basis.push(w.map((v) => v / len));
    dependent.add(k);
  }
  return [...new Set(names.filter((_, k) => !dependent.has(k)))];
}
