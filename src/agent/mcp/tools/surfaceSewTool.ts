// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { surfaceSewEdit } from '../edits/surfaceSew';
import type { SurfaceSewInput } from '../edits/surfaceSew';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { SurfaceSewInput };

export interface SurfaceSewOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

/**
 * MCP tool wrapper for `add_surface kind:'sew'`.
 *
 * Inserts a `sew([s0, s1, ...], opts?)` statement into the script to stitch
 * surfaces into a closed solid. Re-evaluates and returns capture-time
 * diagnostics inline.
 */
export async function surfaceSewTool(input: SurfaceSewInput): Promise<SurfaceSewOutput> {
  const edit = surfaceSewEdit(input);
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
