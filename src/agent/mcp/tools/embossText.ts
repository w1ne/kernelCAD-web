// src/agent/mcp/tools/embossText.ts
//
// W3 MCP tool: AST-edit a `<shape>.embossText({...})` chained call into a
// kernelCAD script. Defers insertion to `addEmbossText`, then re-evaluates
// the modified script and returns diagnostics.

import { addEmbossText, type AddEmbossTextInput } from '../edits/embossText';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type EmbossTextInput = AddEmbossTextInput;

export interface EmbossTextOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function embossTextTool(input: EmbossTextInput): Promise<EmbossTextOutput> {
  const edit = addEmbossText(input);
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
