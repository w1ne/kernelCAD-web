// src/mcp/tools/addFeature.ts
import { addFeature } from '../edits/addFeature';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export interface AddFeatureInput {
  code: string;
  feature_code: string;
}

export interface AddFeatureOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function addFeatureTool(input: AddFeatureInput): Promise<AddFeatureOutput> {
  const edit = addFeature(input.code, input.feature_code);
  if (!edit.ok || !edit.new_code) {
    return { ok: false, error: edit.error };
  }
  const evalResult = await evaluateScriptTool({ code: edit.new_code });
  return {
    ok: true,
    new_code: edit.new_code,
    diagnostics: evalResult.diagnostics,
  };
}
