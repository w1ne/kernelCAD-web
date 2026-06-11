// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/addPathHermiteG2.ts
//
// MCP tool wrapper for `add_path_hermite_g2`. Injects `.hermiteG2(a, b)` into
// an existing PathBuilder chain, then re-evaluates so capture-time validation
// failures surface inline.

import { addPathHermiteG2 } from '../edits/addPathHermiteG2';
import type { AddPathHermiteG2Input } from '../edits/addPathHermiteG2';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { AddPathHermiteG2Input };

export interface AddPathHermiteG2Output {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function addPathHermiteG2Tool(input: AddPathHermiteG2Input): Promise<AddPathHermiteG2Output> {
  const edit = addPathHermiteG2(input);
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
