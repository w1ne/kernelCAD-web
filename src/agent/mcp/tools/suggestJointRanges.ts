// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/suggestJointRanges.ts
//
// verify({ check: 'joint-range' }). Runs the script, finds the assembly,
// and returns suggested revolute/prismatic limits. The script is not edited.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { suggestJointRanges } from '../../../kinematic';
import type { SuggestJointRangesOpts, SuggestJointRangesResult } from '../../../kinematic/suggestJointRanges';

export interface SuggestJointRangesInput extends EvaluateInput {
  /** Assembly name when the script defines more than one. */
  assembly?: string;
  /** Revolute or prismatic joint. Omit to suggest every scalar joint. */
  joint?: string;
  /** Search window [min, max] in the joint's units. Overrides authored limits. */
  search?: [number, number];
  /** Stop clearance in mm. Default 0.3. */
  clearance_mm?: number;
  /** Coarse step in the joint's units. Default 5 degrees or 2 mm. */
  step?: number;
  /** Bisection tolerance in the joint's units. Default 0.1 degrees or 0.05 mm. */
  resolution?: number;
  /** Face-weighted exact-distance budget. Default 40,000. 0 skips measurement. */
  sweep_budget?: number;
}

/**
 * Suggest mate limits from geometry. Each revolute or prismatic joint is
 * swept alone from its authored pose. The result includes a limits snippet
 * for the caller to apply; this tool does not rewrite the script.
 */
export async function suggestJointRangesTool(
  input: SuggestJointRangesInput,
): Promise<SuggestJointRangesResult | { ok: false; source: 'local'; error: string; joints: [] }> {
  const { evaluation, model } = await evaluateAndBuildScript(input);
  if (evaluation.exitCode !== 0 || !model) {
    return {
      ok: false,
      source: 'local',
      error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.',
      joints: [],
    };
  }
  const arm = selectAssembly(model.session.assemblies as Map<string, Assembly>, input.assembly);
  if (!arm) {
    return {
      ok: false,
      source: 'local',
      error: input.assembly
        ? `joint-range: assembly '${input.assembly}' not found.`
        : 'joint-range: no assembly captured by the script.',
      joints: [],
    };
  }
  const opts: SuggestJointRangesOpts = {
    joint: input.joint,
    search: input.search,
    clearanceMm: input.clearance_mm,
    step: input.step,
    resolution: input.resolution,
    sweepBudget: input.sweep_budget,
  };
  return suggestJointRanges(arm, opts);
}

function selectAssembly(
  assemblies: Map<string, Assembly>,
  name: string | undefined,
): Assembly | undefined {
  if (name !== undefined) return assemblies.get(name);
  return assemblies.values().next().value;
}
