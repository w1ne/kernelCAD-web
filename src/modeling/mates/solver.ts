// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/mates/solver.ts
//
// v0.6 Task 6: tree-FK over the mate graph for all 7 mate types.
// v0.6 T-pose: pose-driven articulation. `solveMates(arm, poses?)` honors the
// numeric `poses` override first, then the capture-time `mate.pose`
// (resolved through the session's ParamTable), defaulting to 0 / [0,0,0].
//
// `solveMates(arm, poses?)` walks the parts-by-mate graph and produces
// per-part world transforms in the assembly's root frame. Pose-driven joint
// frames (revolute rotation, prismatic translation, ball Euler) compose into
// the parent→child transform — mirroring the v0.5 body-tree FK math in
// `../../capture/forwardKinematics.ts`.
//
// Tree topologies are solved exactly by the walk. Mates the spanning tree
// leaves out close loops:
//
//   - a loop through an articulated mate is solved by the loop-closure
//     solver (`./loopAdapter` → `shared/kinematics/loopClosure`): the
//     caller's pose keys are driven, the other loop mates are solved from
//     the as-built pose (continuation), and `result.loop` carries loop names,
//     mobility and `kinematic.loop.*` findings;
//   - a fastened-only loop has nothing to move: the closure residual
//     classifies it as 'redundant-ok' or 'over-constrained'.
//
// The pure `mateFk` (used by the OCCT lowerer) runs the same loop solve.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { NumericPoses } from '../capture/forwardKinematics';
import { KernelError } from '../../shared/intent/kernelError';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId } from '../../shared/intent/types';
import { norm2 } from '../../shared/numeric/jacobian';
import { currentValue } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import { Transform, type Vec3 as Se3Vec3 } from '../../shared/runtime/se3';
import {
  resolveConnectorFrame,
  type Connector,
  type ConnectorOrigin,
} from './connector';
import { expandCoupledPoses } from './coupledPoses';
import { atPlacement, resolvedPartAt } from './partFrame';
import type { MatePose, MateRecord } from './mate';
import { parseConnectorRef } from './mate';
import type { MateType } from './mateTypes';
import { solverGroundedPart } from './solverRoot';
import {
  drivenMateNames,
  hasArticulatedLoop,
  solveMateLoops,
  type ConnectorLookup,
  type MateTreeStep,
  type MateWalkRecord,
} from './loopAdapter';
import type { LoopBranchState, LoopPin, LoopSolveResult } from '../../shared/kinematics/loopClosure';

export type SolveStatus =
  | 'solved'
  | 'under-constrained'
  | 'over-constrained'
  | 'redundant-ok'
  | 'did-not-converge';

export interface SolveResult {
  status: SolveStatus;
  /** part-name -> where the part's own frame sits (its placement): apply it
   *  to the part's source shape and to its connector origins as declared. A
   *  mated part that no mate places (the first part of its mate component,
   *  or one the walk does not reach) sits where its `at` puts it; a part in
   *  no mate gets identity. A scene part's shape already carries `at`, so its
   *  `worldTransform` is `sceneMotion(placement, at)` (see `./partFrame`).
   *  Always populated on 'solved' / 'redundant-ok'; best-effort on
   *  'did-not-converge' (T7 will refine). */
  poses: Map<string, Transform>;
  /** Loop solver iteration count when relevant (0 on tree topologies and on
   *  fastened-only loops which classify without Newton iteration). */
  iterations?: number;
  /** Closed loops only: how far apart each loop-closing mate's two connector
   *  origins sit (mm) at the returned poses. Tree mates are satisfied by the
   *  FK walk itself, so they never appear here. */
  loopResiduals?: ReadonlyArray<{ readonly mate: string; readonly mm: number }>;
  /** Articulated closed loops only: the loop solve — loop names, mobility
   *  (Grübler vs rank, driven DOF), `kinematic.loop.*` diagnostics, every
   *  solved mate coordinate and the branch state to seed the next pose of a
   *  sweep with. */
  loop?: LoopSolveResult;
}

/** Adjacency edge: which mate connects this node to a neighbor, and from
 *  which side (a vs b). Used both for cycle detection and parent-edge lookup
 *  during the FK walk. */
interface MateEdge {
  readonly mate: MateRecord;
  /** Name of the other part this mate connects to from `partName`'s side. */
  readonly neighbor: string;
  /** `true` when `partName` corresponds to `mate.a`'s side. */
  readonly partIsA: boolean;
}

/** Fastened-only loop classification threshold. */
const SOLVER = {
  /** Convergence threshold on `||r||` (mm — connector world positions are
   *  in mm under the v0.6 unit convention). */
  RESIDUAL_TOL: 1e-6,
} as const;

/**
 * Resolve a mate's articulation pose to its numeric joint-frame value.
 *
 * Pose-resolution chain (highest priority first):
 *   1. `numericOverrides[mate.name]` — caller-supplied override (the
 *      `Assembly.solvedModel(poses)` surface). May carry ParamRefs per
 *      component — `solvedModel` passes them through unresolved so the
 *      record stays reactive — and is resolved here exactly like a
 *      capture-time pose. (Before ParamRef numeric coercion threw, an
 *      unresolved ref silently produced a NaN spanning-tree transform that
 *      downstream lowering happened to discard.)
 *   2. `mate.pose` — capture-time pose stored on the MateRecord. May carry
 *      a ParamRef; resolved via the session's ParamTable through
 *      `currentValue` (the same path `Assembly.solve` uses for `Editable`
 *      pose coords).
 *   3. Default — `0` for scalar pose types, `[0,0,0]` for ball.
 *
 * Returns `undefined` for mate types that don't accept articulation
 * (fastened / planar) — capture-time validation already rejects `mate.pose`
 * on those, and the per-type SE(3) collapses to identity regardless.
 */
function resolveMatePose(
  mate: MateRecord,
  arm: Assembly,
  numericOverrides: NumericPoses | undefined,
): number | [number, number, number] | undefined {
  if (mate.type === 'fastened' || mate.type === 'planar') return undefined;
  // 1. Caller-supplied override wins; resolve any ParamRef components via
  //    the ParamTable before shape validation, same as capture-time poses.
  const override = numericOverrides?.[mate.name];
  if (override !== undefined) {
    const table = arm.__session().paramTable;
    const resolved = Array.isArray(override)
      ? (override.map((v) => currentValue(v as Editable<number>, table)) as [
          number,
          number,
          number,
        ])
      : currentValue(override as Editable<number>, table);
    return validateNumericPoseShape(mate, resolved, 'solveMates');
  }
  // 2. Capture-time mate.pose (may be ParamRef — resolve via ParamTable).
  if (mate.pose !== undefined) {
    return resolvePoseFromEditable(mate.pose, mate.type, arm);
  }
  // 3. Default — zero pose.
  return mate.type === 'ball' ? [0, 0, 0] : 0;
}

/** Walk an `Editable`-bearing pose triple/scalar and resolve via ParamTable. */
function resolvePoseFromEditable(
  pose: MatePose,
  type: MateType,
  arm: Assembly,
): number | [number, number, number] {
  const table = arm.__session().paramTable;
  if (Array.isArray(pose)) {
    if (type !== 'ball') {
      throw new KernelError(
        'feature.invalid-args',
        `solveMates: mate type '${type}' got a triple pose; expected a single number.`,
        undefined,
        `invalid-args.assembly.mate-pose-shape — '${type}' mates take a single Editable<number> pose.`,
      );
    }
    return [
      currentValue(pose[0] as Editable<number>, table),
      currentValue(pose[1] as Editable<number>, table),
      currentValue(pose[2] as Editable<number>, table),
    ];
  }
  if (type === 'ball') {
    throw new KernelError(
      'feature.invalid-args',
      `solveMates: ball mate pose must be [eulerXDeg, eulerYDeg, eulerZDeg]; got a single number.`,
      undefined,
      `invalid-args.assembly.mate-pose-shape — ball mates take an XYZ Euler triple of Editable<number>.`,
    );
  }
  return currentValue(pose as Editable<number>, table);
}

export interface SolveMatesOptions {
  /** No longer needed: articulated closed loops are always solved by the
   *  loop-closure solver. Accepted (and ignored) for compatibility. */
  acceptConsistentArticulatedLoops?: boolean;
  /** Solve each disconnected mate component from its first declared part.
   *  The default preserves the historical behavior: only the component
   *  containing parts[0] is traversed and all other parts are identity-filled. */
  solveDisconnectedComponents?: boolean;
  /** Continuation seed for articulated loops: the mate coordinates solved at
   *  the previous pose of a sweep (`result.loop.coordinates`). Default: the
   *  as-built (capture-time) poses. */
  seed?: NumericPoses;
  /** Branch state from the previous pose (`result.loop.state`); lets the
   *  solve detect a branch flip between consecutive sweep poses. */
  previous?: LoopBranchState;
  /** Branch pins; default `arm.loopMode(...)` declarations. */
  loopModes?: readonly LoopPin[];
}

export async function solveMates(
  arm: Assembly,
  poses?: NumericPoses,
  opts?: SolveMatesOptions,
): Promise<SolveResult> {
  const parts = arm.__parts();
  const mates = arm.__mates();
  const expandedPoses = expandCoupledPoses(mates, arm.__mateCouplings(), poses ?? {}, {
    resolveSourcePose: (mate, currentPoses) => resolveMatePose(mate, arm, currentPoses),
  });

  if (parts.length === 0) {
    return { status: 'solved', poses: new Map() };
  }

  // 1. Adjacency: part-name -> array of mate edges.
  const adjacency = new Map<string, MateEdge[]>();
  for (const p of parts) adjacency.set(p.name, []);
  for (const m of mates) {
    const aSide = parseConnectorRef(m.a);
    const bSide = parseConnectorRef(m.b);
    adjacency.get(aSide.partName)!.push({ mate: m, neighbor: bSide.partName, partIsA: true });
    adjacency.get(bSide.partName)!.push({ mate: m, neighbor: aSide.partName, partIsA: false });
  }

  // 2. Build a spanning tree via BFS from the first declared part. Mates not
  //    in the tree become loop-closure constraints — passed to `loopSolve`.
  const partByName = new Map(parts.map((p) => [p.name, p]));
  const { worldT, loopMates, walk } = await walkSpanningTree(
    parts,
    adjacency,
    partByName,
    arm,
    expandedPoses,
    opts?.solveDisconnectedComponents === true,
    restingPlacementFor(arm, adjacency),
  );

  if (loopMates.length === 0) {
    return { status: 'solved', poses: worldT };
  }

  // 3. Closed loops present. A loop through an articulated mate is solved
  //    by the loop-closure solver (driven poses from the caller, the other
  //    loop mates solved); a fastened-only loop has nothing to move and
  //    keeps the residual classification.
  const connector = await resolvedConnectorLookup(mates, partByName);
  if (hasArticulatedLoop(walk, connector)) {
    return solveArticulatedLoops(arm, walk, connector, worldT, poses, expandedPoses, opts);
  }
  return loopSolve(partByName, loopMates, worldT);
}

/** Resolve every mate connector once (topology origins lower the part). */
async function resolvedConnectorLookup(
  mates: readonly MateRecord[],
  partByName: ReadonlyMap<string, AssemblyPartStored>,
): Promise<ConnectorLookup> {
  const table = new Map<string, { origin: Se3Vec3; axis: Se3Vec3 }>();
  for (const m of mates) {
    for (const ref of [m.a, m.b]) {
      if (table.has(ref)) continue;
      const side = parseConnectorRef(ref);
      const part = partByName.get(side.partName)!;
      const c = findConnector(part, side.connectorName);
      const frame = await resolveConnectorFrame(part.originalShape, c.origin);
      table.set(ref, {
        origin: frame.origin as Se3Vec3,
        axis: (frame.axis ?? c.axis ?? [0, 0, 1]) as Se3Vec3,
      });
    }
  }
  return (partName, connectorName) => table.get(`${partName}.${connectorName}`)!;
}

/** Distance between a mate's two connector origins at the given placements. */
function connectorGapMm(m: MateRecord, connector: ConnectorLookup, poses: ReadonlyMap<string, Transform>): number {
  const a = parseConnectorRef(m.a);
  const b = parseConnectorRef(m.b);
  const pa = poses.get(a.partName)!.point(connector(a.partName, a.connectorName).origin);
  const pb = poses.get(b.partName)!.point(connector(b.partName, b.connectorName).origin);
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}

async function solveArticulatedLoops(
  arm: Assembly,
  walk: MateWalkRecord,
  connector: ConnectorLookup,
  treeWorldT: Map<string, Transform>,
  callerPoses: NumericPoses | undefined,
  expandedPoses: NumericPoses,
  opts: SolveMatesOptions | undefined,
): Promise<SolveResult> {
  const mates = arm.__mates();
  const driven = drivenMateNames(mates, arm.__mateCouplings(), callerPoses);
  const asBuilt: NumericPoses = {};
  for (const m of mates) {
    const v = driven.has(m.name) ? resolveMatePose(m, arm, undefined) : (expandedPoses[m.name] ?? resolveMatePose(m, arm, undefined));
    if (v !== undefined) asBuilt[m.name] = v;
  }
  let loop: LoopSolveResult;
  try {
    loop = solveMateLoops(walk, connector, {
      driven, poses: expandedPoses, asBuilt, seed: opts?.seed, previous: opts?.previous,
      pins: opts?.loopModes ?? arm.__loopModes(),
    });
  } catch (e) {
    return invalidArgs({
      api: 'assembly.loopMode(loopName, { joint, sign })',
      path: 'loopName',
      gotText: (e as Error).message,
      requires: 'a loop name from solveMates(...).loop.loops and a revolute mate on that loop',
      example: "arm.loopMode('coupler_rocker', { joint: 'crank_coupler', sign: '+' })",
    });
  }
  // A loop that does not close at the requested pose keeps the tree-walk
  // placements at that pose (best effort, as before), so the loop residuals
  // show how far apart the cut mates are where the caller asked. The last
  // closed pose is in `loop.transforms`.
  const poses = new Map(treeWorldT);
  if (loop.status === 'solved') for (const [name, t] of loop.transforms) poses.set(name, t);
  return {
    status: loop.status === 'solved' ? 'solved' : 'did-not-converge',
    poses,
    iterations: loop.iterations,
    loopResiduals: walk.loopMates.map((m) => ({ mate: m.name, mm: connectorGapMm(m, connector, poses) })),
    loop,
  };
}

/**
 * Resolved part data for the pure `mateFk` function. Carries the FeatureId
 * (so the lowerer can index its SceneBackend parts by FeatureId — matching
 * `forwardKinematics`'s return shape), the part name (the mate graph keys
 * connectors as `"<partName>.<connectorName>"`), and connectors whose
 * origins have already been resolved to numeric `vec3` (topology queries
 * resolved upstream — at capture time during `Assembly.solvedModel`).
 *
 * The lowerer's `solvedAssembly` case (and any other recompute-time caller)
 * builds these from the encoded `solvedAssembly` metadata; `solveMates`
 * builds them in-process from the live `Assembly` handle.
 */
export interface ResolvedMatePart {
  readonly id: FeatureId;
  readonly name: string;
  /** Connectors with numeric `vec3` origins only — topology origins must be
   *  resolved by the caller before passing through here. Origins are in the
   *  frame of the shape the result is applied to: the lowerer gives them
   *  where the part's `at` puts them, because its scene shapes carry `at`. */
  readonly connectors: readonly Connector[];
}

/**
 * Pure mate-FK. Walks the mate graph (BFS spanning tree from `parts[0]`)
 * and composes per-part world transforms in the assembly root frame.
 *
 * Pure data in / pure data out — no `Assembly` handle, no `ParamTable`, no
 * topology resolution. Mate poses are read directly from `numericPoses`
 * (caller resolves any ParamRefs / capture-time `mate.pose` ahead of time);
 * connector origins are read straight off `parts[i].connectors[j].origin`
 * (caller resolves any `topology` queries to `vec3` ahead of time).
 *
 * Returns a `Map<FeatureId, Transform>` keyed by part FeatureId — matching
 * the return shape of `forwardKinematics`. Each transform moves the part's
 * shape in the frame its connectors are given in (the walk root stays put);
 * with connectors where `at` puts them, as the lowerer passes them, that is
 * the scene part's `worldTransform` and equals `sceneMotion` of the
 * `solveMates` placement. Disconnected parts default to
 * identity. Loop-closure mates are dropped from the tree walk (the loop
 * residual lives in `solveMates`); when only tree mates are present this is
 * functionally complete for the OCCT lowerer's geometry placement.
 *
 * Errors:
 *   - mate ref points at an unknown part / unknown connector -> KernelError
 *     (`assembly.mate.connector-not-found`)
 *   - unsupported mate type -> KernelError (`mate-type-unsupported`)
 */
export function mateFk(
  parts: readonly ResolvedMatePart[],
  mates: readonly MateRecord[],
  numericPoses: NumericPoses,
  loopOpts?: MateFkLoopOptions,
): Map<FeatureId, Transform> {
  return mateFkWithPlacedParts(parts, mates, numericPoses, loopOpts).transforms;
}

/** Closed-loop inputs for the pure mate FK. Without them every mate pose is
 *  an as-built value and nothing is driven. */
export interface MateFkLoopOptions {
  /** Mate names whose pose in `numericPoses` the caller drives. */
  readonly driven?: ReadonlySet<string>;
  /** As-built mate poses (seed). Default: `numericPoses` minus driven keys. */
  readonly asBuilt?: NumericPoses;
  readonly loopModes?: readonly LoopPin[];
}

/** `mateFk`'s transforms, plus the parts a mate edge placed. */
export interface MateFkResult {
  readonly transforms: Map<FeatureId, Transform>;
  /** Parts the walk reached through a mate: every reached part except the
   *  walk root `parts[0]`. A mate decides where these go, so their own `at`
   *  does not move them. The root and the parts the walk does not reach
   *  stay where their `at` puts them. */
  readonly placedByMate: ReadonlySet<FeatureId>;
}

/** `mateFk`, also reporting which parts a mate edge placed. */
export function mateFkWithPlacedParts(
  parts: readonly ResolvedMatePart[],
  mates: readonly MateRecord[],
  numericPoses: NumericPoses,
  loopOpts?: MateFkLoopOptions,
): MateFkResult {
  const transforms = new Map<FeatureId, Transform>();
  const placedByMate = new Set<FeatureId>();
  if (parts.length === 0) return { transforms, placedByMate };

  const adjacency = buildResolvedMateAdjacency(parts, mates);
  const partByName = new Map(parts.map((p) => [p.name, p]));
  const { worldTByName, placedNames, walk } = walkResolvedMateTree(parts, adjacency, partByName, numericPoses);
  closeResolvedLoops(walk, partByName, numericPoses, loopOpts, worldTByName);

  // 3. Re-key the result by FeatureId so callers (and the lowerer) can
  //    intersect it with v0.5 `forwardKinematics`'s map seamlessly.
  for (const p of parts) {
    transforms.set(p.id, worldTByName.get(p.name)!);
    if (placedNames.has(p.name)) placedByMate.add(p.id);
  }
  return { transforms, placedByMate };
}

/** 1. Adjacency: part-name -> array of mate edges. Mirrors `solveMates`'s
 *  tree walk but keyed off the resolved-part view (no Assembly handle). */
function buildResolvedMateAdjacency(
  parts: readonly ResolvedMatePart[],
  mates: readonly MateRecord[],
): Map<string, MateEdge[]> {
  const adjacency = new Map<string, MateEdge[]>();
  for (const p of parts) adjacency.set(p.name, []);
  for (const m of mates) {
    const aSide = parseConnectorRef(m.a);
    const bSide = parseConnectorRef(m.b);
    const aList = adjacency.get(aSide.partName);
    const bList = adjacency.get(bSide.partName);
    if (aList === undefined || bList === undefined) {
      // Mate references an unknown part — surface as KernelError so the
      // lowerer's exception path converts it to a structured diagnostic.
      throw new KernelError(
        'feature.invalid-args',
        `mateFk: mate '${m.name}' references unknown part(s) (${m.a} / ${m.b}).`,
        undefined,
        `invalid-args.assembly.mate-connector-not-found — declare the part(s) on the assembly before mating.`,
      );
    }
    aList.push({ mate: m, neighbor: bSide.partName, partIsA: true });
    bList.push({ mate: m, neighbor: aSide.partName, partIsA: false });
  }
  return adjacency;
}

/** 2. BFS spanning tree from `parts[0]`. Compose child world transform from
 *  parent's via the mate's local SE(3) contribution. `placedNames` holds
 *  every part a mate edge reached (the root is not one of them). */
/** Replace the tree placements of the parts on articulated loops with the
 *  loop solve (as-built branch, continuation from the as-built pose). A
 *  loop that cannot close keeps the tree placements; `solveMates` reports
 *  why at capture time. */
function closeResolvedLoops(
  walk: MateWalkRecord,
  partByName: ReadonlyMap<string, ResolvedMatePart>,
  numericPoses: NumericPoses,
  loopOpts: MateFkLoopOptions | undefined,
  worldTByName: Map<string, Transform>,
): void {
  if (walk.loopMates.length === 0) return;
  const connector: ConnectorLookup = (partName, connectorName) => {
    const part = partByName.get(partName)!;
    const c = findResolvedConnector(part, connectorName);
    return { origin: numericOrigin(c, partName), axis: connectorAxis(c) };
  };
  if (!hasArticulatedLoop(walk, connector)) return;
  const driven = loopOpts?.driven ?? new Set<string>();
  const asBuilt: NumericPoses = loopOpts?.asBuilt ?? Object.fromEntries(
    Object.entries(numericPoses).filter(([k]) => !driven.has(k)),
  );
  let loop: LoopSolveResult;
  try {
    loop = solveMateLoops(walk, connector, { driven, poses: numericPoses, asBuilt, pins: loopOpts?.loopModes });
  } catch {
    return;
  }
  for (const [name, t] of loop.transforms) worldTByName.set(name, t);
}

function walkResolvedMateTree(
  parts: readonly ResolvedMatePart[],
  adjacency: ReadonlyMap<string, MateEdge[]>,
  partByName: ReadonlyMap<string, ResolvedMatePart>,
  numericPoses: NumericPoses,
): { worldTByName: Map<string, Transform>; placedNames: Set<string>; walk: MateWalkRecord } {
  const root = solverGroundedPart(parts);
  if (root === undefined) {
    return { worldTByName: new Map(), placedNames: new Set(), walk: { roots: [], tree: [], loopMates: [] } };
  }
  const tree: MateTreeStep[] = [];
  const loopMates: MateRecord[] = [];
  const worldTByName = new Map<string, Transform>();
  worldTByName.set(root.name, Transform.identity());
  const queue: string[] = [root.name];
  const visited = new Set<string>([root.name]);
  const placedNames = new Set<string>();
  const seenMate = new Set<string>();

  while (queue.length > 0) {
    const parentName = queue.shift()!;
    const parentT = worldTByName.get(parentName)!;
    for (const edge of adjacency.get(parentName) ?? []) {
      if (seenMate.has(edge.mate.name)) continue;
      seenMate.add(edge.mate.name);
      if (visited.has(edge.neighbor)) {
        loopMates.push(edge.mate); // loop-closure mate — closed by closeResolvedLoops
        continue;
      }
      visited.add(edge.neighbor);
      placedNames.add(edge.neighbor);
      tree.push({ mate: edge.mate, partIsA: edge.partIsA });

      worldTByName.set(
        edge.neighbor,
        composeResolvedChildTransform(parentT, edge, partByName, numericPoses),
      );
      queue.push(edge.neighbor);
    }
  }

  // Disconnected parts default to identity. (Same convention as
  // `walkSpanningTree`'s tail fallback.)
  for (const p of parts) {
    if (!worldTByName.has(p.name)) worldTByName.set(p.name, Transform.identity());
  }
  return {
    worldTByName,
    placedNames,
    walk: { roots: [{ body: root.name, placement: Transform.identity() }], tree, loopMates },
  };
}

/** Compose one child's world transform from the parent's through the parent
 *  connector, the mate's joint SE(3) and the child connector inverse. */
function composeResolvedChildTransform(
  parentT: Transform,
  edge: MateEdge,
  partByName: ReadonlyMap<string, ResolvedMatePart>,
  numericPoses: NumericPoses,
): Transform {
  const aSide = parseConnectorRef(edge.mate.a);
  const bSide = parseConnectorRef(edge.mate.b);
  const parentSide = edge.partIsA ? aSide : bSide;
  const childSide = edge.partIsA ? bSide : aSide;
  const parentPart = partByName.get(parentSide.partName)!;
  const childPart = partByName.get(childSide.partName)!;
  const parentConnector = findResolvedConnector(parentPart, parentSide.connectorName);
  const childConnector = findResolvedConnector(childPart, childSide.connectorName);
  const parentOrigin = numericOrigin(parentConnector, parentPart.name);
  const childOrigin = numericOrigin(childConnector, childPart.name);

  const parentToConnector = Transform.translation(parentOrigin[0], parentOrigin[1], parentOrigin[2]);
  const childInverse = Transform.translation(-childOrigin[0], -childOrigin[1], -childOrigin[2]);
  const pose = resolveNumericPose(edge.mate, numericPoses);
  const jointLocalT = jointTransformForMate(edge.mate.type, pose, parentConnector);
  return parentT.compose(parentToConnector).compose(jointLocalT).compose(childInverse);
}

/** Pure-FK variant of `findConnector` — no Assembly handle, no Shape. */
function findResolvedConnector(part: ResolvedMatePart, connectorName: string): Connector {
  const c = part.connectors.find((x) => x.name === connectorName);
  if (!c) {
    throw new KernelError(
      'feature.invalid-args',
      `mateFk: connector '${connectorName}' not found on part '${part.name}'.`,
      part.id,
      `invalid-args.assembly.mate-connector-not-found — register the connector via partRef.connector('${connectorName}', ...) before solving.`,
    );
  }
  return c;
}

/** Read a numeric Vec3 from a resolved connector. Topology origins must have
 *  been resolved upstream — they trip this guard if they slip through. */
function numericOrigin(conn: Connector, partName: string): Se3Vec3 {
  if (conn.origin.kind !== 'vec3') {
    throw new KernelError(
      'feature.invalid-args',
      `mateFk: connector '${conn.name}' on part '${partName}' has an unresolved topology origin (kind='${conn.origin.kind}').`,
      undefined,
      `invalid-args.assembly.mate-connector-origin-unresolved — resolve topology connectors to numeric Vec3 before calling mateFk.`,
    );
  }
  return conn.origin.value as Se3Vec3;
}

/** Pure-data-in variant of `resolveMatePose` — reads ONLY from the numeric
 *  override map. Capture-time `mate.pose` (ParamRef-bearing) is resolved
 *  upstream by `Assembly.solvedModel` into the `numericPoses` entry. */
function resolveNumericPose(
  mate: MateRecord,
  numericPoses: NumericPoses,
): number | [number, number, number] | undefined {
  if (mate.type === 'fastened' || mate.type === 'planar') return undefined;
  const v = numericPoses[mate.name];
  if (v !== undefined) return validateNumericPoseShape(mate, v, 'mateFk');
  return mate.type === 'ball' ? [0, 0, 0] : 0;
}

function validateNumericPoseShape(
  mate: MateRecord,
  value: number | [number, number, number],
  caller: 'solveMates' | 'mateFk',
): number | [number, number, number] {
  if (mate.type === 'ball') {
    if (!Array.isArray(value)) {
      throw new KernelError(
        'feature.invalid-args',
        `${caller}: ball mate '${mate.name}' requires [x, y, z] pose; got a single number.`,
        undefined,
        `invalid-args.assembly.mate-pose-shape — ball mates take an XYZ Euler triple of numbers.`,
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    throw new KernelError(
      'feature.invalid-args',
      `${caller}: mate type '${mate.type}' got a triple pose; expected a single number.`,
      undefined,
      `invalid-args.assembly.mate-pose-shape — '${mate.type}' mates take a single numeric pose.`,
    );
  }
  return value;
}

interface SpanningTreeResult {
  worldT: Map<string, Transform>;
  /** The tree as walked, for the loop solver. */
  walk: MateWalkRecord;
  /** Mates dropped from the spanning tree — these are the loop-closure
   *  constraints the loop solver must satisfy. */
  loopMates: MateRecord[];
}

/** Where a part sits when no mate edge places it. A part in a mate (the
 *  first part of its mate component, or one the walk does not reach) stays
 *  where its `at` puts it, so the parts mated to it follow that `at`. A part
 *  in no mate keeps identity, as before. */
function restingPlacementFor(
  arm: Assembly,
  adjacency: ReadonlyMap<string, MateEdge[]>,
): (part: AssemblyPartStored) => Transform {
  return (part) => {
    if ((adjacency.get(part.name)?.length ?? 0) === 0) return Transform.identity();
    return atPlacement(resolvedPartAt(part.at, arm.__session().paramTable));
  };
}

/** BFS from `parts[0]`, optionally continuing from the first unvisited part
 *  in each disconnected component. Visited neighbors compose their placement
 *  from the parent through the connecting mate; every root and every part the
 *  walk does not reach gets `rest(part)`. Mates that would connect
 *  already-visited parts are deferred to `loopMates`. */
async function walkSpanningTree(
  parts: readonly AssemblyPartStored[],
  adjacency: ReadonlyMap<string, MateEdge[]>,
  partByName: ReadonlyMap<string, AssemblyPartStored>,
  arm: Assembly,
  poses: NumericPoses | undefined,
  solveDisconnectedComponents: boolean,
  rest: (part: AssemblyPartStored) => Transform,
): Promise<SpanningTreeResult> {
  const worldT = new Map<string, Transform>();
  const loopMates: MateRecord[] = [];
  const seenMate = new Set<string>();
  const roots: Array<{ body: string; placement: Transform }> = [];
  const tree: MateTreeStep[] = [];

  const queue: string[] = [];
  const visited = new Set<string>();
  let nextRoot: AssemblyPartStored | undefined = solverGroundedPart(parts);
  while (nextRoot !== undefined) {
    worldT.set(nextRoot.name, rest(nextRoot));
    roots.push({ body: nextRoot.name, placement: rest(nextRoot) });
    visited.add(nextRoot.name);
    queue.push(nextRoot.name);

    while (queue.length > 0) {
      const parentName = queue.shift()!;
      const parentT = worldT.get(parentName)!;
      for (const edge of adjacency.get(parentName) ?? []) {
        if (seenMate.has(edge.mate.name)) continue;
        seenMate.add(edge.mate.name);
        if (visited.has(edge.neighbor)) {
          // Loop-closure mate: both endpoints already placed by the tree.
          loopMates.push(edge.mate);
          continue;
        }
        visited.add(edge.neighbor);
        tree.push({ mate: edge.mate, partIsA: edge.partIsA });
        const childT = await composeChildTransform(parentT, edge, partByName, arm, poses);
        worldT.set(edge.neighbor, childT);
        queue.push(edge.neighbor);
      }
    }

    nextRoot = solveDisconnectedComponents
      ? parts.find((part) => !visited.has(part.name))
      : undefined;
  }

  // Parts the walk did not reach rest where they are, so callers always see
  // one transform per part. (T5 doesn't yet require a fully connected graph.)
  for (const p of parts) {
    if (!worldT.has(p.name)) worldT.set(p.name, rest(p));
  }

  return { worldT, loopMates, walk: { roots, tree, loopMates } };
}

/**
 * Fastened-only loop classification. Every loop reaching here runs through
 * fastened mates only (an articulated loop goes to the loop-closure solver),
 * so there is no joint to move and the residual decides in one evaluation:
 * for each loop-closure mate, the gap between its two connector origins at
 * the tree-FK placements.
 *   - ||r|| < SOLVER.RESIDUAL_TOL → 'redundant-ok'  (loop is consistent)
 *   - otherwise                   → 'over-constrained'
 * The residual is also reported per mate, so a caller can name the mate
 * that does not close.
 */
async function loopSolve(
  partByName: ReadonlyMap<string, AssemblyPartStored>,
  loopMates: readonly MateRecord[],
  initialPoses: Map<string, Transform>,
): Promise<SolveResult> {
  const residual = await computeLoopResidual(loopMates, partByName, initialPoses);
  const loopResiduals = loopMates.map((m, i) => ({
    mate: m.name,
    mm: Math.hypot(residual[3 * i], residual[3 * i + 1], residual[3 * i + 2]),
  }));
  const base = { poses: initialPoses, iterations: 0, loopResiduals };
  return norm2(residual) < SOLVER.RESIDUAL_TOL
    ? { status: 'redundant-ok', ...base }
    : { status: 'over-constrained', ...base };
}

/** Walk all loop-closure mates and stack their (A_world - B_world)
 *  3-vectors into a flat residual. */
async function computeLoopResidual(
  loopMates: readonly MateRecord[],
  partByName: ReadonlyMap<string, AssemblyPartStored>,
  worldT: ReadonlyMap<string, Transform>,
): Promise<number[]> {
  const r: number[] = [];
  for (const m of loopMates) {
    const aSide = parseConnectorRef(m.a);
    const bSide = parseConnectorRef(m.b);
    const aPart = partByName.get(aSide.partName)!;
    const bPart = partByName.get(bSide.partName)!;
    const aConn = findConnector(aPart, aSide.connectorName);
    const bConn = findConnector(bPart, bSide.connectorName);
    const aLocal = await originVec3(aPart, aConn.origin);
    const bLocal = await originVec3(bPart, bConn.origin);
    const aWorld = worldT.get(aPart.name)!.point(aLocal);
    const bWorld = worldT.get(bPart.name)!.point(bLocal);
    r.push(aWorld[0] - bWorld[0], aWorld[1] - bWorld[1], aWorld[2] - bWorld[2]);
  }
  return r;
}

/** Compose the child part's world transform from the parent's world
 *  transform and the mate's local SE(3) contribution. Pose-driven (Pattern A):
 *  the joint frame applies a rotation / translation per the mate's resolved
 *  pose around the PARENT connector's axis (revolute, prismatic, cylindrical,
 *  pin_slot) or as an Euler triple (ball). Fastened / planar collapse to
 *  identity at the joint frame. */
async function composeChildTransform(
  parentT: Transform,
  edge: MateEdge,
  partByName: ReadonlyMap<string, AssemblyPartStored>,
  arm: Assembly,
  poses: NumericPoses | undefined,
): Promise<Transform> {
  const aSide = parseConnectorRef(edge.mate.a);
  const bSide = parseConnectorRef(edge.mate.b);
  // From the parent's POV, the parent's connector is the one on its side and
  // the child's connector is on the other side.
  const parentSide = edge.partIsA ? aSide : bSide;
  const childSide = edge.partIsA ? bSide : aSide;

  const parentPart = partByName.get(parentSide.partName)!;
  const childPart = partByName.get(childSide.partName)!;
  const parentConnector = findConnector(parentPart, parentSide.connectorName);
  const childConnector = findConnector(childPart, childSide.connectorName);

  const parentFrame = await resolveConnectorFrame(parentPart.originalShape, parentConnector.origin);
  const childFrame = await resolveConnectorFrame(childPart.originalShape, childConnector.origin);
  const parentOrigin = parentFrame.origin as Se3Vec3;
  const childOrigin = childFrame.origin as Se3Vec3;

  // Build SE(3): parentWorldT
  //   ∘ T(parentOrigin)
  //   ∘ jointLocalT(mate type, pose, axis)
  //   ∘ T(-childOrigin)
  // Interpretation: shift parent's frame to its connector, apply the joint
  // motion at the connector, then shift back so the child's connector origin
  // lands on the parent's connector origin.
  const parentToConnector = Transform.translation(parentOrigin[0], parentOrigin[1], parentOrigin[2]);
  const childInverse = Transform.translation(-childOrigin[0], -childOrigin[1], -childOrigin[2]);
  const pose = resolveMatePose(edge.mate, arm, poses);
  const jointLocalT = jointTransformForMate(
    edge.mate.type, pose, parentConnector, parentFrame.axis as Se3Vec3 | undefined,
  );
  return parentT.compose(parentToConnector).compose(jointLocalT).compose(childInverse);
}

function findConnector(part: AssemblyPartStored, connectorName: string): Connector {
  const c = part.mateConnectors.find((x) => x.name === connectorName);
  if (!c) {
    throw new KernelError(
      'feature.invalid-args',
      `solveMates: connector '${connectorName}' not found on part '${part.name}'.`,
      part.id,
      `invalid-args.assembly.mate-connector-not-found — register the connector via partRef.connector('${connectorName}', ...) before solving.`,
    );
  }
  return c;
}

/** Resolve a connector's origin to a numeric Vec3. For vec3 origins this is
 *  a no-op; for topology origins it lowers the part shape. */
async function originVec3(part: AssemblyPartStored, origin: ConnectorOrigin): Promise<Se3Vec3> {
  const frame = await resolveConnectorFrame(part.originalShape, origin);
  return frame.origin as Se3Vec3;
}

/** Per-mate-type local SE(3) contribution at the connector frame, honoring
 *  the resolved pose. Math mirrors the v0.5 body-tree FK in
 *  `forwardKinematics.ts` for the equivalent joint kinds:
 *    - revolute     → rotation around parent connector axis by pose (deg)
 *    - prismatic    → translation along parent connector axis by pose (mm)
 *    - cylindrical  → v0.6 single-DOF surface: rotation around axis by
 *                     pose deg; secondary translation defaults to 0.
 *    - pin_slot     → v0.6 single-DOF surface: rotation around axis by
 *                     pose deg; in-plane translation defaults to 0.
 *    - ball         → extrinsic XYZ Euler from the pose triple
 *    - fastened     → identity (0 DOF)
 *    - planar       → identity (3 DOF in-plane translation not exposed via
 *                     a single scalar pose; covered when Pattern A grows a
 *                     multi-DOF pose surface).
 *  `parentConnector.axis` defaults to `+Z` when omitted — matches the
 *  `Connector` type doc. */
function jointTransformForMate(
  type: MateType,
  pose: number | [number, number, number] | undefined,
  parentConnector: Connector,
  resolvedAxis?: Se3Vec3,
): Transform {
  switch (type) {
    case 'fastened':
    case 'planar':
      return Transform.identity();
    case 'revolute': {
      const deg = (pose as number | undefined) ?? 0;
      const ax = connectorAxis(parentConnector, resolvedAxis);
      return Transform.rotationAxisAngleDeg(ax, deg);
    }
    case 'prismatic': {
      const stroke = (pose as number | undefined) ?? 0;
      const ax = connectorAxis(parentConnector, resolvedAxis);
      const len = Math.hypot(ax[0], ax[1], ax[2]) || 1;
      const dx = (ax[0] / len) * stroke;
      const dy = (ax[1] / len) * stroke;
      const dz = (ax[2] / len) * stroke;
      return Transform.translation(dx, dy, dz);
    }
    case 'cylindrical':
    case 'pin_slot': {
      // v0.6 single-DOF surface — both types take a scalar pose interpreted
      // as rotation degrees around the parent connector axis; the secondary
      // DOF (axial translation for cylindrical, perpendicular translation
      // for pin_slot) defaults to 0. A multi-DOF pose surface lands when
      // Pattern A grows beyond scalar/triple inputs.
      const deg = (pose as number | undefined) ?? 0;
      const ax = connectorAxis(parentConnector, resolvedAxis);
      return Transform.rotationAxisAngleDeg(ax, deg);
    }
    case 'ball': {
      const euler = (pose as [number, number, number] | undefined) ?? [0, 0, 0];
      return Transform.eulerXYZDeg(euler[0], euler[1], euler[2]);
    }
    default: {
      // Exhaustiveness guard: a future MateType added without a case lands here.
      const _exhaustive: never = type;
      throw new KernelError(
        'feature.invalid-args',
        `solveMates: unsupported mate type '${String(_exhaustive)}'.`,
        undefined,
        'invalid-args.assembly.mate-type-unsupported — add a case to solver.ts:jointTransformForMate.',
      );
    }
  }
}

/** The parent connector's rotation / translation axis with the documented
 *  `+Z` default when the connector omits one. */
function connectorAxis(parentConnector: Connector, resolvedAxis?: Se3Vec3): Se3Vec3 {
  return (resolvedAxis ?? parentConnector.axis ?? [0, 0, 1]) as Se3Vec3;
}
