// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import { checkHoleFastenerCoverage, type HoleFastenerCoverageOptions, type HoleFastenerCoverageReport } from '../../../modeling/runtime/holeFastenerCoverage';
export interface CheckHoleFastenerCoverageInput extends EvaluateInput, HoleFastenerCoverageOptions {}
export type CheckHoleFastenerCoverageOutput = HoleFastenerCoverageReport | { ok: false; source: 'local'; error: string; errorCode?: string };
export async function checkHoleFastenerCoverageTool(input: CheckHoleFastenerCoverageInput): Promise<CheckHoleFastenerCoverageOutput> {
  try {
    const { evaluation, model } = await evaluateAndBuildScript(input);
    if (evaluation.exitCode !== 0 || !model) return { ok: false, source: 'local', error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.', errorCode: evaluation.diagnostics[0]?.code };
    return checkHoleFastenerCoverage(model, input);
  } catch (error) {
    return { ok: false, source: 'local', error: error instanceof Error ? error.message : String(error), errorCode: 'feature.invalid-args' };
  }
}
