import { validateAssemblyTool } from './validateAssembly';
import { validateUrdfTool } from './validateUrdf';
import { dfmCheckTool } from './dfmCheck';
import { dfmPreflightTool } from './dfmPreflight';
import { checkSweptCollisionTool } from './checkSweptCollision';
import { checkReachableTool } from './checkReachable';
import { checkMountingHoleConsistencyTool } from './checkMountingHoleConsistency';
import { checkLoadCapacityTool } from './checkLoadCapacity';

/** The verification kind. Each value maps 1:1 to a dedicated verifier. */
export type VerifyCheck =
  | 'assembly'
  | 'urdf'
  | 'dfm'
  | 'dfm-preflight'
  | 'swept-collision'
  | 'reachable'
  | 'mounting-holes'
  | 'load-capacity';

export interface VerifyInput {
  check: VerifyCheck;
  /**
   * Check-specific params, forwarded verbatim to the selected verifier:
   * - assembly/swept-collision/reachable/mounting-holes/load-capacity: { file?, code?, assembly?, ... }
   * - urdf: { urdf_path }
   * - dfm: { file?, code? }
   * - dfm-preflight: { vendor, material, thicknessIn|thicknessMm, ... }
   * Each verifier fails closed on its own missing required params.
   */
  [key: string]: unknown;
}

/**
 * Unified design-verification entrypoint. Replaces validate_assembly,
 * validate_urdf, dfm_check, dfm_preflight, check_swept_collision,
 * check_reachable, check_mounting_hole_consistency, check_load_capacity.
 *
 * Pure routing layer: dispatches on `check` and forwards all other params to
 * the underlying verifier unchanged. The verifiers' behavior is untouched.
 */
export function verifyTool(input: VerifyInput): Promise<unknown> {
  const { check, ...rest } = input;
  switch (check) {
    case 'assembly':
      return validateAssemblyTool(rest as unknown as Parameters<typeof validateAssemblyTool>[0]);
    case 'urdf':
      return validateUrdfTool(rest as unknown as Parameters<typeof validateUrdfTool>[0]);
    case 'dfm':
      return dfmCheckTool(rest as Parameters<typeof dfmCheckTool>[0]);
    case 'dfm-preflight':
      return dfmPreflightTool(
        rest as unknown as Parameters<typeof dfmPreflightTool>[0],
      ) as Promise<unknown>;
    case 'swept-collision':
      return checkSweptCollisionTool(rest as Parameters<typeof checkSweptCollisionTool>[0]);
    case 'reachable':
      return checkReachableTool(rest as unknown as Parameters<typeof checkReachableTool>[0]);
    case 'mounting-holes':
      return checkMountingHoleConsistencyTool(
        rest as Parameters<typeof checkMountingHoleConsistencyTool>[0],
      );
    case 'load-capacity':
      return checkLoadCapacityTool(rest as Parameters<typeof checkLoadCapacityTool>[0]);
    default:
      // Reject (not sync-throw) so the function honors its Promise return type
      // for every input — callers can rely on `.catch(...)`.
      return Promise.reject(
        new Error(
          `Unknown verify check: ${String(check)}. Valid: assembly, urdf, dfm, ` +
            `dfm-preflight, swept-collision, reachable, mounting-holes, load-capacity.`,
        ),
      );
  }
}
