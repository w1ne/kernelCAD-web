// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/checkMountingHoleConsistency.ts
//
// MCP tool: wraps the kc.kinematic.checkMountingHoleConsistency facade.
// Walks every fastened mate in the assembly and flags fastener-side hole
// diameter mismatches.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { checkMountingHoleConsistency } from '../../../kinematic';
import type {
  KinematicDiagnostic,
  MountingHoleMismatch,
} from '../../../kinematic/types';

export interface CheckMountingHoleConsistencyInput extends EvaluateInput {
  /** Assembly name when the script defines more than one. */
  assembly?: string;
}

export type CheckMountingHoleConsistencyOutput =
  | {
      ok: boolean;
      source: 'local';
      /** Fastened-mate interfaces actually examined. 0 => vacuous green;
       *  the diagnostics carry a kinematic.mounting-holes.no-coverage note. */
      checked: number;
      mismatches: ReadonlyArray<MountingHoleMismatch>;
      diagnostics: ReadonlyArray<KinematicDiagnostic>;
    }
  | { ok: false; source: 'local'; error: string; errorCode?: string };

/**
 * `check_mounting_hole_consistency` MCP tool. Returns `ok: true` when every
 * fastener-side mate's bound hole diameters agree; otherwise carries one
 * `kinematic.mounting-hole.diameter-mismatch` (K9) diagnostic per offending
 * mate.
 */
export async function checkMountingHoleConsistencyTool(
  input: CheckMountingHoleConsistencyInput,
): Promise<CheckMountingHoleConsistencyOutput> {
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
        ? `check_mounting_hole_consistency: assembly '${input.assembly}' not found.`
        : 'check_mounting_hole_consistency: no assembly captured by the script.',
      errorCode: 'feature.invalid-args',
    };
  }
  const result = await checkMountingHoleConsistency(arm);
  return {
    ok: result.ok,
    source: result.source,
    checked: result.checked,
    mismatches: result.mismatches,
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
