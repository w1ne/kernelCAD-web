// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { evaluateScriptTool } from './evaluateScript';

/**
 * The edit was spliced and re-evaluated. `ok` reflects that evaluation, NOT
 * merely that the splice succeeded — a clean splice whose evaluation produced
 * an error-severity diagnostic returns `ok: false`. `new_code` + `diagnostics`
 * are always present so the agent can repair from a failed evaluation.
 */
export interface SourceEditToolEvaluated {
  ok: boolean;
  new_code: string;
  diagnostics: CompilerDiagnostic[];
  binding_name?: string;
}

/** The splice itself failed (e.g. no insertion point); evaluation never ran. */
export interface SourceEditToolFailure {
  ok: false;
  error?: string;
}

export type SourceEditToolOutput = SourceEditToolEvaluated | SourceEditToolFailure;

export async function evaluateSourceEdit(
  edit: { ok: boolean; new_code?: string; error?: string; binding_name?: string },
): Promise<SourceEditToolOutput> {
  if (!edit.ok || !edit.new_code) {
    return { ok: false, error: edit.error };
  }
  // Source edits are INCREMENTAL: a partly-built assembly legitimately has
  // an unmated part / interpenetrating blockout at an intermediate edit
  // step. Running the default T3 mechanism gate here would surface spurious
  // mechanism.* failures mid-build. The mechanism gate belongs on the
  // agent's terminal evaluate_script / review_cad call, not on every edit —
  // so skip it for the per-edit re-evaluation.
  const evalResult = await evaluateScriptTool({ code: edit.new_code, skipMechanismCheck: true });
  return {
    ok: evalResult.ok,
    new_code: edit.new_code,
    diagnostics: evalResult.diagnostics,
    ...(edit.binding_name !== undefined ? { binding_name: edit.binding_name } : {}),
  };
}
