// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/solveMates.ts
//
// v0.6 MCP tool — run the mate-graph solver on the active assembly and
// return per-part world transforms. Wraps `solveMates(arm, poses?)` (T6/T7) and
// serializes each `Transform` to a plain `{ translation, rotateAxis,
// rotateDeg }` object via the existing `decomposeToTranslateAndRotate()`.

import type { Assembly } from '../../../modeling/capture/assembly';
import { isKernelError } from '../../../shared/intent/kernelError';
import { solveMates, type SolveResult, type SolveStatus } from '../../../modeling/mates/solver';
import { getActiveMcpSession } from '../activeSession';

export interface SolveMatesInput {
  assembly?: string;
  /** Optional per-mate numeric pose overrides. */
  poses?: Record<string, number | [number, number, number]>;
}

export interface SerializedPose {
  translation: [number, number, number];
  rotateAxis: [number, number, number];
  rotateDeg: number;
}

/** Closed-loop report: loops (named after the mate that closes them),
 *  mobility per loop cluster (rank-based DOF, spatial Grübler count, driven
 *  DOF, joints that can be driven independently), every solved mate
 *  coordinate, and `kinematic.loop.*` findings. */
export interface SerializedLoopReport {
  loops: Array<{ name: string; joints: string[] }>;
  mobility: Array<{ loops: string[]; mobility: number; gruebler: number; drivenDof: number; independent: string[] }>;
  coordinates: Record<string, number | readonly [number, number, number]>;
  diagnostics: Array<{ code: string; severity: string; message: string; loop?: string; joint?: string }>;
}

export type SolveMatesOutput =
  | {
      ok: true;
      status: SolveStatus;
      poses: Record<string, SerializedPose>;
      iterations?: number;
      loop?: SerializedLoopReport;
    }
  | {
      ok: false;
      /** Present on a solver-result failure ('over-constrained' /
       *  'did-not-converge'); absent when we bailed before the solver ran
       *  (no session, no assembly, bad ref, thrown error). */
      status?: SolveStatus;
      /** Best-effort poses are still returned on a non-converging solve so
       *  the agent can diagnose which part landed where. */
      poses?: Record<string, SerializedPose>;
      iterations?: number;
      loop?: SerializedLoopReport;
      error: string;
      errorCode?: string;
      errorHint?: string;
    };

/** A solve is honest-successful only when the solver actually converged.
 *  'over-constrained' and 'did-not-converge' are FAILURES — returning them
 *  as ok:true is the silent-wrong path this gate closes. */
function isConverged(status: SolveStatus): boolean {
  return status === 'solved' || status === 'redundant-ok';
}

export async function solveMatesTool(input: SolveMatesInput): Promise<SolveMatesOutput> {
  const active = getActiveMcpSession();
  if (!active) {
    return {
      ok: false,
      error: 'No active kernelCAD session. Run evaluate_script successfully before calling solve_mates.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.session.no-active-session',
    };
  }
  const assemblies = active.session.assemblies;
  if (assemblies.size === 0) {
    return {
      ok: false,
      error: 'No assembly captured on the active session.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.assembly.no-assembly — run evaluate_script with a script that calls kcad.assembly(...).',
    };
  }
  const arm = (input.assembly !== undefined
    ? assemblies.get(input.assembly)
    : assemblies.values().next().value) as Assembly | undefined;
  if (!arm) {
    return {
      ok: false,
      error: `solve_mates: assembly '${input.assembly ?? '<default>'}' not found.`,
      errorCode: 'feature.invalid-args',
    };
  }
  try {
    const r = await solveMates(arm, input.poses);
    const serialized = serializePoses(r.poses);
    const loop = serializeLoop(r);
    if (!isConverged(r.status)) {
      // The solver did NOT converge. Report ok:false so the agent never
      // mistakes a wrong configuration for an assembled one — but still
      // carry status + best-effort poses/iterations for diagnosis.
      return withLoopFinding(notConvergedResult(r.status, serialized, r.iterations), loop);
    }
    return {
      ok: true,
      status: r.status,
      poses: serialized,
      ...(r.iterations !== undefined ? { iterations: r.iterations } : {}),
      ...(loop !== undefined ? { loop } : {}),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      errorCode: isKernelError(e) ? e.code : undefined,
      errorHint: isKernelError(e) ? e.hint : undefined,
    };
  }
}

/** Attach the loop report; a loop finding (lockup, over-driven, flip)
 *  replaces the generic not-converged error with the specific one. */
function withLoopFinding(
  failed: Extract<SolveMatesOutput, { ok: false }>,
  loop: SerializedLoopReport | undefined,
): Extract<SolveMatesOutput, { ok: false }> {
  if (loop === undefined) return failed;
  const finding = loop.diagnostics.find((d) => d.severity === 'error' || d.code === 'kinematic.loop.branch-flip');
  return {
    ...failed,
    loop,
    ...(finding !== undefined ? { error: `solve_mates: ${finding.message}`, errorCode: finding.code } : {}),
  };
}

function serializeLoop(r: SolveResult): SerializedLoopReport | undefined {
  if (r.loop === undefined) return undefined;
  return {
    loops: r.loop.loops.map((l) => ({ name: l.name, joints: [...l.joints] })),
    mobility: r.loop.mobility.map((m) => ({
      loops: [...m.loops], mobility: m.mobility, gruebler: m.gruebler, drivenDof: m.drivenDof, independent: [...m.independent],
    })),
    coordinates: { ...r.loop.coordinates },
    diagnostics: r.loop.diagnostics.map((d) => ({
      code: d.code, severity: d.severity, message: d.message,
      ...(d.loop !== undefined ? { loop: d.loop } : {}),
      ...(d.joint !== undefined ? { joint: d.joint } : {}),
    })),
  };
}

function serializePoses(poses: SolveResult['poses']): Record<string, SerializedPose> {
  const serialized: Record<string, SerializedPose> = {};
  for (const [partName, t] of poses) {
    const { translate, rotateAxis, rotateDeg } = t.decomposeToTranslateAndRotate();
    serialized[partName] = {
      translation: [translate[0], translate[1], translate[2]],
      rotateAxis: [rotateAxis[0], rotateAxis[1], rotateAxis[2]],
      rotateDeg,
    };
  }
  return serialized;
}

function notConvergedResult(
  status: SolveStatus,
  serialized: Record<string, SerializedPose>,
  iterations: number | undefined,
): Extract<SolveMatesOutput, { ok: false }> {
  const isOver = status === 'over-constrained';
  const errorCode = isOver
    ? 'assembly.mate.over-constrained'
    : 'assembly.solver.did-not-converge';
  const error = isOver
    ? 'solve_mates: assembly is over-constrained — at least one mate in a closed loop contradicts the others.'
    : `solve_mates: solver did not converge (status '${status}').`;
  const errorHint = isOver
    ? 'assembly.mate.over-constrained — remove or relax a mate in the closed loop, or adjust a connector origin so the geometry agrees.'
    : 'assembly.solver.did-not-converge — a closed loop does not close at these poses; see loop.diagnostics (kinematic.loop.lockup / mobility-mismatch name the loop, joint and pose).';
  return {
    ok: false,
    status,
    poses: serialized,
    ...(iterations !== undefined ? { iterations } : {}),
    error,
    errorCode,
    errorHint,
  };
}
