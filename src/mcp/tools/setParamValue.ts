// src/mcp/tools/setParamValue.ts
import { setParamValue } from '../edits/setParamValue';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';

export interface SetParamValueInput {
  code: string;
  param_name: string;
  new_value: number | string;
}

export interface SetParamValueOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function setParamValueTool(
  input: SetParamValueInput,
): Promise<SetParamValueOutput> {
  const edit = setParamValue(input.code, input.param_name, input.new_value);
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
