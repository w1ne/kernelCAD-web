// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import { checkEdgeRadius, validateEdgeRadiusOptions, type EdgeRadiusOptions, type EdgeRadiusReport } from '../../../modeling/runtime/edgeRadius';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface CheckEdgeRadiusInput extends EvaluateInput, EdgeRadiusOptions {}
export type CheckEdgeRadiusOutput = EdgeRadiusReport | { ok: false; source: 'local'; error: string; errorCode?: string };

/** verify({ check: 'edge-radius' }): measured, general edge-break specification. */
export async function checkEdgeRadiusTool(input: CheckEdgeRadiusInput): Promise<CheckEdgeRadiusOutput> {
  try {
    validateEdgeRadiusOptions(input);
  } catch (error) {
    return { ok: false, source: 'local', error: error instanceof Error ? error.message : String(error), errorCode: 'feature.invalid-args' };
  }
  try {
    const { evaluation, model } = await evaluateAndBuildScript(input);
    if (evaluation.exitCode !== 0 || !model) return { ok: false, source: 'local', error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.', errorCode: evaluation.diagnostics[0]?.code };
    try {
      return checkEdgeRadius(model, input);
    } catch (error) {
      return { ok: false, source: 'local', error: error instanceof Error ? error.message : String(error), errorCode: 'feature.invalid-args' };
    }
  } catch (error) {
    const diagnostic = kernelErrorToDiagnostic(error);
    return { ok: false, source: 'local', error: diagnostic.message, errorCode: diagnostic.code };
  }
}
