// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SceneSummary } from '../../script-runtime/sceneSummary';
import { surfaceTrimEdit } from '../edits/surfaceTrim';
import type { SurfaceTrimInput } from '../edits/surfaceTrim';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { SurfaceTrimInput };

export interface SurfaceTrimOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  sceneSummary?: SceneSummary;
  error?: string;
}

/**
 * MCP tool wrapper for `add_surface kind:'trim'`.
 *
 * Inserts a `.trimTo(by)` (op:'trim') or `.split(by)` (op:'split') chain
 * statement, then re-evaluates the modified script and returns capture-time
 * diagnostics inline. Both ops are selected via the `op` field, not `kind`.
 */
export async function surfaceTrimTool(input: SurfaceTrimInput): Promise<SurfaceTrimOutput> {
  const edit = surfaceTrimEdit(input);
  if (!edit.ok || !edit.new_code) {
    return { ok: false, error: edit.error };
  }
  const evalResult = await evaluateScriptTool({ code: edit.new_code });
  return {
    ok: true,
    new_code: edit.new_code,
    sceneSummary: evalResult.sceneSummary,
    diagnostics: evalResult.diagnostics,
  };
}
