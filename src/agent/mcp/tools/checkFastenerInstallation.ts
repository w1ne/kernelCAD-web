// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import { checkFastenerInstallation } from '../../../modeling/runtime/fastenerInstallation';
import type { FastenerInstallationOptions, FastenerInstallationReport } from '../../../modeling/runtime/fastenerInstallationTypes';
export interface CheckFastenerInstallationInput extends EvaluateInput, FastenerInstallationOptions {}
export type CheckFastenerInstallationOutput = FastenerInstallationReport | { ok: false; source: 'local'; error: string; errorCode?: string };
/** Explicit, measured installation stations on the script's lowered assembly. */
export async function checkFastenerInstallationTool(input: CheckFastenerInstallationInput): Promise<CheckFastenerInstallationOutput> {
  try {
    const { evaluation, model } = await evaluateAndBuildScript(input);
    if (evaluation.exitCode !== 0 || !model) return { ok: false, source: 'local', error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.', errorCode: evaluation.diagnostics[0]?.code };
    return checkFastenerInstallation(model, input);
  } catch (error) {
    return { ok: false, source: 'local', error: error instanceof Error ? error.message : String(error), errorCode: 'feature.invalid-args' };
  }
}
