// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { checkAssemblyPathTool } from './checkAssemblyPath';
import { validateAssemblyTool } from './validateAssembly';
import { validateUrdfTool } from './validateUrdf';
import { dfmCheckTool } from './dfmCheck';
import { checkSweptCollisionTool } from './checkSweptCollision';
import { checkReachableTool } from './checkReachable';
import { checkMountingHoleConsistencyTool } from './checkMountingHoleConsistency';
import { checkLoadCapacityTool } from './checkLoadCapacity';
import { checkStaticHoldTool } from './checkStaticHold';
import { checkMotionLoadTool } from './checkMotionLoad';
import { checkBodyLikenessTool } from './checkBodyLikeness';
import { checkFastenerInstallationTool } from './checkFastenerInstallation';
import { checkGeometryQualityTool } from './checkGeometryQuality';
import { checkEdgeRadiusTool } from './checkEdgeRadius';

/** The verification kind. Each value maps 1:1 to a dedicated verifier. */
export type VerifyCheck =
  | 'assembly-path'
  | 'assembly'
  | 'urdf'
  | 'dfm'
  | 'swept-collision'
  | 'reachable'
  | 'mounting-holes'
  | 'load-capacity'
  | 'static-hold'
  | 'motion-load'
  | 'body-likeness'
  | 'fastener-installation'
  | 'geometry-quality'
  | 'edge-radius';

export interface VerifyInput {
  check: VerifyCheck;
  /**
   * Check-specific params, forwarded verbatim to the selected verifier:
   * - assembly/swept-collision/reachable/mounting-holes/load-capacity: { file?, code?, assembly?, ... }
   * - urdf: { urdf_path }
   * - dfm: { file?, code? }
   * Each verifier fails closed on its own missing required params.
   */
  [key: string]: unknown;
}

/**
 * Unified design-verification entrypoint. Replaces validate_assembly,
 * validate_urdf, dfm_check, check_swept_collision,
 * check_reachable, check_mounting_hole_consistency, check_load_capacity.
 *
 * Pure routing layer: dispatches on `check` and forwards all other params to
 * the underlying verifier unchanged. The verifiers' behavior is untouched.
 */
type Handler = (rest: Record<string, unknown>) => Promise<unknown>;
const call = <T extends (arg: never) => unknown>(fn: T): Handler => (rest) => Promise.resolve(fn(rest as never) as unknown);

const HANDLERS: Record<VerifyCheck, Handler> = {
  'geometry-quality': call(checkGeometryQualityTool),
  'assembly-path': call(checkAssemblyPathTool),
  assembly: call(validateAssemblyTool),
  urdf: call(validateUrdfTool),
  dfm: call(dfmCheckTool),
  'swept-collision': call(checkSweptCollisionTool),
  reachable: call(checkReachableTool),
  'mounting-holes': call(checkMountingHoleConsistencyTool),
  'load-capacity': call(checkLoadCapacityTool),
  'static-hold': call(checkStaticHoldTool),
  'motion-load': call(checkMotionLoadTool),
  'fastener-installation': call(checkFastenerInstallationTool),
  'edge-radius': call(checkEdgeRadiusTool),
  'body-likeness': call(checkBodyLikenessTool),
};

export function verifyTool(input: VerifyInput): Promise<unknown> {
  const { check, ...rest } = input;
  const handler = Object.prototype.hasOwnProperty.call(HANDLERS, check) ? HANDLERS[check] : undefined;
  if (handler !== undefined) return handler(rest);
  // Reject (not sync-throw) so the function honors its Promise return type
  // for every input — callers can rely on `.catch(...)`.
  return Promise.reject(
    new Error(
      `Unknown verify check: ${String(check)}. Valid: assembly, urdf, dfm, ` +
        `swept-collision, reachable, mounting-holes, load-capacity, static-hold, motion-load, body-likeness, fastener-installation, geometry-quality, assembly-path, edge-radius.`,
    ),
  );
}
