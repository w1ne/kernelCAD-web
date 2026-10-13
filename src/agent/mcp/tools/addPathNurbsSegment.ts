// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SceneSummary } from '../../script-runtime/sceneSummary';
// src/agent/mcp/tools/addPathNurbsSegment.ts
//
// MCP tool wrapper for `add_path_nurbs_segment`. Injects `.nurbsSegment([...])`
// into an existing PathBuilder chain, then re-evaluates so capture-time
// validation failures surface inline.

import { addPathNurbsSegment } from '../edits/addPathNurbsSegment';
import type { AddPathNurbsSegmentInput } from '../edits/addPathNurbsSegment';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { AddPathNurbsSegmentInput };

export interface AddPathNurbsSegmentOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  sceneSummary?: SceneSummary;
  error?: string;
}

export async function addPathNurbsSegmentTool(input: AddPathNurbsSegmentInput): Promise<AddPathNurbsSegmentOutput> {
  const edit = addPathNurbsSegment(input);
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
