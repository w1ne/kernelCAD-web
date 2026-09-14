// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/setParamValue.ts
import { setParamValue } from '../edits/setParamValue';
import { evaluateScriptTool } from './evaluateScript';
import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { isKernelError } from '../../../shared/intent/kernelError';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export interface SetParamValueInput {
  code: string;
  param_name: string;
  new_value: number | string | boolean;
}

export interface SetParamValueOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function setParamValueTool(
  input: SetParamValueInput,
): Promise<SetParamValueOutput> {
  const typeError = await validateNewValueAgainstDeclaredType(input.code, input.param_name, input.new_value);
  if (typeError !== undefined) {
    return { ok: false, error: typeError };
  }

  const edit = setParamValue(input.code, input.param_name, input.new_value);
  if (!edit.ok || !edit.new_code) {
    return { ok: false, error: edit.error };
  }

  const evalResult = await evaluateScriptTool({ code: edit.new_code });

  return {
    ok: evalResult.ok,
    new_code: edit.new_code,
    diagnostics: evalResult.diagnostics,
  };
}

/**
 * Reject a `new_value` that doesn't match the param's DECLARED kind (type,
 * `choices` membership, `maxLength`) before any source rewrite happens.
 *
 * Without this, `set_param` happily rewrote e.g. a boolean's default to a
 * string (silently flipping which typed kind `param()` infers on the next
 * evaluate) or a choice's default to a value outside its declared set, with
 * `new_code` returned as if the edit had succeeded — the mistake only
 * surfaced later as a confusing downstream diagnostic ("chamfer distance
 * undefined") once the caller acted on the corrupted code.
 *
 * Evaluates the ORIGINAL (pre-edit) code to read the live `ParamTable`, then
 * reuses `ParamTable.set()`'s existing validation — the same
 * `feature.invalid-args` code with `invalid-args.param.type-mismatch` /
 * `invalid-args.param.choice-invalid` / `invalid-args.param.value-out-of-range`
 * hint sub-codes this registry group already uses everywhere else (see
 * `paramTable.ts`, `paramRef.ts`) — rather than inventing new top-level
 * diagnostic codes for the MCP edit path alone.
 *
 * Returns `undefined` (no error) when: the param isn't found (the existing
 * `setParamValue` AST-edit surfaces that as `'not found'`), the original
 * code fails to evaluate (the existing flow surfaces THAT failure), or the
 * value is valid. Never throws.
 */
async function validateNewValueAgainstDeclaredType(
  code: string,
  paramName: string,
  newValue: number | string | boolean,
): Promise<string | undefined> {
  // Same KERNELCAD_VALIDATE_DEFAULT save/restore guard as
  // `sweepTolerance.ts`'s pre-check — `evaluateAndBuildScript` sets that env
  // var to 'error' on first read and never clears it; an unguarded call here
  // would permanently flip validation defaults for the rest of the process.
  const hadValidateDefault = process.env.KERNELCAD_VALIDATE_DEFAULT !== undefined;
  let built: Awaited<ReturnType<typeof evaluateAndBuildScript>>;
  try {
    built = await evaluateAndBuildScript({ code });
  } finally {
    if (!hadValidateDefault) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  }
  if (built.evaluation.exitCode !== 0 || !built.model) return undefined;
  const table = built.model.session.paramTable;
  if (!table.has(paramName)) return undefined;

  try {
    table.set(paramName, newValue);
  } catch (e) {
    if (isKernelError(e)) {
      return `${e.message}${e.hint ? ` (${e.hint})` : ''}`;
    }
    throw e;
  }
  return undefined;
}
