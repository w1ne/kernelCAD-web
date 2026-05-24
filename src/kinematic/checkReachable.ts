// src/kinematic/checkReachable.ts
//
// Inverse-kinematics dispatcher. Routes between the closed-form analytical
// solver (when the chain matches the spherical-wrist condition AND the
// caller didn't force numeric) and the damped-least-squares numeric fallback.
// Closed-loop chains emit K9 `kinematic.solver.unsupported-config` per D4 —
// honest "v1 does not handle this" instead of a 50%-correct answer.
//
// Diagnostic emission:
//   - K3 `kinematic.unreachable`                       — target outside reachable workspace or solver gave up
//   - K4 `kinematic.reachability.iteration-cap-hit`    — numeric loop ran out of iterations before tolerance hit
//   - K9 `kinematic.solver.unsupported-config`         — closed-loop / parallel chain or other unsupported topology

import type { Assembly } from '../modeling/capture/assembly';
import {
  DIAGNOSTIC_REGISTRY,
  type DiagnosticCode,
} from '../shared/diagnostics/registry';
import { cycleDetector } from './cycleDetector';
import { solveAnalytical } from './inverseKinematicsAnalytical';
import { solveNumeric, type NumericIKResult } from './inverseKinematicsNumeric';
import type {
  KinematicDiagnostic,
  NumericPoses,
  ReachableOpts,
  ReachableResult,
} from './types';

const DEFAULT_MAX_ITERATIONS = 200;

/**
 * Resolve inverse kinematics for an end-effector target on a serial open
 * chain. Returns `ok: true` with the solved pose when the target is
 * reachable within tolerances; otherwise carries the structured diagnostic
 * envelope so the caller can choose between widening tolerances, lengthening
 * a link, or restructuring the chain.
 *
 * @see DIAGNOSTIC_REGISTRY['kinematic.unreachable']
 * @see DIAGNOSTIC_REGISTRY['kinematic.reachability.iteration-cap-hit']
 * @see DIAGNOSTIC_REGISTRY['kinematic.solver.unsupported-config']
 */
export async function checkReachable(
  arm: Assembly,
  opts: ReachableOpts,
): Promise<ReachableResult> {
  const diagnostics: KinematicDiagnostic[] = [];

  // 1. Closed-loop guard. K9 ships v1's honest "not yet" per D4.
  const cycle = cycleDetector(arm);
  if (cycle.hasCycle) {
    diagnostics.push(
      buildDiag(
        'kinematic.solver.unsupported-config',
        'error',
        `Inverse kinematics on closed-loop or parallel chains is not supported in v1 ` +
          `(cycle detected in the mate graph; involved joints: ${cycle.cycleNodes.join(', ')}). ` +
          `Cut the closed loop in the mate graph or restructure the mechanism into a serial tree.`,
      ),
    );
    return { ok: false, diagnostics, source: 'local' };
  }

  // 2. Tip-existence guard.
  const tipPart = arm.__parts().find((p) => p.name === opts.tipLink);
  if (!tipPart) {
    diagnostics.push(
      buildDiag(
        'kinematic.unreachable',
        'error',
        `Tip link '${opts.tipLink}' was not found among the assembly's parts; ` +
          `cannot resolve inverse kinematics against an unknown end-effector. ` +
          `Pass the name of a part declared with arm.part(name, shape).`,
      ),
    );
    return { ok: false, diagnostics, source: 'local' };
  }

  const target = opts.target;
  const preferSolver = opts.preferSolver ?? 'auto';
  const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  // 3. Closed-form analytical attempt (unless the caller forced numeric).
  if (preferSolver !== 'numeric') {
    const analytical = solveAnalytical(arm, opts.tipLink, target);
    if (analytical) {
      return {
        ok: true,
        diagnostics,
        source: 'local',
        pose: analytical.poses,
      };
    }
    if (preferSolver === 'analytical') {
      // Caller pinned analytical but the chain doesn't match; honest fail.
      diagnostics.push(
        buildDiag(
          'kinematic.solver.unsupported-config',
          'error',
          `Analytical IK was requested via preferSolver='analytical' but the chain ` +
            `does not satisfy the closed-form solvability condition (six revolute ` +
            `joints with the last three axes intersecting at the wrist center, in a ` +
            `Z-yaw / Y-pitch / Y-pitch base layout). Set preferSolver='auto' or ` +
            `'numeric' to use the DLS fallback.`,
        ),
      );
      return { ok: false, diagnostics, source: 'local' };
    }
  }

  // 4. DLS numeric fallback.
  const num: NumericIKResult = solveNumeric(
    arm,
    opts.tipLink,
    target,
    opts.seed ?? {},
    maxIterations,
  );
  if (num.converged) {
    return {
      ok: true,
      diagnostics,
      source: 'local',
      pose: num.poses,
    };
  }

  // 5. Did not converge — fire K3 (the target is unreachable within the
  //    requested tolerances) and K4 (numeric loop hit the iteration cap).
  diagnostics.push(
    buildUnreachableDiag(num.positionErrorMm, num.orientationErrorDeg, target.positionToleranceMm ?? 0.5),
  );
  if (num.iterations >= maxIterations) {
    diagnostics.push(buildIterationCapDiag(num.iterations, maxIterations));
  }
  return {
    ok: false,
    diagnostics,
    source: 'local',
    closestApproach: num.poses,
  };
}

function buildDiag(
  code: DiagnosticCode,
  severity: 'info' | 'warn' | 'error',
  message: string,
): KinematicDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    code,
    severity,
    message,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
    source: 'local',
  };
}

function buildUnreachableDiag(
  positionErrorMm: number,
  orientationErrorDeg: number,
  positionToleranceMm: number,
): KinematicDiagnostic {
  const code: DiagnosticCode = 'kinematic.unreachable';
  const entry = DIAGNOSTIC_REGISTRY[code];
  const axis: 'position' | 'orientation' | 'both' =
    positionErrorMm > positionToleranceMm && orientationErrorDeg > 0.5 ? 'both'
    : positionErrorMm > positionToleranceMm ? 'position'
    : 'orientation';
  return {
    code,
    severity: 'error',
    message:
      `Inverse kinematics could not satisfy the target within tolerance ` +
      `(best-effort positionError=${positionErrorMm.toFixed(2)} mm, ` +
      `orientationError=${orientationErrorDeg.toFixed(2)}°). ` +
      `Inspect result.closestApproach for the best-effort pose; ` +
      `lengthen a link, widen tolerances, or restructure the chain.`,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
    source: 'local',
    axis,
  };
}

function buildIterationCapDiag(
  iterations: number,
  maxIterations: number,
): KinematicDiagnostic {
  const code: DiagnosticCode = 'kinematic.reachability.iteration-cap-hit';
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    code,
    severity: 'warn',
    message:
      `Numeric IK ran for ${iterations} iterations and hit the cap of ${maxIterations} ` +
      `before reaching tolerance. The closestApproach pose is the best-error pose ` +
      `seen across the run; raise opts.maxIterations or widen target tolerances.`,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
    source: 'local',
  };
}

// Future-proofing — keep the NumericPoses re-export visible so importers can
// pull it from this module alongside the dispatcher (no functional behaviour).
export type { NumericPoses };
