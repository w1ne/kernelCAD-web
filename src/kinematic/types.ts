// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/types.ts
//
// T2 scaffolding for the kc.kinematic.* facade. Defines the per-entry
// result envelopes and option shapes; bodies for swept-collision /
// reachability / load-capacity land in T3/T4/T5/T6.
//
// All checks run in-process. Every result carries source: 'local' as an
// explicit honesty signal — the field exists for forward-compat with any
// future hosted compute path and to let agents confirm the check was
// resolved in this process.

import type { Vec3 } from '../shared/intent/types';
import type { NextAction } from '../shared/diagnostics/nextAction';
import type { DiagnosticCode } from '../shared/diagnostics/registry';

/**
 * Pose record — numeric joint values keyed by joint name (deg for revolute,
 * mm for prismatic). Mirrors the capture-time `NumericPoses` shape that
 * `forwardKinematics` consumes.
 */
export type NumericPoses = Readonly<Record<string, number>>;

/**
 * Diagnostic-record shape carried inside kc.kinematic.* result envelopes.
 *
 * Distinct from the `KernelError` exception class in
 * src/shared/intent/kernelError.ts — that class is a throwable; this is the
 * value shape returned in `result.diagnostics`. Substrate STUBs in
 * src/modeling/mates/ emit `ValidatorDiagnostic`; the kinematic wrappers
 * translate to this richer shape (carrying provenance and pose context).
 */
export interface KinematicDiagnostic {
  readonly code: DiagnosticCode;
  readonly severity: 'info' | 'warn' | 'error';
  readonly message: string;
  readonly hint: string;
  readonly nextAction: NextAction;
  /** Element name (partName / mateName / jointName) the diagnostic targets. */
  readonly element?: string;
  /** Axis discriminator on K3 kinematic.unreachable. */
  readonly axis?: 'position' | 'orientation' | 'both';
  /** Provenance — always 'local' for this layer. */
  readonly source: 'local';
  /** Pose at which the diagnostic fired (kinematic.collision.swept). */
  readonly poseContext?: NumericPoses;
}

/** Common envelope fields shared by every kc.kinematic.* result. */
interface KinematicResultBase {
  readonly ok: boolean;
  readonly diagnostics: ReadonlyArray<KinematicDiagnostic>;
  readonly source: 'local';
}

// ===== checkMountingHoleConsistency =====

export interface MountingHoleMismatch {
  readonly mateName: string;
  /** Per-side observed hole state (or 'unknown' when the side could not be
   *  inferred from the connector topology). */
  readonly sideA: MountingHoleSideState;
  readonly sideB: MountingHoleSideState;
  /** Short reason: 'diameter-mismatch' | 'no-hole-on-bound-face' |
   *  'deferred'. Detail in the linked diagnostic.message. */
  readonly reason: string;
}

export interface MountingHoleSideState {
  readonly partName: string;
  readonly connectorName: string;
  readonly boundFaceName?: string;
  readonly hole?: {
    readonly diameterMm: number;
    readonly depth: number | 'through';
  };
}

export interface MountingHoleResult extends KinematicResultBase {
  readonly mismatches: ReadonlyArray<MountingHoleMismatch>;
}

// ===== checkSweptCollision =====

export interface SweptCollisionOpts {
  /** Joint name to sweep. Omit to walk every declared joint. (v1 accepts
   *  string only; the type position is widened in a follow-up slice once
   *  the Query DSL ships — see workstream notes.) */
  readonly joint?: string;
  /** Inclusive [lo, hi, step] in joint-native units (deg or mm). */
  readonly range?: readonly [number, number, number];
  /** Explicit pose enumeration that overrides joint/range. */
  readonly samples?: ReadonlyArray<NumericPoses>;
  /** Interference tolerance in mm^3 (default 0.01). */
  readonly collisionToleranceMm3?: number;
  /** Pairs to skip during interference detection. */
  readonly ignored?: ReadonlySet<string>;
}

export interface SweptCollisionContact {
  readonly partA: string;
  readonly partB: string;
  readonly volumeMm3?: number;
}

export interface SweptCollidingPose {
  readonly pose: NumericPoses;
  readonly contacts: ReadonlyArray<SweptCollisionContact>;
}

export interface SweptCollisionResult extends KinematicResultBase {
  readonly collidingPoses: ReadonlyArray<SweptCollidingPose>;
  readonly posesSampled: number;
}

// ===== checkReachable =====

export interface ReachableTarget {
  readonly position?: Vec3;
  readonly orientation?: Vec3;
  readonly positionToleranceMm?: number;
  readonly orientationToleranceRad?: number;
}

export interface ReachableOpts {
  /** Tip link name. (v1 string only; widened in a follow-up.) */
  readonly tipLink: string;
  readonly target: ReachableTarget;
  readonly preferSolver?: 'analytical' | 'numeric' | 'auto';
  readonly maxIterations?: number;
  /** Optional warm-start pose for the numeric path. Units match
   *  `NumericPoses`: **degrees for revolute joints, millimetres for prismatic
   *  joints** — the same convention as `arm.solvedModel({poses})` and
   *  `arm.revolute({ limitsDeg })`. Authors porting code from URDF/MoveIt/ROS
   *  must convert radians → degrees before passing values here. The
   *  analytical solver ignores the seed and returns its own branch choice. */
  readonly seed?: NumericPoses;
}

export interface ReachableResult extends KinematicResultBase {
  /** Pose found (analytical or numeric) when ok=true. */
  readonly pose?: NumericPoses;
  /** Best-error pose seen when ok=false (numeric path). */
  readonly closestApproach?: NumericPoses;
}

// ===== checkLoadCapacity =====

/** Catalogued bulk material. Closed-form section properties are paired with
 *  the catalog at runtime; 'custom' lets the agent supply yield + modulus
 *  inline for materials not in the catalog. */
export type MaterialKind =
  | 'steel'
  | 'aluminum'
  | 'pla'
  | 'abs'
  | 'pet'
  | 'custom';

/** Per-loaded-part material declaration. `material: 'custom'` requires
 *  `yieldStressMPa` + `youngsModulusGPa` set; the catalog kinds default
 *  every field from MATERIAL_CATALOG. */
export interface MaterialDeclarationEntry {
  readonly material: MaterialKind;
  readonly yieldStressMPa?: number;
  readonly youngsModulusGPa?: number;
  readonly density?: number;
}

/** Map of partName → material declaration. */
export type MaterialDeclaration = Readonly<
  Record<string, MaterialDeclarationEntry>
>;

/** Per-loaded-part applied-load declaration. Force is in N (world frame
 *  applied at the part's free end), torque is in N·m. */
export interface LoadEntry {
  readonly force?: Vec3;
  readonly torque?: Vec3;
}

/** Map of partName → applied-load entry. */
export type LoadDeclaration = Readonly<Record<string, LoadEntry>>;

export interface LoadCapacityOpts {
  /** 'beam' (default) runs the closed-form Euler-Bernoulli path; 'stub'
   *  re-exports the v0.7.4 mate-side `maxLoad`-vs-`externalLoads` magnitude
   *  check. */
  readonly mode?: 'stub' | 'beam';
  readonly materials?: MaterialDeclaration;
  /** Safety-factor floor — beam check fails the part when computed
   *  yield/stress falls below this value. Defaults to 1.5. */
  readonly safetyFactorThreshold?: number;
}

/** Per-part beam-mode compute record. One row per part for which the
 *  closed-form path actually evaluated (parts that fell back via K7 are
 *  represented in `failures` / `diagnostics`, not here). */
export interface LoadCapacityElementResult {
  readonly partName: string;
  readonly stressPa: number;
  readonly yieldPa: number;
  readonly safetyFactor: number;
}

/** Failed-element record returned in `result.failures[]`. */
export interface LoadCapacityFailure {
  /** partName (beam mode) or mateName (stub mode). */
  readonly element: string;
  readonly elementKind: 'part' | 'mate';
  /** Pa (beam-mode stress-exceeds-yield); omitted for joint-load. */
  readonly stress?: number;
  /** Pa material yield; omitted for joint-load. */
  readonly yieldStress?: number;
  /** N or N·m applied; omitted when not meaningful. */
  readonly load?: number;
  /** N or N·m capacity (beam: yieldStress·I/c; joint: maxLoad). */
  readonly capacity?: number;
  readonly reason:
    | 'stress-exceeds-yield'
    | 'joint-load-exceeded'
    | 'beam-deflection-excessive';
}

export interface LoadCapacityResult extends KinematicResultBase {
  /** Worst-of safety factor across every successfully-computed part.
   *  Infinity when no part was loaded. */
  readonly safetyFactor: number;
  /** Every part the beam path actually evaluated. Failed parts are also
   *  surfaced in `failures[]` with structured fault codes. */
  readonly elements: ReadonlyArray<LoadCapacityElementResult>;
  /** Structured fault records — one per failed part / mate. */
  readonly failures: ReadonlyArray<LoadCapacityFailure>;
}

// ===== facade type — the kc.kinematic object surface =====

import type { Assembly } from '../modeling/capture/assembly';

export interface KinematicFacade {
  checkMountingHoleConsistency(arm: Assembly): Promise<MountingHoleResult>;
  checkSweptCollision(
    arm: Assembly,
    opts?: SweptCollisionOpts,
  ): Promise<SweptCollisionResult>;
  checkReachable(arm: Assembly, opts: ReachableOpts): Promise<ReachableResult>;
  checkLoadCapacity(
    arm: Assembly,
    loads?: LoadDeclaration,
    opts?: LoadCapacityOpts,
  ): Promise<LoadCapacityResult>;
}
