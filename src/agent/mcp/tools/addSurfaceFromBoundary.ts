// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/addSurfaceFromBoundary.ts
//
// MCP tool wrapper for `add_surface_from_boundary`. Inserts a
// `surfaceFromBoundary([...], opts?)` binding into a .kcad.ts script, then
// re-evaluates the result so the caller sees capture-time validation failures
// (e.g. `feature.surface-from-boundary.corner-mismatch`) inline.

import { addSurfaceFromBoundary } from '../edits/addSurfaceFromBoundary';
import type { AddSurfaceFromBoundaryInput } from '../edits/addSurfaceFromBoundary';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { AddSurfaceFromBoundaryInput };

export interface AddSurfaceFromBoundaryOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function addSurfaceFromBoundaryTool(
  input: AddSurfaceFromBoundaryInput,
): Promise<AddSurfaceFromBoundaryOutput> {
  const edit = addSurfaceFromBoundary(input);
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
