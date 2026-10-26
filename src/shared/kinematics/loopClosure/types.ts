// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/kinematics/loopClosure/types.ts
//
// Data model for the closed-loop kinematic solver. Pure data: callers (the
// mate solver, the joint-graph forward kinematics, the OCCT lowerer) build a
// `LoopModel` from their own graph and hand it to `solveLoops`.
//
// Units on the public surface match the rest of kernelCAD: revolute-like
// coordinates in degrees, prismatic in millimetres, ball as an extrinsic XYZ
// Euler triple in degrees.

import type { Transform, Vec3 } from '../../runtime/se3';

/** Joint kinds the loop solver understands. `cylindrical` and `pin_slot`
 *  carry one rotation coordinate, the same single-DOF reading the mate
 *  solver's forward kinematics gives them. */
export type LoopJointKind =
  | 'revolute'
  | 'prismatic'
  | 'cylindrical'
  | 'pin_slot'
  | 'ball'
  | 'fixed'
  | 'planar';

/** A joint coordinate: scalar (deg or mm) or an XYZ Euler triple (deg). */
export type JointValue = number | readonly [number, number, number];

/** One joint of the graph. `a`/`b` are body names; origins are in each
 *  body's own frame (mm); `axis` is in body `a`'s frame. At coordinate `q`
 *  the joint places `b` relative to `a` as
 *  `T(aOrigin) ∘ motion(kind, q, axis) ∘ T(-bOrigin)`. */
export interface LoopJoint {
  readonly name: string;
  readonly kind: LoopJointKind;
  readonly a: string;
  readonly b: string;
  readonly aOrigin: Vec3;
  readonly bOrigin: Vec3;
  readonly axis: Vec3;
  /** Body whose side defines the sign of this joint's elbow (see
   *  `loopMode`). Defaults to `a`. Lets a caller that walks a joint from its
   *  second side keep the pin convention of the authored joint. */
  readonly signBody?: string;
  /** Axis (in `signBody`'s frame) the elbow sign is measured about. */
  readonly signAxis?: Vec3;
}

/** A graph ready for solving: roots with their resting placement, the
 *  spanning tree in walk order (every edge's `a` is already placed when the
 *  edge is reached) and the joints the tree left out (one per independent
 *  loop). */
export interface LoopModel {
  readonly roots: ReadonlyArray<{ readonly body: string; readonly placement: Transform }>;
  readonly tree: readonly LoopJoint[];
  readonly cuts: readonly LoopJoint[];
}

/** Optional branch pin: hold the elbow at `joint` on one side of straight. */
export interface LoopPin {
  readonly loop: string;
  readonly joint: string;
  readonly sign: '+' | '-';
}

export type LoopDiagnosticCode =
  | 'kinematic.loop.branch-flip'
  | 'kinematic.loop.lockup'
  | 'kinematic.loop.mobility-mismatch'
  | 'kinematic.loop.branch-ambiguous';

export interface LoopDiagnostic {
  readonly code: LoopDiagnosticCode;
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  /** Loop name (the joint where the loop is cut). */
  readonly loop?: string;
  /** Joint the finding is about. */
  readonly joint?: string;
  /** Driven coordinates at the pose the finding happened. */
  readonly pose?: Readonly<Record<string, JointValue>>;
}

/** One independent loop: named after the joint where the spanning tree cuts
 *  it, with every joint on it in cycle order (cut joint first). */
export interface LoopInfo {
  readonly name: string;
  readonly cutJoint: string;
  readonly joints: readonly string[];
}

/** Mobility of one cluster of loops that share joints. */
export interface LoopMobility {
  readonly loops: readonly string[];
  /** Tree coordinates on the cluster's loops (driven ones included). */
  readonly coordinates: number;
  /** Rank of the closure Jacobian over those coordinates at the solved pose. */
  readonly rank: number;
  /** Degrees of freedom of the closed cluster: coordinates − rank. */
  readonly mobility: number;
  /** Spatial Grübler–Kutzbach count 6(n−1) − Σ(6 − f). Lower than
   *  `mobility` when the geometry is special (planar, parallel axes). */
  readonly gruebler: number;
  /** `mobility − gruebler`: constraints that are redundant for this geometry. */
  readonly redundantConstraints: number;
  /** Driven coordinates on the cluster's loops. */
  readonly drivenDof: number;
  /** A set of `mobility` tree joints that can be driven independently
   *  (the earliest declared ones the closure Jacobian allows). */
  readonly independent: readonly string[];
}

/** Opaque continuation state handed from one solve to the next. */
export interface LoopBranchState {
  /** Orthonormal basis of the dependent-coordinate Jacobian's column space
   *  at the previous solution, or undefined when it was rank deficient. */
  readonly basis: ReadonlyArray<Float64Array> | undefined;
  /** Elbow signs at the previous solution. */
  readonly elbows: Readonly<Record<string, -1 | 0 | 1>>;
}

export type LoopSolveStatus = 'solved' | 'lockup' | 'branch-flip' | 'over-driven';

export interface LoopSolveInput {
  readonly model: LoopModel;
  /** Target values of the driven coordinates. */
  readonly driven: Readonly<Record<string, JointValue>>;
  /** Starting coordinates for every tree joint (the as-built pose or the
   *  previous solved pose). Driven joints march from their seed value to
   *  their target so the solve stays on the seed's branch. */
  readonly seed: Readonly<Record<string, JointValue>>;
  readonly pins?: readonly LoopPin[];
  /** Branch state from the previous solve along a sweep. */
  readonly previous?: LoopBranchState;
  /** Closure tolerance on joint-origin gaps (mm). Default 1e-6 mm. */
  readonly lengthToleranceMm?: number;
}

export interface LoopSolveResult {
  readonly status: LoopSolveStatus;
  /** World transform of every body at the returned configuration (the
   *  target on success; the last good pose on lockup / flip). */
  readonly transforms: Map<string, Transform>;
  /** Every tree coordinate plus the measured scalar coordinate of each cut
   *  joint, at the returned configuration. */
  readonly coordinates: Record<string, JointValue>;
  /** Driven values at the returned configuration. */
  readonly reachedDriven: Record<string, JointValue>;
  readonly loops: readonly LoopInfo[];
  readonly mobility: readonly LoopMobility[];
  readonly diagnostics: readonly LoopDiagnostic[];
  /** Elbow sign of every revolute-like loop joint at the returned pose. */
  readonly elbows: Readonly<Record<string, -1 | 0 | 1>>;
  readonly state: LoopBranchState;
  /** Largest joint-origin gap (mm) and axis misalignment (rad) left. */
  readonly residualMm: number;
  readonly residualRad: number;
  readonly iterations: number;
}
