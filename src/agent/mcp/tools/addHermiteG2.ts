// src/agent/mcp/tools/addHermiteG2.ts
//
// MCP tool wrapper for `add_hermite_g2`. Inserts a `hermiteG2(...)` binding
// into a .kcad.ts script, then re-evaluates the result so the caller sees
// capture-time validation failures (feature.hermite-g2.*) inline.

import { addHermiteG2 } from '../edits/addHermiteG2';
import type { AddHermiteG2Input } from '../edits/addHermiteG2';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { AddHermiteG2Input };

export interface AddHermiteG2Output {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function addHermiteG2Tool(input: AddHermiteG2Input): Promise<AddHermiteG2Output> {
  const edit = addHermiteG2(input);
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
