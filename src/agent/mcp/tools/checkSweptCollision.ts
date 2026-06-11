// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/checkSweptCollision.ts
//
// MCP tool: wraps the kc.kinematic.checkSweptCollision facade. Accepts a
// .kcad.ts source (either `file` or inline `code`) plus the sweep
// parameters; runs the script, locates the captured assembly, and
// dispatches the swept-collision check.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { checkSweptCollision } from '../../../kinematic';
import type {
  SweptCollidingPose,
  SweptCollisionOpts,
  KinematicDiagnostic,
} from '../../../kinematic/types';

export interface CheckSweptCollisionInput extends EvaluateInput {
  /** Assembly name when the script defines more than one. */
  assembly?: string;
  /** Joint name to sweep; omit to sweep every declared joint. */
  joint?: string;
  /** Inclusive [lower, upper, step] in joint-native units (deg or mm). */
  range?: [number, number, number];
  /** BREP boolean-intersection tolerance for pair contact (mm^3). */
  collision_tolerance_mm3?: number;
}

export type CheckSweptCollisionOutput =
  | {
      ok: boolean;
      source: 'local';
      posesSampled: number;
      collidingPoses: ReadonlyArray<SweptCollidingPose>;
      diagnostics: ReadonlyArray<KinematicDiagnostic>;
    }
  | { ok: false; source: 'local'; error: string; errorCode?: string };

/**
 * `check_swept_collision` MCP tool. Sweeps the declared joint range(s) and
 * reports every pose at which two parts share a non-empty BREP intersection.
 * Local in-process compute; no network round-trip.
 */
export async function checkSweptCollisionTool(
  input: CheckSweptCollisionInput,
): Promise<CheckSweptCollisionOutput> {
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
        ? `check_swept_collision: assembly '${input.assembly}' not found.`
        : 'check_swept_collision: no assembly captured by the script.',
      errorCode: 'feature.invalid-args',
    };
  }
  const opts: SweptCollisionOpts = {
    joint: input.joint,
    range: input.range,
    collisionToleranceMm3: input.collision_tolerance_mm3,
  };
  const result = await checkSweptCollision(arm, opts);
  return {
    ok: result.ok,
    source: result.source,
    posesSampled: result.posesSampled,
    collidingPoses: result.collidingPoses,
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
