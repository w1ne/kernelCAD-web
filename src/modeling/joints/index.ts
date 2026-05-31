// src/modeling/joints/index.ts
//
// Public re-export of the `joint.*` namespace for the kernelCAD modeling SDK.
// G1 slice ships `joint.clevis(...)` as the canonical revolute-joint
// constructive primitive; G2+ will add `joint.prismatic`, `joint.ball`, etc.

export { makeJointNamespace } from './clevis';
export type {
  AxisHint,
  ClevisConnectorSpec,
  ClevisJoint,
  ClevisJointOptions,
  ClevisStyle,
  ResolvedClevisStyle,
} from './types';
