// src/kinematic/index.ts
//
// Public `kc.kinematic` namespace surface. Four in-process checks for
// mechanism feasibility — hole-side consistency, sampled-pose collision,
// IK reachability, and beam-mode load capacity. All entries are sync
// compute wrapped in async; every result envelope carries source:'local'.

export { checkMountingHoleConsistency } from './checkMountingHoleConsistency';
export { checkSweptCollision } from './checkSweptCollision';
export { checkReachable } from './checkReachable';
export { checkLoadCapacity } from './checkLoadCapacity';

export type {
  KinematicDiagnostic,
  KinematicFacade,
  LoadCapacityElementResult,
  LoadCapacityOpts,
  LoadCapacityResult,
  LoadDeclaration,
  MaterialDeclaration,
  MountingHoleMismatch,
  MountingHoleResult,
  MountingHoleSideState,
  NumericPoses,
  ReachableOpts,
  ReachableResult,
  ReachableTarget,
  SweptCollidingPose,
  SweptCollisionContact,
  SweptCollisionOpts,
  SweptCollisionResult,
} from './types';
