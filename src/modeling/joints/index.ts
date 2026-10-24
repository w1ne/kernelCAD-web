// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/joints/index.ts
//
// Public re-export of the `joint.*` namespace for the kernelCAD modeling SDK.
// G1 slice ships `joint.clevis(...)` as the canonical revolute-joint
// constructive primitive; G2+ will add `joint.prismatic`, `joint.ball`, etc.

import type { KernelCadApi } from '../api';
import { makeJointNamespace as makeClevisJointNamespace } from './clevis';
import type {
  ClevisJoint as ClevisJointResult,
  ClevisJointOptions as ClevisJointOpts,
} from './types';

export function makeJointNamespace(kc: KernelCadApi): {
  clevis(opts: ClevisJointOpts): ClevisJointResult;
} {
  return {
    ...makeClevisJointNamespace(kc),
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
