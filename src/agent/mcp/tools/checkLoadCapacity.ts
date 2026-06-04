// src/agent/mcp/tools/checkLoadCapacity.ts
//
// MCP tool: wraps the kc.kinematic.checkLoadCapacity facade. Runs the
// closed-form Euler-Bernoulli beam path on cantilever-shaped parts and
// reports per-part stress / safety-factor records.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { checkLoadCapacity } from '../../../kinematic';
import type {
  KinematicDiagnostic,
  LoadCapacityElementResult,
  LoadCapacityFailure,
  LoadCapacityOpts,
  LoadDeclaration,
  MaterialDeclaration,
} from '../../../kinematic/types';

export interface CheckLoadCapacityInput extends EvaluateInput {
  /** Assembly name when the script defines more than one. */
  assembly?: string;
  /** Map of partName -> { force?, torque? } in N and N*m. */
  loads?: LoadDeclaration;
  /** Map of partName -> material declaration (steel | aluminum | pla |
   *  abs | pet | custom). 'custom' requires yieldStressMPa +
   *  youngsModulusGPa inline. */
  materials?: MaterialDeclaration;
  /** 'beam' (default) | 'stub'. */
  mode?: 'stub' | 'beam';
  /** Pass-fail floor on the computed safety factor; defaults to 1.5. */
  safety_factor_threshold?: number;
}

export type CheckLoadCapacityOutput =
  | {
      ok: boolean;
      source: 'local';
      safetyFactor: number;
      elements: ReadonlyArray<LoadCapacityElementResult>;
      failures: ReadonlyArray<LoadCapacityFailure>;
      diagnostics: ReadonlyArray<KinematicDiagnostic>;
    }
  | { ok: false; source: 'local'; error: string; errorCode?: string };

/**
 * `check_load_capacity` MCP tool. Runs the closed-form beam stress path on
 * every loaded part with a declared rectangular `crossSection`. Returns
 * per-part stress / yield / safety-factor records, plus structured
 * diagnostics (K6 stress exceeds yield, K7 beam not applicable, K8 no
 * material declared).
 */
export async function checkLoadCapacityTool(
  input: CheckLoadCapacityInput,
): Promise<CheckLoadCapacityOutput> {
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
        ? `check_load_capacity: assembly '${input.assembly}' not found.`
        : 'check_load_capacity: no assembly captured by the script.',
      errorCode: 'feature.invalid-args',
    };
  }
  const opts: LoadCapacityOpts = {
    mode: input.mode,
    materials: input.materials,
    safetyFactorThreshold: input.safety_factor_threshold,
  };
  const result = await checkLoadCapacity(arm, input.loads, opts);
  return {
    ok: result.ok,
    source: result.source,
    safetyFactor: result.safetyFactor,
    elements: result.elements,
    failures: result.failures,
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
