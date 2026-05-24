// src/kinematic/checkReachable.ts
//
// T2 stub. T4 wires analytical closed-form IK for serial 6-DOF
// spherical-wrist chains; T5 wires the DLS-Jacobian numeric fallback.
// Until then this entry returns `kinematic.solver.unsupported-config` so
// agents see a stable diagnostic instead of a stale empty-success.

import type { Assembly } from '../modeling/capture/assembly';
import {
  DIAGNOSTIC_REGISTRY,
  type DiagnosticCode,
} from '../shared/diagnostics/registry';
import type {
  KinematicDiagnostic,
  ReachableOpts,
  ReachableResult,
} from './types';

const UNSUPPORTED_CODE: DiagnosticCode = 'kinematic.solver.unsupported-config';

/**
 * Resolve inverse kinematics for a chain tip. T2 stub: returns the
 * unsupported-config diagnostic until T4/T5 wire the analytical + numeric
 * solvers.
 */
export async function checkReachable(
  arm: Assembly,
  opts: ReachableOpts,
): Promise<ReachableResult> {
  void arm;
  void opts;
  const spec = DIAGNOSTIC_REGISTRY[UNSUPPORTED_CODE];
  const diagnostics: KinematicDiagnostic[] = [
    {
      code: UNSUPPORTED_CODE,
      severity: 'error',
      message:
        'Inverse-kinematics solvers are not yet wired into this build of the kinematic-grounding layer; the analytical and numeric paths land in follow-up slices. Restructure the call site or wait for the solver task to ship.',
      hint: spec.hintTemplate,
      nextAction: spec.nextAction,
      source: 'local',
    },
  ];
  return {
    ok: false,
    diagnostics,
    source: 'local',
  };
}
