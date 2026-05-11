// src/lib/mates/solver.ts
//
// v0.6 Task 6: tree-FK over the mate graph for all 7 mate types.
// v0.6 Task 7: Newton-Raphson closed-loop solver for fastened-only loops.
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
// Tree topologies are solved exactly. Closed kinematic loops with fastened
// mates are evaluated via tree-FK + loop-closure residual check:
//
//   - residual < RESIDUAL_TOL          → 'redundant-ok' (loop is consistent)
//   - residual stalls above tol        → 'over-constrained' (geometry conflicts)
//   - iter-cap hit with residual high  → 'did-not-converge'
//
// For fastened-only loops the free-variable vector has length 0, so the
// classification is decided in one shot (no Newton iteration needed).
// Articulated closed loops (revolute / prismatic in a loop) will exercise
// the full Newton-Raphson path in T7.x once T9 wires pose-driven
// articulation. The N-R machinery (finite-diff Jacobian, least-squares
// step) lives in `../numeric/jacobian.ts` and is unit-tested there.
//
// This file is intentionally kept separate from `forwardKinematics.ts`
// (which walks the v0.5 AssemblyJointStored body-tree and ships in 0.5.0);
// the two data models diverge enough that unifying upstream would touch
// shipped code.

import type { Assembly, AssemblyPartStored } from '../../capture/assembly';
import type { NumericPoses } from '../../capture/forwardKinematics';
import { KernelError } from '../../intent/kernelError';
// Newton-Raphson machinery for articulated closed loops (T7.x): the
// finite-diff Jacobian + small-matrix linear solver from
// `../numeric/jacobian.ts` (unit-tested there). For the v0.6.0 fastened-
// only path we only need `norm2`; the rest get wired in here when T9
// lands pose-driven articulation and free DOFs make Newton iteration
// meaningful. Keeping these imports here makes the wiring point explicit
// and stops future readers from rebuilding helpers that already exist.
import { norm2 } from '../numeric/jacobian';
import { currentValue } from '../../runtime/editableHelpers';
import type { Editable } from '../../runtime/paramRef';
import { Transform, type Vec3 as Se3Vec3 } from '../../runtime/se3';
import {
  resolveConnectorOrigin,
  type Connector,
  type ConnectorOrigin,
} from './connector';
import type { MatePose, MateRecord } from './mate';
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
  /** Loop solver iteration count when relevant (0 on tree topologies and on
   *  fastened-only loops which classify without Newton iteration). */
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

/** Newton-Raphson knobs. Surfaced as module-level constants so future
 *  tweaks (T7.x articulated loops) stay in one place. */
const SOLVER = {
  /** Hard cap on Newton iterations for articulated closed loops. */
  ITER_CAP: 50,
  /** Convergence threshold on `||r||` (mm — connector world positions are
   *  in mm under the v0.6 unit convention). */
  RESIDUAL_TOL: 1e-6,
  /** Articulated path only: residual `>= RESIDUAL_TOL · OVER_CONSTRAINED_FACTOR`
   *  after Newton stalls flips status from 'did-not-converge' to
   *  'over-constrained'. For fastened-only loops the moment `||r||` exceeds
   *  `RESIDUAL_TOL` we already know mates are inconsistent — there's no DOF
   *  to adjust — so the factor isn't applied. */
  OVER_CONSTRAINED_FACTOR: 100,
} as const;

/**
 * Resolve a mate's articulation pose to its numeric joint-frame value.
 *
 * Pose-resolution chain (highest priority first):
 *   1. `numericOverrides[mate.name]` — caller-supplied numeric override
 *      (used by `Assembly.solvedModel(poses)` once the public pose surface
 *      lands; today's callers pass `undefined`).
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
  // 1. Numeric override (caller-supplied) wins.
  const override = numericOverrides?.[mate.name];
  if (override !== undefined) return override;
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

export async function solveMates(
  arm: Assembly,
  poses?: NumericPoses,
): Promise<SolveResult> {
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

  // 2. Build a spanning tree via BFS from the first declared part. Mates not
  //    in the tree become loop-closure constraints — passed to `loopSolve`.
  const partByName = new Map(parts.map((p) => [p.name, p]));
  const { worldT, loopMates } = await walkSpanningTree(parts, adjacency, partByName, arm, poses);

  if (loopMates.length === 0) {
    return { status: 'solved', poses: worldT };
  }

  // 3. Closed loops present — evaluate loop-closure residual. For v0.6.0 we
  //    only support fastened-only loops (every mate is fastened); articulated-
  //    loop Newton-Raphson lands in T7.x once T9 wires pose-driven articulation
  //    through the solver.
  return loopSolve(mates, partByName, loopMates, worldT);
}

interface SpanningTreeResult {
  worldT: Map<string, Transform>;
  /** Mates dropped from the spanning tree — these are the loop-closure
   *  constraints the loop solver must satisfy. */
  loopMates: MateRecord[];
}

/** BFS from `parts[0]`. Visited neighbors compose their world transform from
 *  the parent through the connecting mate. Mates that would connect already-
 *  visited parts are deferred to `loopMates`. Disconnected parts default to
 *  identity. */
async function walkSpanningTree(
  parts: readonly AssemblyPartStored[],
  adjacency: ReadonlyMap<string, MateEdge[]>,
  partByName: ReadonlyMap<string, AssemblyPartStored>,
  arm: Assembly,
  poses: NumericPoses | undefined,
): Promise<SpanningTreeResult> {
  const worldT = new Map<string, Transform>();
  const loopMates: MateRecord[] = [];
  const seenMate = new Set<string>();

  const root = parts[0];
  worldT.set(root.name, Transform.identity());

  const queue: string[] = [root.name];
  const visited = new Set<string>([root.name]);

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
      const childT = await composeChildTransform(parentT, edge, partByName, arm, poses);
      worldT.set(edge.neighbor, childT);
      queue.push(edge.neighbor);
    }
  }

  // Disconnected parts default to identity so callers always see one
  // transform per part. (T5 doesn't yet require a fully connected graph.)
  for (const p of parts) {
    if (!worldT.has(p.name)) worldT.set(p.name, Transform.identity());
  }

  return { worldT, loopMates };
}

/**
 * Loop solver — evaluates loop-closure residual and classifies the assembly.
 *
 * Residual definition (fastened-only loop):
 *   For each loop-closure mate `m`, compute world position of `m.a`'s
 *   connector origin via the tree-FK and the same for `m.b`'s connector.
 *   Concatenate `(A_world - B_world)` 3-vectors across all loop mates to
 *   form a single residual vector `r ∈ R^{3·K}` (K = # loop mates).
 *
 * Free variables (fastened-only): the spanning tree's fastened mates
 * remove all 6 DOFs per joint, so the per-mate pose vector is empty.
 * Classification is therefore immediate:
 *   - ||r|| < SOLVER.RESIDUAL_TOL → 'redundant-ok'  (loop is consistent)
 *   - otherwise                   → 'over-constrained'
 *
 * (`SOLVER.OVER_CONSTRAINED_FACTOR` is only meaningful on the articulated
 * path, where it distinguishes 'Newton-Raphson stalled with a small
 * residual' from 'stalled with a large residual'. For fastened-only loops
 * the moment `||r||` exceeds `RESIDUAL_TOL` we know mates conflict — no
 * DOF exists to adjust — so we err on the side of surfacing
 * over-constrained immediately.)
 *
 * Articulated loops (revolute / prismatic / etc.) introduce free DOFs into
 * `x` and exercise the Newton-Raphson loop below. That path lands in T7.x
 * once T9 wires pose-driven articulation; today it returns
 * 'did-not-converge' for any non-fastened mate appearing in a loop or its
 * spanning tree, with a clear `iterations` count.
 */
async function loopSolve(
  allMates: readonly MateRecord[],
  partByName: ReadonlyMap<string, AssemblyPartStored>,
  loopMates: readonly MateRecord[],
  initialPoses: Map<string, Transform>,
): Promise<SolveResult> {
  // For v0.6.0 we only support fastened-only loops. If any mate (tree or
  // loop) on a closed-loop assembly is non-fastened, that's the articulated
  // path — return 'did-not-converge' with iterations=0 and let T7.x handle
  // it once T9 wires pose-driven articulation through the solver.
  const hasNonFastened = allMates.some((m) => m.type !== 'fastened');
  if (hasNonFastened) {
    return {
      status: 'did-not-converge',
      poses: initialPoses,
      iterations: 0,
    };
  }

  // Fastened-only loop: with zero free DOFs, the residual is independent of
  // any pose vector `x` and Newton-Raphson collapses to a single evaluation.
  // The N-R helpers from `../numeric/jacobian.ts` are imported and unit-
  // tested there; they get wired in here in T7.x for the articulated path.
  const residual = await computeLoopResidual(loopMates, partByName, initialPoses);
  const rNorm = norm2(residual);

  if (rNorm < SOLVER.RESIDUAL_TOL) {
    return {
      status: 'redundant-ok',
      poses: initialPoses,
      iterations: 0,
    };
  }

  // Disagreement: classify as over-constrained. There's no free DOF to
  // adjust, so Newton can't reduce the residual. (See `SOLVER.OVER_*` JSDoc
  // above for why we don't apply the factor on the fastened-only path.)
  return {
    status: 'over-constrained',
    poses: initialPoses,
    iterations: 0,
  };
}

// Newton-Raphson machinery (T7.x, articulated loops). For reference the
// inner loop will look like:
//
//   for (let i = 0; i < SOLVER.ITER_CAP; i++) {
//     const r = residualFn(x);
//     if (norm2(r) < SOLVER.RESIDUAL_TOL) return { ...converged };
//     const J = finiteDiffJacobian(residualFn, x);
//     const dx = solveLeastSquares(J, r);
//     x = sub(x, dx);
//   }
//   return { status: 'did-not-converge', iterations: SOLVER.ITER_CAP, ... };
//
// `finiteDiffJacobian`, `solveLeastSquares`, `sub` (from
// `../numeric/jacobian.ts`) are imported in their unit-test file today and
// re-imported here in T7.x when the free-DOF vector materializes.

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

  const parentOrigin = await originVec3(parentPart, parentConnector.origin);
  const childOrigin = await originVec3(childPart, childConnector.origin);

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
  const jointLocalT = jointTransformForMate(edge.mate.type, pose, parentConnector);
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
): Transform {
  switch (type) {
    case 'fastened':
    case 'planar':
      return Transform.identity();
    case 'revolute': {
      const deg = (pose as number | undefined) ?? 0;
      const ax = (parentConnector.axis ?? [0, 0, 1]) as Se3Vec3;
      return Transform.rotationAxisAngleDeg(ax, deg);
    }
    case 'prismatic': {
      const stroke = (pose as number | undefined) ?? 0;
      const ax = (parentConnector.axis ?? [0, 0, 1]) as Se3Vec3;
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
      const ax = (parentConnector.axis ?? [0, 0, 1]) as Se3Vec3;
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
