// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { shapeDraftEdit } from '../edits/shapeDraft';
import type { ShapeDraftInput } from '../edits/shapeDraft';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { ShapeDraftInput };

export interface ShapeDraftOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

/**
 * MCP tool wrapper for `add_surface kind:'draft'`.
 *
 * Inserts a `.draft(angleDeg, { face, neutralPlane?, pullDir? })` chain
 * statement to taper the selected face(s) for moldability. Re-evaluates
 * and returns capture-time diagnostics inline.
 */
export async function shapeDraftTool(input: ShapeDraftInput): Promise<ShapeDraftOutput> {
  const edit = shapeDraftEdit(input);
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
