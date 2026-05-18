// src/agent/mcp/tools/addNurbsCurve.ts
//
// MCP tool wrapper for `add_nurbs_curve`. Inserts a `nurbsCurve(...)`
// binding into a .kcad.ts script, then re-evaluates the result so the
// caller sees capture-time validation failures inline.

import { addNurbsCurve } from '../edits/addNurbsCurve';
import type { AddNurbsCurveInput } from '../edits/addNurbsCurve';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { AddNurbsCurveInput };

export interface AddNurbsCurveOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function addNurbsCurveTool(input: AddNurbsCurveInput): Promise<AddNurbsCurveOutput> {
  const edit = addNurbsCurve(input);
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
