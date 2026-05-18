// src/agent/mcp/tools/addVariableSweep.ts
//
// MCP tool wrapper for `add_variable_sweep`. Inserts a `variableSweep(...)`
// binding into a .kcad.ts script, then re-evaluates the result so the
// caller sees capture-time validation failures inline.

import { addVariableSweep } from '../edits/addVariableSweep';
import type { AddVariableSweepInput } from '../edits/addVariableSweep';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { AddVariableSweepInput };

export interface AddVariableSweepOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function addVariableSweepTool(input: AddVariableSweepInput): Promise<AddVariableSweepOutput> {
  const edit = addVariableSweep(input);
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
