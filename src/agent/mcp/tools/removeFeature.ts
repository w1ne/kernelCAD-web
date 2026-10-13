// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SceneSummary } from '../../script-runtime/sceneSummary';
// src/mcp/tools/removeFeature.ts
import { removeFeature } from '../edits/removeFeature';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export interface RemoveFeatureInput {
  code: string;
  match: string;
}

export interface RemoveFeatureOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  sceneSummary?: SceneSummary;
  error?: string;
}

export async function removeFeatureTool(
  input: RemoveFeatureInput,
): Promise<RemoveFeatureOutput> {
  const edit = removeFeature(input.code, input.match);
  if (!edit.ok || !edit.new_code) {
    return { ok: false, error: edit.error };
  }
  const evalResult = await evaluateScriptTool({ code: edit.new_code });
  return {
    ok: evalResult.ok,
    new_code: edit.new_code,
    sceneSummary: evalResult.sceneSummary,
    diagnostics: evalResult.diagnostics,
  };
}
