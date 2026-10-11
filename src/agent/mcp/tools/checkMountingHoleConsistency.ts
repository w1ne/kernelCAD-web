// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/checkMountingHoleConsistency.ts
//
// MCP tool: wraps the kc.kinematic.checkMountingHoleConsistency facade.
// Walks every fastened mate in the assembly and flags hole pairs no screw
// can use and fastener holes at a contact face that are not coaxial.

import type { EvaluateInput } from '../../cli/commands/evaluate';
import { evaluateForReview } from '../../review/reviewPipeline';
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
       *  the diagnostics carry a kinematic.mounting-hole.no-coverage note. */
      checked: number;
      mismatches: ReadonlyArray<MountingHoleMismatch>;
      diagnostics: ReadonlyArray<KinematicDiagnostic>;
    }
  | { ok: false; source: 'local'; error: string; errorCode?: string };

/**
 * verify({ check: 'mounting-holes' }). Returns `ok: true` unless a fastened
 * mate's holes cannot take one screw or its contact-face holes are not
 * coaxial; `mismatches` names both parts / connectors and the reason.
 */
export async function checkMountingHoleConsistencyTool(
  input: CheckMountingHoleConsistencyInput,
): Promise<CheckMountingHoleConsistencyOutput> {
  // Evaluate like review_cad (validate gate 'warn'): an error-severity
  // finding such as a misaligned hole pattern must come back as a
  // structured mismatch, not as a thrown solvedModel evaluation failure.
  const { evaluation, model } = await evaluateForReview(input);
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
