// src/kinematic/checkSweptCollision.ts
//
// T2 stub. T3 replaces the body with the sampled-pose loop: enumerate
// poses, set forward kinematics per pose, run detectInterferences, fold
// collisions into result.collidingPoses and emit K1 / K2.

import type { Assembly } from '../modeling/capture/assembly';
import type {
  SweptCollisionOpts,
  SweptCollisionResult,
} from './types';

/**
 * Sweep the assembly across declared joint range(s) and report poses at
 * which any link-pair collides. T2 stub: returns the empty-success envelope
 * so dependent code (MCP tools, skill examples) compiles against the final
 * shape before T3 lands the real loop.
 */
export async function checkSweptCollision(
  arm: Assembly,
  opts?: SweptCollisionOpts,
): Promise<SweptCollisionResult> {
  // T3 fills in pose enumeration + per-pose FK + detectInterferences.
  void arm;
  void opts;
  return {
    ok: true,
    collidingPoses: [],
    posesSampled: 0,
    diagnostics: [],
    source: 'local',
  };
}
