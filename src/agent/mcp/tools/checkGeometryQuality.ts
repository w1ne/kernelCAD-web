// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript } from '../../../composition/scriptEvaluation';
import { checkGeometryQuality } from '../../../modeling/runtime/geometryQuality';
import { resolveGeometryQualityOptions, type GeometryQualityOptions, type GeometryQualityReport } from '../../../modeling/runtime/geometryQualityTypes';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface CheckGeometryQualityInput extends GeometryQualityOptions {
  file?: string;
  code?: string;
  feature_id?: string;
}
export type CheckGeometryQualityOutput = GeometryQualityReport | { ok: false; source: 'local'; error: string; errorCode?: string };

export async function checkGeometryQualityTool(input: CheckGeometryQualityInput): Promise<CheckGeometryQualityOutput> {
  try { resolveGeometryQualityOptions(input); }
  catch (error) { return { ok: false, source: 'local', error: String(error), errorCode: 'feature.invalid-args' }; }
  try {
    const { evaluation, model } = await evaluateAndBuildScript({ file: input.file, code: input.code });
    if (evaluation.exitCode !== 0 || !model) return { ok: false, source: 'local', error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.', errorCode: evaluation.diagnostics[0]?.code };
    const featureId = input.feature_id ?? model.rootId;
    const shape = featureId === undefined ? undefined : model.shapes.get(featureId);
    if (!shape || !featureId) return { ok: false, source: 'local', error: `Body feature '${featureId ?? '(return)'}' was not lowered.` };
    return checkGeometryQuality(shape, featureId, input);
  } catch (error) {
    const diagnostic = kernelErrorToDiagnostic(error);
    return { ok: false, source: 'local', error: diagnostic.message, errorCode: diagnostic.code };
  }
}
