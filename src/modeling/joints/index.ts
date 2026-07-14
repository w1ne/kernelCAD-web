// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/joints/index.ts
//
// Public re-export of the `joint.*` namespace for the kernelCAD modeling SDK.
// G1 slice ships `joint.clevis(...)` as the canonical revolute-joint
// constructive primitive; G2+ will add `joint.prismatic`, `joint.ball`, etc.

import type { KernelCadApi } from '../api';
import type { Assembly } from '../capture/assembly';
import { makeJointNamespace as makeClevisJointNamespace } from './clevis';
import {
  supportedServoRevolute,
  type SupportedServoRevoluteOptions,
  type SupportedServoRevoluteResult,
} from './supportedServoRevolute';
import {
  articulatedDigit,
  type ArticulatedDigitOptions,
  type ArticulatedDigitResult,
} from './articulatedDigit';
import type {
  ClevisJoint as ClevisJointResult,
  ClevisJointOptions as ClevisJointOpts,
} from './types';

export function makeJointNamespace(kc: KernelCadApi): {
  clevis(opts: ClevisJointOpts): ClevisJointResult;
  supportedServoRevolute(arm: Assembly, opts: SupportedServoRevoluteOptions): SupportedServoRevoluteResult;
  articulatedDigit(arm: Assembly, opts: ArticulatedDigitOptions): ArticulatedDigitResult;
} {
  return {
    ...makeClevisJointNamespace(kc),
    supportedServoRevolute(arm, opts): SupportedServoRevoluteResult {
      return supportedServoRevolute(kc, arm, opts);
    },
    articulatedDigit(arm, opts): ArticulatedDigitResult {
      return articulatedDigit(kc, arm, opts);
    },
  };
}

export type {
  AxisHint,
  ClevisConnectorSpec,
  ClevisJoint,
  ClevisJointOptions,
  ClevisEngineeringMaterials,
  ClevisStructuralModel,
  ClevisStyle,
  ResolvedClevisStyle,
  StructuralMaterial,
} from './types';
export type {
  SupportedServoRevoluteOptions,
  SupportedServoRevoluteResult,
} from './supportedServoRevolute';
export {
  MIN_STRUCTURAL_WEB_MM,
} from './articulatedDigit';
export type {
  ArticulatedDigitFitReport,
  ArticulatedDigitFitSpec,
  ArticulatedDigitFrame,
  ArticulatedDigitJointSpec,
  ArticulatedDigitOptions,
  ArticulatedDigitResult,
  ArticulatedDigitSegmentSpec,
} from './articulatedDigit';
