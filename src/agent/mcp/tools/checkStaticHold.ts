// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/checkStaticHold.ts
//
// MCP tool: wraps the kc.kinematic.checkStaticHold facade. Computes the
// gravitational holding torque/force each actuated joint's downstream mass
// requires at a sampled pose grid, and compares against the joint's
// declared actuator capacity.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { checkStaticHold } from '../../../kinematic';
import type {
  KinematicDiagnostic,
  NumericPoses,
  StaticHoldJointResult,
  StaticHoldOpts,
} from '../../../kinematic/types';

export interface CheckStaticHoldInput extends EvaluateInput {
  /** Assembly name when the script defines more than one. */
  assembly?: string;
  /** Joint name to evaluate. Omit to evaluate every joint with a declared
   *  actuator. */
  joint?: string;
  /** Explicit pose(s) to check. Omit to sample a grid across the
   *  evaluated joint's declared range. */
  pose?: NumericPoses | ReadonlyArray<NumericPoses>;
  /** Gravity vector, m/s^2, world frame. Defaults to [0, 0, -9.81]. */
  gravity?: readonly [number, number, number];
  /** Safety-margin floor as a percent of actuator capacity. Defaults to 20. */
  min_torque_margin_pct?: number;
  /** Grid density per evaluated joint when `pose` is omitted. Defaults to 9. */
  range_samples?: number;
}

export type CheckStaticHoldOutput =
  | {
      ok: boolean;
      source: 'local';
      joints: ReadonlyArray<StaticHoldJointResult>;
      posesSampled: number;
      diagnostics: ReadonlyArray<KinematicDiagnostic>;
    }
  | { ok: false; source: 'local'; error: string; errorCode?: string };

/**
 * `check_static_hold` MCP tool (wired through `verify({ check: 'static-hold' })`).
 * Evaluates every revolute/prismatic joint with a declared `actuator`
 * (or the single `joint` named) across a sampled pose grid, reporting the
 * worst-pose gravitational holding requirement vs the declared actuator
 * capacity, plus structured margin diagnostics.
 */
export async function checkStaticHoldTool(
  input: CheckStaticHoldInput,
): Promise<CheckStaticHoldOutput> {
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
        ? `check_static_hold: assembly '${input.assembly}' not found.`
        : 'check_static_hold: no assembly captured by the script.',
      errorCode: 'feature.invalid-args',
    };
  }
  const opts: StaticHoldOpts = {
    joint: input.joint,
    pose: input.pose,
    gravity: input.gravity ? [...input.gravity] as [number, number, number] : undefined,
    minTorqueMarginPct: input.min_torque_margin_pct,
    rangeSamples: input.range_samples,
  };
  const result = await checkStaticHold(arm, opts);
  return {
    ok: result.ok,
    source: result.source,
    joints: result.joints,
    posesSampled: result.posesSampled,
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
