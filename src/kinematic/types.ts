// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/types.ts
//
// Result envelopes and option shapes for the kc.kinematic.* facade.
// checkMountingHoleConsistency / checkSweptCollision / checkReachable /
// checkLoadCapacity / checkStaticHold and the `KinematicFacade` interface
// itself now live in `src/modeling/kinematic/facade.ts` (modeling may not
// import kinematic per the layering rule, so the interface the agent layer
// registers against has to live below kinematic, not in it) — re-exported
// below so this module's public shape is unchanged for every existing
// importer. sweepTolerance's types stay here: sweepTolerance itself moved to
// the agent layer (`src/agent/kinematic/sweepTolerance.ts`), one layer above
// this one, so its types have no layering reason to live in modeling.
//
// All checks run in-process. Every result carries source: 'local' as an
// explicit honesty signal — the field exists for forward-compat with any
// future hosted compute path and to let agents confirm the check was
// resolved in this process.

import type { Vec3 } from '../shared/intent/types';
import type { DiagnosticCode } from '../shared/diagnostics/registry';

export type {
  NumericPoses,
  KinematicDiagnostic,
  MountingHoleMismatch,
  MountingHoleSideState,
  MountingHoleResult,
  SweptCollisionOpts,
  SweptCollisionContact,
  SweptCollidingPose,
  SweptCollisionResult,
  ReachableTarget,
  ReachableOpts,
  ReachableResult,
  MaterialKind,
  MaterialDeclarationEntry,
  MaterialDeclaration,
  LoadEntry,
  LoadDeclaration,
  LoadCapacityOpts,
  LoadCapacityElementResult,
  LoadCapacityFailure,
  LoadCapacityResult,
  GravityVec3,
  StaticHoldOpts,
  StaticHoldJointResult,
  StaticHoldResult,
  KinematicFacade,
} from '../modeling/kinematic/facade';

// ===== sweepTolerance =====

/** One swept parameter: an explicit value list, or a {min,max,steps} range. */
export type SweepParamSpec =
  | { readonly values: ReadonlyArray<number | string> }
  | { readonly min: number; readonly max: number; readonly steps: number };

export type SweepParamsDeclaration = Readonly<Record<string, SweepParamSpec>>;

export interface SweepGateSpec {
  readonly interference?: boolean;
  readonly mountingHoles?: boolean;
  readonly jointAxis?: boolean;
  readonly reachable?: {
    readonly tipLink: string;
    readonly targetPosition: Vec3;
    readonly targetOrientation?: Vec3;
  };
}

export interface SweepComboResult {
  readonly combo: Readonly<Record<string, number | string>>;
  readonly gates: Readonly<Record<string, 'pass' | 'fail'>>;
  readonly diagnostics: ReadonlyArray<{
    readonly gate: string;
    readonly code: string;
    readonly severity: string;
    readonly message: string;
  }>;
}

export interface SweepToleranceResult {
  readonly ok: boolean;
  readonly combosEvaluated: number;
  readonly combosCapped: boolean;
  readonly results: ReadonlyArray<SweepComboResult>;
  /** First failing combo per gate name — the fast-scan payload an agent
   *  reads before the full envelope table. */
  readonly firstFailure: Readonly<Record<string, SweepComboResult | undefined>>;
  /** Sweep-level diagnostics (currently just the combo-cap warning). */
  readonly diagnostics: ReadonlyArray<{
    readonly code: DiagnosticCode;
    readonly severity: 'info' | 'warn' | 'error';
    readonly message: string;
  }>;
  readonly source: 'local';
}

