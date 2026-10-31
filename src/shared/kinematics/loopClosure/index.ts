// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/kinematics/loopClosure/index.ts
//
// Closed-loop kinematic solver: spanning tree + cut joints, damped least
// squares closure, continuation with branch-flip / lockup detection, and
// Grübler-vs-rank mobility. Pure and synchronous, so the capture-time mate
// solver, the joint-graph forward kinematics and the OCCT lowerer share it.

export { solveLoops } from './solveLoops';
export { forwardTree, jointLocal } from './kinematics';
export type {
  JointValue,
  LoopBranchState,
  LoopDiagnostic,
  LoopDiagnosticCode,
  LoopInfo,
  LoopJoint,
  LoopJointKind,
  LoopMobility,
  LoopModel,
  LoopPin,
  LoopSolveInput,
  LoopSolveResult,
  LoopSolveStatus,
} from './types';
