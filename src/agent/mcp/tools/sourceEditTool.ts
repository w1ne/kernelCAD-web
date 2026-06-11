// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { evaluateScriptTool } from './evaluateScript';

export interface SourceEditToolSuccess {
  ok: true;
  new_code: string;
  diagnostics: CompilerDiagnostic[];
  binding_name?: string;
}

export interface SourceEditToolFailure {
  ok: false;
  error?: string;
}

export type SourceEditToolOutput = SourceEditToolSuccess | SourceEditToolFailure;

export async function evaluateSourceEdit(
  edit: { ok: boolean; new_code?: string; error?: string; binding_name?: string },
): Promise<SourceEditToolOutput> {
  if (!edit.ok || !edit.new_code) {
    return { ok: false, error: edit.error };
  }
  const evalResult = await evaluateScriptTool({ code: edit.new_code });
  return {
    ok: true,
    new_code: edit.new_code,
    diagnostics: evalResult.diagnostics,
    ...(edit.binding_name !== undefined ? { binding_name: edit.binding_name } : {}),
  };
}
