// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/checkPhysics.ts
//
// MCP tool: verify({ check: 'physics' }). Runs the full mechanism-truth
// probe with the physics criteria enabled: static equilibrium and
// drop-on-release, plus the kinematic disconnect / interference / DOF checks.
// This is the agent-facing "is the assembly actually functional?" gate.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import {
  checkMechanismTruth,
  type MechanismCoverage,
} from '../../../modeling/runtime/mechanismTruth';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export interface CheckPhysicsInput extends EvaluateInput {
  /** Assembly name when the script defines more than one. */
  assembly?: string;
  /** Set false to run only the kinematic criteria (no physics engine). Default true. */
  physics?: boolean;
}

export type CheckPhysicsOutput =
  | {
      ok: boolean;
      source: 'local';
      mechanism: 'real' | 'broken' | 'unverified';
      failures: readonly CompilerDiagnostic[];
      coverage?: MechanismCoverage;
    }
  | { ok: false; source: 'local'; error: string; errorCode?: string };

/**
 * `verify({ check: 'physics' })` — full mechanism truth with physics.
 *
 * `ok` is true only when every sampled pose passes the kinematic criteria
 * AND the physics static-equilibrium and drop-on-release criteria pass. A
 * budget-limited run returns `mechanism: 'unverified'` with `ok: false` so
 * an agent can retry with simpler geometry or a narrower pose scope.
 */
export async function checkPhysicsTool(input: CheckPhysicsInput): Promise<CheckPhysicsOutput> {
  const { evaluation, model } = await evaluateAndBuildScript(input);
  if (!model || model.session.assemblies.size === 0) {
    return {
      ok: false,
      source: 'local',
      error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.',
      errorCode: evaluation.diagnostics[0]?.code,
    };
  }
  const assemblies = model.session.assemblies as Map<string, Assembly>;
  const arm = input.assembly !== undefined ? assemblies.get(input.assembly) : assemblies.values().next().value;
  if (!arm) {
    return {
      ok: false,
      source: 'local',
      error: input.assembly
        ? `physics: assembly '${input.assembly}' not found.`
        : 'physics: no assembly captured by the script.',
      errorCode: 'feature.invalid-args',
    };
  }
  const verdict = await checkMechanismTruth(arm, { physicsCheck: input.physics !== false });
  return {
    ok: verdict.mechanism === 'real' && verdict.failures.length === 0,
    source: 'local',
    mechanism: verdict.mechanism,
    failures: verdict.failures,
    ...(verdict.coverage !== undefined ? { coverage: verdict.coverage } : {}),
  };
}
