// src/mcp/tools/solveMates.ts
//
// v0.6 MCP tool — run the mate-graph solver on the active assembly and
// return per-part world transforms. Wraps `solveMates(arm, poses?)` (T6/T7) and
// serializes each `Transform` to a plain `{ translation, rotateAxis,
// rotateDeg }` object via the existing `decomposeToTranslateAndRotate()`.

import type { Assembly } from '../../capture/assembly';
import { isKernelError } from '../../intent/kernelError';
import { solveMates, type SolveStatus } from '../../modeling/mates/solver';
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

export type SolveMatesOutput =
  | {
      ok: true;
      status: SolveStatus;
      poses: Record<string, SerializedPose>;
      iterations?: number;
    }
  | { ok: false; error: string; errorCode?: string; errorHint?: string };

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
    const serialized: Record<string, SerializedPose> = {};
    for (const [partName, t] of r.poses) {
      const { translate, rotateAxis, rotateDeg } = t.decomposeToTranslateAndRotate();
      serialized[partName] = {
        translation: [translate[0], translate[1], translate[2]],
        rotateAxis: [rotateAxis[0], rotateAxis[1], rotateAxis[2]],
        rotateDeg,
      };
    }
    return {
      ok: true,
      status: r.status,
      poses: serialized,
      ...(r.iterations !== undefined ? { iterations: r.iterations } : {}),
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
