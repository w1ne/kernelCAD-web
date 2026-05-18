// src/mcp/tools/setParamValue.ts
import { setParamValue } from '../edits/setParamValue';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { defineMCPTool } from '../defineMCPTool';

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

export const setParamValueMcpTool = defineMCPTool<SetParamValueInput>({
  name: 'set_param_value',
  description:
    'Edit a param() default value in a kernelCAD script. Returns the modified code as text plus diagnostics from re-evaluating the result. Caller persists the new code via standard file-write tools (this tool has no side effects).',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The .kcad.ts source code.' },
      param_name: { type: 'string', description: 'The string literal name of the param (first arg to param()).' },
      new_value: { description: 'The new default value — number for numeric params, string for expressions.' },
    },
    required: ['code', 'param_name', 'new_value'],
  },
  handler: setParamValueTool,
});
