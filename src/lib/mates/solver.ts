// src/lib/mates/solver.ts
//
// v0.6 Task 6: tree-FK over the mate graph for all 7 mate types.
//
// `solveMates(arm)` walks the parts-by-mate graph and produces per-part world
// transforms in the assembly's root frame. Mates default to their zero-pose
// (0 deg / 0 mm / [0,0,0] Euler). Pose-driven articulation comes via the
// existing `solvedModel(poses)` path in T9.
//
// Tree topologies are solved exactly. Closed kinematic loops are detected and
// reported via SolveStatus 'did-not-converge' with iterations=0 — T7 replaces
// this path with a Newton-Raphson loop solver. This file is intentionally
// kept separate from `forwardKinematics.ts` (which walks the v0.5
// AssemblyJointStored body-tree and ships in 0.5.0); the two data models
// diverge enough that unifying upstream would touch shipped code.

import type { Assembly, AssemblyPartStored } from '../../capture/assembly';
import { KernelError } from '../../intent/kernelError';
import { Transform, type Vec3 as Se3Vec3 } from '../../runtime/se3';
import {
  resolveConnectorOrigin,
  type Connector,
  type ConnectorOrigin,
} from './connector';
import type { MateRecord } from './mate';
import { parseConnectorRef } from './mate';
import type { MateType } from './mateTypes';

export type SolveStatus =
  | 'solved'
  | 'under-constrained'
  | 'over-constrained'
  | 'redundant-ok'
  | 'did-not-converge';

export interface SolveResult {
  status: SolveStatus;
  /** part-name -> world-transform. Always populated on 'solved' /
   *  'redundant-ok'; best-effort on 'did-not-converge' (T7 will refine). */
  poses: Map<string, Transform>;
  /** Loop solver iteration count when relevant (0 on tree topologies). */
  iterations?: number;
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

export async function solveMates(arm: Assembly): Promise<SolveResult> {
  const parts = arm.__parts();
  const mates = arm.__mates();

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

  // 2. Cycle detection: undirected DFS — a back-edge that isn't the immediate
  //    parent mate marks a closed kinematic loop. T7 will replace this with a
  //    Newton-Raphson solve; for now we surface the placeholder status.
  if (hasCycle(parts, adjacency)) {
    return {
      status: 'did-not-converge',
      poses: new Map(),
      iterations: 0,
    };
  }

  // 3. Tree FK. BFS from the first declared part (treat it as the root); each
  //    visited neighbor composes its world transform from the parent.
  const partByName = new Map(parts.map((p) => [p.name, p]));
  const worldT = new Map<string, Transform>();
  const root = parts[0];
  worldT.set(root.name, Transform.identity());

  const queue: string[] = [root.name];
  const visited = new Set<string>([root.name]);

  while (queue.length > 0) {
    const parentName = queue.shift()!;
    const parentT = worldT.get(parentName)!;
    for (const edge of adjacency.get(parentName) ?? []) {
      if (visited.has(edge.neighbor)) continue;
      visited.add(edge.neighbor);
      const childT = await composeChildTransform(parentT, edge, partByName);
      worldT.set(edge.neighbor, childT);
      queue.push(edge.neighbor);
    }
  }

  // 4. Disconnected parts (no mate path to root) default to their identity
  //    placement so callers always see one transform per part. The mate
  //    validator (T5) does not yet require a fully connected graph.
  for (const p of parts) {
    if (!worldT.has(p.name)) worldT.set(p.name, Transform.identity());
  }

  return { status: 'solved', poses: worldT };
}

/** Undirected DFS — detects back-edges that don't trace through the same
 *  mate by which we entered the current node. */
function hasCycle(
  parts: readonly AssemblyPartStored[],
  adjacency: ReadonlyMap<string, MateEdge[]>,
): boolean {
  const visited = new Set<string>();
  for (const p of parts) {
    if (visited.has(p.name)) continue;
    const stack: Array<{ name: string; viaMate: string | null }> = [
      { name: p.name, viaMate: null },
    ];
    while (stack.length > 0) {
      const { name, viaMate } = stack.pop()!;
      if (visited.has(name)) return true;
      visited.add(name);
      for (const edge of adjacency.get(name) ?? []) {
        if (edge.mate.name === viaMate) continue; // came in this way; skip parent edge
        if (visited.has(edge.neighbor)) return true;
        stack.push({ name: edge.neighbor, viaMate: edge.mate.name });
      }
    }
  }
  return false;
}

/** Compose the child part's world transform from the parent's world
 *  transform and the mate's local SE(3) contribution. */
async function composeChildTransform(
  parentT: Transform,
  edge: MateEdge,
  partByName: ReadonlyMap<string, AssemblyPartStored>,
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

  const parentOrigin = await originVec3(parentPart, parentConnector.origin);
  const childOrigin = await originVec3(childPart, childConnector.origin);

  // Build SE(3): parentWorldT
  //   ∘ T(parentOrigin)
  //   ∘ jointLocalT(mate type, zero-pose)
  //   ∘ T(-childOrigin)
  // Interpretation: shift parent's frame to its connector, apply the joint
  // motion at the connector, then shift back so the child's connector origin
  // lands on the parent's connector origin.
  const parentToConnector = Transform.translation(parentOrigin[0], parentOrigin[1], parentOrigin[2]);
  const childInverse = Transform.translation(-childOrigin[0], -childOrigin[1], -childOrigin[2]);
  // `parentConnector` / `childConnector` are read for origin resolution only;
  // their axis / normal will matter once T9 wires pose-driven articulation
  // (rotate about axis, translate along axis, rotate about normal, etc.). At
  // zero-pose every per-type local SE(3) reduces to identity, so we don't
  // need the connector axis/normal fields yet.
  const jointLocalT = jointTransformForMate(edge.mate.type);
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
  const resolved = await resolveConnectorOrigin(part.originalShape, origin);
  return resolved.value as Se3Vec3;
}

/** Per-mate-type zero-pose local SE(3) contribution at the connector frame.
 *  Every mate type's zero-pose reduces to identity (fastened: 0 DOF; the
 *  others have free DOFs that default to 0 deg / 0 mm / [0,0,0] Euler).
 *  Pose-driven articulation lands in T9 via the existing
 *  `solvedModel(poses)` path. */
function jointTransformForMate(type: MateType): Transform {
  switch (type) {
    case 'fastened':
    case 'revolute':
    case 'prismatic':
    case 'cylindrical':
    case 'pin_slot':
    case 'planar':
    case 'ball':
      return Transform.identity();
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
