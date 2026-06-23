// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { surfaceTrimEdit } from '../edits/surfaceTrim';
import type { SurfaceTrimInput } from '../edits/surfaceTrim';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { SurfaceTrimInput };

export interface SurfaceTrimOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

/**
 * MCP tool wrapper for `add_surface kind:'trim'` and `kind:'split'`.
 *
 * Inserts a `.trimTo(by)` or `.split(by)` chain statement, then re-evaluates
 * the modified script and returns capture-time diagnostics inline.
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
    diagnostics: evalResult.diagnostics,
  };
}
