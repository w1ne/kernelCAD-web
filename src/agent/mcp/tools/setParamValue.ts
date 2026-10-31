// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SceneSummary } from '../../script-runtime/sceneSummary';
// src/mcp/tools/setParamValue.ts
import { setParamValue, parseParamDeclaration, type ParamDeclaration } from '../../../modeling/edits/setParamValue';
import { evaluateScriptTool, type EvaluateScriptOutput } from './evaluateScript';
import { getActiveMcpSession } from '../activeSession';
import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { isKernelError } from '../../../shared/intent/kernelError';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { normalizeColor } from '../../../shared/runtime/paramColor';
import { previewCodeEdit, type EditPreviewResult } from './editPreview';
import { planFeatureParamEdit, type FeatureParamChange, type FeatureParamEdit } from '../edits/featureParamEdit';

export interface SetParamValueInput {
  code: string;
  /** param() mode: the param to change. */
  param_name?: string;
  /** param() mode: its new default. */
  new_value?: number | string | boolean;
  /** Feature mode: the feature id to edit in place (inspect({ of: 'features' })). */
  feature?: string;
  /** Feature mode: the feature's parameters to change, e.g. { r: 3.3 }. */
  changes?: Record<string, number>;
  /** S6: build the edit in a scratch session and return the diff_geometry
   *  summary plus the requirements-ledger and S1 binding diffs. Nothing is
   *  written: the active session, source and caches are untouched. */
  preview?: boolean;
}

export interface SetParamValueOutput extends Partial<Omit<EditPreviewResult, 'ok'>> {
  ok: boolean;
  /** Feature mode: the edited feature, each rewritten argument and every
   *  captured parameter that changed. */
  feature?: string;
  kind?: string;
  edits?: FeatureParamEdit[];
  changedParams?: FeatureParamChange[];
  errorCode?: string;
  hint?: string;
  new_code?: string;
  step?: EvaluateScriptOutput['step'];
  diagnostics?: CompilerDiagnostic[];
  sceneSummary?: SceneSummary;
  error?: string;
}

export async function setParamValueTool(
  input: SetParamValueInput,
): Promise<SetParamValueOutput> {
  if (input.feature !== undefined) return setFeatureParamsTool(input);
  if (typeof input.param_name !== 'string' || input.new_value === undefined) {
    return {
      ok: false,
      error: 'set_param needs either { param_name, new_value } (a param() default) or { feature, changes } (a feature\'s own parameters).',
    };
  }
  return setDeclaredParamTool({ ...input, param_name: input.param_name, new_value: input.new_value });
}

/**
 * Feature mode: rewrite the feature's own arguments, rebuild the model before
 * and after, and return the revised source with the geometry, requirements
 * and selector diffs (the same payload as `preview: true`). Writes nothing and
 * leaves the active session alone; the caller persists `new_code`.
 */
async function setFeatureParamsTool(input: SetParamValueInput): Promise<SetParamValueOutput> {
  const plan = await planFeatureParamEdit({
    code: input.code,
    feature: input.feature ?? '',
    changes: (input.changes ?? {}) as Record<string, unknown>,
  });
  if (!plan.ok) {
    return { ok: false, error: plan.error, errorCode: plan.errorCode, ...(plan.hint !== undefined ? { hint: plan.hint } : {}) };
  }
  const preview = await previewCodeEdit({ baselineCode: input.code, revisedCode: plan.new_code });
  return {
    ...preview,
    feature: plan.feature,
    kind: plan.kind,
    edits: plan.edits,
    changedParams: plan.changedParams,
    ...(preview.ok ? { new_code: plan.new_code } : {}),
  };
}

async function setDeclaredParamTool(
  input: SetParamValueInput & { param_name: string; new_value: number | string | boolean },
): Promise<SetParamValueOutput> {
  // Gate 1 — SOURCE-TEXT validation, always runs, independent of whether the
  // script can evaluate at all. See `validateAgainstDeclaration` below for
  // why this can't be skipped in favor of the evaluation-based gate alone.
  const declResult = parseParamDeclaration(input.code, input.param_name);
  let newValue = input.new_value;
  if (declResult.ok) {
    const sourceError = validateAgainstDeclaration(declResult.declaration, newValue);
    if (sourceError !== undefined) {
      return { ok: false, error: sourceError };
    }
    // A colour is written back as '#rrggbb' whatever form it arrived in
    // ('#rgb', a CSS name), so the source keeps a colour-param default.
    if (declResult.declaration.kind === 'color') newValue = normalizeColor(newValue) ?? newValue;
  }
  // declResult.ok === false (not found / multiple matches) is deliberately
  // NOT surfaced here — `setParamValue` below re-does the same lookup and
  // returns the same error through the existing, already-tested path.

  // Gate 2 — EVALUATION-based validation. Catches what source-text parsing
  // cannot (numeric min/max bounds, since those still require going through
  // ParamTable.set()'s bounds check against a live ParamTable). Skipped
  // (not treated as a rejection) whenever the ORIGINAL script fails to
  // evaluate for an unrelated reason — Gate 1 above is what still catches a
  // type/choice mismatch in that case.
  const typeError = await validateNewValueAgainstDeclaredType(input.code, input.param_name, newValue);
  if (typeError !== undefined) {
    return { ok: false, error: typeError };
  }

  const edit = setParamValue(input.code, input.param_name, newValue);
  if (!edit.ok || !edit.new_code) {
    return { ok: false, error: edit.error };
  }

  if (input.preview === true) {
    const preview = await previewCodeEdit({ baselineCode: input.code, revisedCode: edit.new_code });
    return {
      ...preview,
      ...(preview.ok ? { new_code: edit.new_code } : {}),
    };
  }

  // The model the agent last evaluated is the baseline: a parameter edit that
  // re-binds a selector to another face is reported, not silently applied.
  const previous = getActiveMcpSession();
  const baseline = previous?.code === input.code ? previous.selections : undefined;
  const evalResult = await evaluateScriptTool({ code: edit.new_code, ...(baseline !== undefined ? { baseline } : {}) });

  return {
    ok: evalResult.ok,
    new_code: edit.new_code,
    step: evalResult.step,
    sceneSummary: evalResult.sceneSummary,
    diagnostics: evalResult.diagnostics,
  };
}

/**
 * Gate 1: reject `new_value` against the param's declared kind read PURELY
 * from source text (`parseParamDeclaration` — the default literal's syntax
 * plus `choices`/`maxLength` from the `meta` object), with NO script
 * evaluation involved.
 *
 * This exists because the evaluation-based gate (`validateNewValueAgainstDeclaredType`
 * below) silently skips validation whenever the ORIGINAL script fails to
 * evaluate for ANY reason — including reasons that have nothing to do with
 * the param being edited (a broken font load elsewhere in the script, a
 * missing file, an unrelated geometry failure). A caller running through
 * the public MCP dispatcher in an environment where the node host-fs
 * capability isn't installed (so `sketch.text`'s font loader throws) would
 * see `set_param` silently rewrite `HasLid` to the string `'yes'` — the
 * value slips through untouched into `new_code` even though it plainly
 * doesn't match the param's declared boolean kind. Source-text validation
 * has no such dependency: it never runs the script, so it can't be defeated
 * by an unrelated evaluation failure.
 *
 * Returns `undefined` when: the declared kind is `'unknown'` (the default
 * isn't a literal — an expression/variable; nothing to validate against
 * from source text alone) or the value is valid.
 */
function validateAgainstDeclaration(
  declaration: ParamDeclaration,
  newValue: number | string | boolean,
): string | undefined {
  const { name, kind } = declaration;
  if (kind === 'unknown') return undefined;

  const expectedJsType = kind === 'number' || kind === 'boolean' ? kind : 'string';
  if (typeof newValue !== expectedJsType) {
    return (
      `param '${name}' is ${kind}, got ${typeof newValue} ` +
      `(invalid-args.param.type-mismatch — param '${name}' is ${kind}, got ${typeof newValue})`
    );
  }

  if (kind === 'choice') {
    const choices = declaration.choices ?? [];
    if (choices.length === 0 || !choices.includes(newValue as string)) {
      return (
        `param '${name}' value '${String(newValue)}' is not one of the declared choices: ${choices.join(', ')} ` +
        `(invalid-args.param.choice-invalid — param '${name}' value '${String(newValue)}' is not one of [${choices.join(', ')}])`
      );
    }
  }

  if (kind === 'color' && normalizeColor(newValue) === undefined) {
    return (
      `param '${name}' is a colour, got '${String(newValue)}' — pass '#rrggbb', '#rgb' or a basic CSS colour name ` +
      `(invalid-args.param.type-mismatch — param '${name}' is color, got '${String(newValue)}')`
    );
  }

  if (kind === 'string' && declaration.maxLength !== undefined) {
    const len = (newValue as string).length;
    if (len > declaration.maxLength) {
      return (
        `param '${name}' value length ${len} exceeds maxLength ${declaration.maxLength} ` +
        `(invalid-args.param.value-out-of-range — param '${name}' value length ${len} exceeds maxLength ${declaration.maxLength})`
      );
    }
  }

  return undefined;
}

/**
 * Gate 2: reject a `new_value` that doesn't match the param's DECLARED kind
 * per the live `ParamTable` (type, `choices` membership, `maxLength`, AND
 * numeric `min`/`max` bounds — the one check Gate 1 above cannot do from
 * source text alone). Evaluates the ORIGINAL (pre-edit) code to build that
 * table, then reuses `ParamTable.set()`'s existing validation — the same
 * `feature.invalid-args` code with `invalid-args.param.type-mismatch` /
 * `invalid-args.param.choice-invalid` / `invalid-args.param.value-out-of-range`
 * hint sub-codes this registry group already uses everywhere else (see
 * `paramTable.ts`, `paramRef.ts`) — rather than inventing new top-level
 * diagnostic codes for the MCP edit path alone.
 *
 * Returns `undefined` (no error) when: the param isn't found, the original
 * code fails to evaluate (Gate 1 above is what still catches a type/choice
 * mismatch in that case — this gate has nothing further to add), or the
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
