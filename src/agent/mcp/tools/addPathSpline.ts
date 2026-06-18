// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/addPathSpline.ts
//
// MCP tool wrapper for `add_path_spline`. Injects `.spline([...])` into an
// existing PathBuilder chain, then re-evaluates the result so the caller sees
// capture-time validation failures inline.

import { addPathSpline } from '../edits/addPathSpline';
import type { AddPathSplineInput } from '../edits/addPathSpline';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { AddPathSplineInput };

export interface AddPathSplineOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function addPathSplineTool(input: AddPathSplineInput): Promise<AddPathSplineOutput> {
  const edit = addPathSpline(input);
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
