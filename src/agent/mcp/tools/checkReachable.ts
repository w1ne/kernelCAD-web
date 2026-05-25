// src/agent/mcp/tools/checkReachable.ts
//
// MCP tool: wraps the kc.kinematic.checkReachable facade. Routes the IK
// dispatcher (analytical for spherical-wrist 6-DOF chains, numeric DLS
// otherwise) on a captured assembly's end-effector target.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { checkReachable } from '../../../kinematic';
import type {
  KinematicDiagnostic,
  NumericPoses,
  ReachableOpts,
} from '../../../kinematic/types';
import type { Vec3 } from '../../../shared/intent/types';

export interface CheckReachableInput extends EvaluateInput {
  /** Assembly name when the script defines more than one. */
  assembly?: string;
  /** End-effector part name. Required. */
  tip_link: string;
  /** Target position in world coordinates (mm). */
  target_position?: Vec3;
  /** Target orientation as Euler angles in radians (XYZ). Optional. */
  target_orientation?: Vec3;
  /** Position tolerance in mm. Optional; defaults to facade default. */
  position_tolerance_mm?: number;
  /** Orientation tolerance in radians. Optional. */
  orientation_tolerance_rad?: number;
  /** 'analytical' | 'numeric' | 'auto' (default). */
  prefer_solver?: 'analytical' | 'numeric' | 'auto';
  /** Numeric-path iteration cap. */
  max_iterations?: number;
  /** Optional warm-start pose for the numeric IK path. Units: degrees for
   *  revolute joints, millimetres for prismatic joints — same convention as
   *  `arm.solvedModel({poses})`. Pass `{}` or omit for no preference. The
   *  analytical solver ignores this. */
  seed?: NumericPoses;
}

export type CheckReachableOutput =
  | {
      ok: boolean;
      source: 'local';
      pose?: NumericPoses;
      closestApproach?: NumericPoses;
      diagnostics: ReadonlyArray<KinematicDiagnostic>;
    }
  | { ok: false; source: 'local'; error: string; errorCode?: string };

/**
 * `check_reachable` MCP tool. Returns `ok: true` with the solved joint
 * pose when the end-effector target is reachable within tolerance;
 * otherwise carries structured diagnostics (K3 unreachable, K4 iteration
 * cap, K5 unsupported config) so the caller can choose between widening
 * tolerances, lengthening a link, or restructuring the chain.
 */
export async function checkReachableTool(
  input: CheckReachableInput,
): Promise<CheckReachableOutput> {
  const { evaluation, model } = await evaluateAndBuildScript(input);
  if (evaluation.exitCode !== 0 || !model) {
    return {
      ok: false,
      source: 'local',
      error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.',
      errorCode: evaluation.diagnostics[0]?.code,
    };
  }
  const arm = selectAssembly(model.session.assemblies as Map<string, Assembly>, input.assembly);
  if (!arm) {
    return {
      ok: false,
      source: 'local',
      error: input.assembly
        ? `check_reachable: assembly '${input.assembly}' not found.`
        : 'check_reachable: no assembly captured by the script.',
      errorCode: 'feature.invalid-args',
    };
  }
  const opts: ReachableOpts = {
    tipLink: input.tip_link,
    target: {
      position: input.target_position,
      orientation: input.target_orientation,
      positionToleranceMm: input.position_tolerance_mm,
      orientationToleranceRad: input.orientation_tolerance_rad,
    },
    preferSolver: input.prefer_solver,
    maxIterations: input.max_iterations,
    seed: input.seed,
  };
  const result = await checkReachable(arm, opts);
  return {
    ok: result.ok,
    source: result.source,
    pose: result.pose,
    closestApproach: result.closestApproach,
    diagnostics: result.diagnostics,
  };
}

function selectAssembly(
  assemblies: Map<string, Assembly>,
  name: string | undefined,
): Assembly | undefined {
  if (name !== undefined) return assemblies.get(name);
  return assemblies.values().next().value;
}
