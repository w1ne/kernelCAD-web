// src/agent/mcp/tools/projectCurve.ts
//
// W3 MCP tool: AST-edit a `<shape>.projectCurve({...})` chained call into a
// kernelCAD script. Pair with `.extrude(...)` / `.cut(...)` edits for an
// engraved or raised logo on a curved face.

import { addProjectCurve, type AddProjectCurveInput } from '../edits/projectCurve';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export interface ProjectCurveInput extends AddProjectCurveInput {}

export interface ProjectCurveOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function projectCurveTool(input: ProjectCurveInput): Promise<ProjectCurveOutput> {
  const edit = addProjectCurve(input);
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
