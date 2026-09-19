// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/sweepTolerance.ts
//
// Parameter-space tolerance sweep. Declares one or more `param()` names with
// a value list or {min,max,steps} range, re-evaluates the script once per
// cartesian-product combination (reusing the existing `set_param`
// string-rewrite + `evaluate_script` build path — no new script engine),
// and runs the standard mechanism gates on each: interference + mounting-
// hole + joint-axis (all three already fold out of one
// `validateAssemblyWithMates(arm, interferencePairs)` call), plus
// reachability when a `gates.reachable` target is declared.
//
// Combo count is capped at 64 (per-param cartesian product) — a design-time
// tolerance sweep, not a manufacturing DOE; exceeding the cap truncates to
// the first 64 combos in enumeration order and emits
// `kinematic.sweep-tolerance.combo-cap-exceeded`.
//
// Hole diameters bound through a ParamRef (`.hole({ diameter: someParam })`)
// are resolved against the live param table by the mounting-hole gate, so
// sweeping that diameter produces a real pass/fail envelope.

// `evaluateAndBuildScript` lives in the CLI command tree, which pulls
// node-only modules (file reads, CLI arg parsing) transitively. This module
// is reachable from the browser runtime via `src/modeling/api.ts` ->
// `import * as kinematic from '../kinematic'`, so the import is deferred to
// a dynamic `await import(...)` (code-split, not part of the static browser
// graph) rather than a top-level import — see
// `src/modeling/runtime/browserGraphNodeFree.test.ts`.
import type { evaluateAndBuildScript } from '../agent/cli/commands/evaluate';
import { setParamValue } from '../agent/mcp/edits/setParamValue';
import type { Assembly } from '../modeling/capture/assembly';
import { validateAssemblyWithMates } from '../modeling/mates/validator';
import { detectInterferencesForPoses } from '../modeling/mates/poseEnvelope';
import { checkReachable } from './checkReachable';
import { KernelError } from '../shared/intent/kernelError';
import { DIAGNOSTIC_REGISTRY, type DiagnosticCode } from '../shared/diagnostics/registry';
import type {
  SweepComboResult,
  SweepGateSpec,
  SweepParamsDeclaration,
  SweepToleranceResult,
} from './types';

export const SWEEP_COMBO_CAP = 64;

export interface SweepToleranceInput {
  readonly code?: string;
  readonly file?: string;
  readonly assembly?: string;
  readonly params: SweepParamsDeclaration;
  readonly gates?: SweepGateSpec;
}

/**
 * Run the standard mechanism gates across a cartesian product of declared
 * `param()` values, reusing `set_param`'s source-rewrite and
 * `evaluate_script`'s build path per combo.
 *
 * Emits `kinematic.sweep-tolerance.combo-cap-exceeded` (warn) when the full
 * cartesian product exceeds `SWEEP_COMBO_CAP` (64) — the swept combos are
 * still evaluated (the first 64 in enumeration order); the caller should
 * narrow the sweep to get full coverage.
 *
 * Every emitted diagnostic in `result.results[].diagnostics` carries the
 * gate name it came from. `result.firstFailure[gateName]` is the fast-scan
 * entry point — the first combo (in enumeration order) at which that gate
 * failed.
 */
export async function sweepTolerance(
  input: SweepToleranceInput,
): Promise<SweepToleranceResult> {
  const baseCode = await resolveBaseCode(input);
  const paramNames = Object.keys(input.params);
  if (paramNames.length === 0) {
    return {
      ok: true,
      combosEvaluated: 0,
      combosCapped: false,
      results: [],
      firstFailure: {},
      diagnostics: [],
      source: 'local',
    };
  }

  await assertParamsAreNumeric(baseCode, paramNames);

  const valueLists = paramNames.map((name) => expandParamSpec(input.params[name]!));
  const allCombos = cartesianProduct(paramNames, valueLists);
  const combosCapped = allCombos.length > SWEEP_COMBO_CAP;
  const combos = combosCapped ? allCombos.slice(0, SWEEP_COMBO_CAP) : allCombos;

  const gates = normalizeGates(input.gates);
  const results: SweepComboResult[] = [];
  const firstFailure: Record<string, SweepComboResult | undefined> = {};

  for (const combo of combos) {
    let comboCode = baseCode;
    let editFailed: string | undefined;
    for (const name of paramNames) {
      const edit = setParamValue(comboCode, name, combo[name]!);
      if (!edit.ok || edit.new_code === undefined) {
        editFailed = edit.error ?? `set_param failed for '${name}'`;
        break;
      }
      comboCode = edit.new_code;
    }

    const comboResult: SweepComboResult = editFailed !== undefined
      ? {
          combo,
          gates: Object.fromEntries(gateNames(gates).map((g) => [g, 'fail' as const])),
          diagnostics: gateNames(gates).map((g) => ({
            gate: g,
            code: 'feature.invalid-args',
            severity: 'error',
            message: editFailed!,
          })),
        }
      : await evaluateCombo(comboCode, input.assembly, gates, combo);

    results.push(comboResult);
    for (const [gate, verdict] of Object.entries(comboResult.gates)) {
      if (verdict === 'fail' && firstFailure[gate] === undefined) {
        firstFailure[gate] = comboResult;
      }
    }
  }

  const diagnostics = combosCapped ? [buildCapDiag(allCombos.length)] : [];

  const ok = results.every((r) => Object.values(r.gates).every((v) => v === 'pass'));
  return {
    ok,
    combosEvaluated: results.length,
    combosCapped,
    results,
    firstFailure,
    diagnostics,
    source: 'local',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers.
// ─────────────────────────────────────────────────────────────────────────

/**
 * `sweep_tolerance` only makes sense over numeric ranges (min/max/steps or a
 * value list of numbers) — a boolean/choice/string param has no meaningful
 * "sweep". Evaluate the base script once and check each declared param's
 * type up front so a bad request fails loudly with one clear diagnostic
 * instead of 64 confusing per-combo `set_param` failures.
 */
async function assertParamsAreNumeric(baseCode: string, paramNames: string[]): Promise<void> {
  // Same env-var save/restore dance as `evaluateCombo` below: calling
  // `evaluateAndBuildScript` runs `applyEvaluateDefaults()`, which sets
  // `KERNELCAD_VALIDATE_DEFAULT` to `'error'` the first time it's read and
  // leaves it set for the process. Without restoring it here, this
  // pre-check call would permanently flip validation to `'error'` and
  // silently disable `evaluateCombo`'s own 'warn' override for the entire
  // sweep — every combo's `solvedModel()` would then throw on the first
  // mechanism-invalid combo instead of surfacing through this function's
  // own gate classification.
  const hadValidateDefault = process.env.KERNELCAD_VALIDATE_DEFAULT !== undefined;
  let built: Awaited<ReturnType<typeof evaluateAndBuildScript>>;
  try {
    const mod = await import('../agent/cli/commands/evaluate');
    built = await mod.evaluateAndBuildScript({ code: baseCode });
  } finally {
    if (!hadValidateDefault) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  }
  if (built.evaluation.exitCode !== 0 || !built.model) return; // let the normal per-combo path surface the eval error.
  const table = built.model.session.paramTable;
  for (const name of paramNames) {
    if (!table.has(name)) continue; // unknown-name errors surface per-combo via set_param.
    const entry = table.get(name);
    if (entry.type !== 'number') {
      throw new KernelError(
        'feature.invalid-args',
        `sweep_tolerance: param '${name}' is '${entry.type}', not numeric. Only number params can be swept over a range/value list.`,
        undefined,
        `invalid-args.param.type-mismatch — sweep_tolerance: param '${name}' is '${entry.type}', not numeric; sweep only number params.`,
      );
    }
  }
}

async function resolveBaseCode(input: SweepToleranceInput): Promise<string> {
  if (input.code !== undefined) return input.code;
  if (input.file !== undefined) {
    const { readFile } = await import('node:fs/promises');
    return readFile(input.file, 'utf-8');
  }
  throw new Error('sweepTolerance requires either `code` or `file`.');
}

interface NormalizedGates {
  readonly interference: boolean;
  readonly mountingHoles: boolean;
  readonly jointAxis: boolean;
  readonly reachable?: SweepGateSpec['reachable'];
}

function normalizeGates(gates: SweepGateSpec | undefined): NormalizedGates {
  return {
    interference: gates?.interference ?? true,
    mountingHoles: gates?.mountingHoles ?? true,
    jointAxis: gates?.jointAxis ?? true,
    reachable: gates?.reachable,
  };
}

function gateNames(gates: NormalizedGates): string[] {
  const names: string[] = [];
  if (gates.interference) names.push('interference');
  if (gates.mountingHoles) names.push('mounting-holes');
  if (gates.jointAxis) names.push('joint-axis');
  if (gates.reachable !== undefined) names.push('reachable');
  return names;
}

async function evaluateCombo(
  code: string,
  assemblyName: string | undefined,
  gates: NormalizedGates,
  combo: Readonly<Record<string, number | string>>,
): Promise<SweepComboResult> {
  const { evaluation, model } = await runComboEvaluation(code);
  if (evaluation.exitCode !== 0 || !model) {
    return failedEvaluationResult(evaluation, combo, gates);
  }

  const assemblies = model.session.assemblies as Map<string, Assembly>;
  const arm = assemblyName !== undefined ? assemblies.get(assemblyName) : assemblies.values().next().value;
  if (!arm) {
    return noAssemblyResult(combo, gates);
  }

  const { rawDiagnostics, gateVerdicts } = await collectComboGateVerdicts(arm, gates);

  return { combo, gates: gateVerdicts, diagnostics: rawDiagnostics };
}

type ComboEvaluation = Awaited<ReturnType<typeof evaluateAndBuildScript>>['evaluation'];
type ComboModel = NonNullable<Awaited<ReturnType<typeof evaluateAndBuildScript>>['model']>;
type AssemblyDiagnostic = Awaited<ReturnType<typeof validateAssemblyWithMates>>['diagnostics'][number];

/**
 * Evaluate one combo under the sweep's validation default.
 *
 * `evaluateAndBuildScript` defaults KERNELCAD_VALIDATE_DEFAULT to 'error'
 * (see applyEvaluateDefaults), which makes an in-script
 * `arm.solvedModel({})` call THROW on a mechanism-invalid combo before
 * sweepTolerance's own gates ever run — the sweep exists to survey the
 * envelope, not stop at the first broken combo. Default to 'warn' (only
 * when the caller hasn't set an explicit value) so the script still
 * evaluates and this function's own gate classification below is the
 * source of truth for pass/fail.
 */
async function runComboEvaluation(code: string): Promise<{ evaluation: ComboEvaluation; model: ComboModel | undefined }> {
  const hadValidateDefault = process.env.KERNELCAD_VALIDATE_DEFAULT !== undefined;
  if (!hadValidateDefault) process.env.KERNELCAD_VALIDATE_DEFAULT = 'warn';
  let evaluation: ComboEvaluation;
  let model: Awaited<ReturnType<typeof evaluateAndBuildScript>>['model'];
  try {
    const mod = await import('../agent/cli/commands/evaluate');
    const built = await mod.evaluateAndBuildScript({ code });
    evaluation = built.evaluation;
    model = built.model;
  } finally {
    if (!hadValidateDefault) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  }
  return { evaluation, model };
}

/** Every declared gate fails when the combo script did not evaluate. */
function failedEvaluationResult(
  evaluation: ComboEvaluation,
  combo: Readonly<Record<string, number | string>>,
  gates: NormalizedGates,
): SweepComboResult {
  const message = evaluation.diagnostics[0]?.message ?? 'Script evaluation failed for this combo.';
  return {
    combo,
    gates: Object.fromEntries(gateNames(gates).map((g) => [g, 'fail' as const])),
    diagnostics: gateNames(gates).map((g) => ({
      gate: g,
      code: evaluation.diagnostics[0]?.code ?? 'feature.invalid-args',
      severity: 'error',
      message,
    })),
  };
}

/** Every declared gate fails when the combo captured no assembly. */
function noAssemblyResult(
  combo: Readonly<Record<string, number | string>>,
  gates: NormalizedGates,
): SweepComboResult {
  return {
    combo,
    gates: Object.fromEntries(gateNames(gates).map((g) => [g, 'fail' as const])),
    diagnostics: gateNames(gates).map((g) => ({
      gate: g,
      code: 'feature.invalid-args',
      severity: 'error',
      message: 'sweep_tolerance: no assembly captured for this combo.',
    })),
  };
}

/** Run the declared mechanism gates on one combo's assembly. */
async function collectComboGateVerdicts(
  arm: Assembly,
  gates: NormalizedGates,
): Promise<{ rawDiagnostics: SweepComboResult['diagnostics']; gateVerdicts: Record<string, 'pass' | 'fail'> }> {
  const rawDiagnostics: SweepComboResult['diagnostics'][number][] = [];
  const gateVerdicts: Record<string, 'pass' | 'fail'> = {};

  if (gates.interference || gates.mountingHoles || gates.jointAxis) {
    const interferencePairs = gates.interference
      ? await detectInterferencesForPoses(arm, {})
      : undefined;
    const validated = await validateAssemblyWithMates(arm, interferencePairs);
    const classified = classifyAssemblyDiagnostics(validated.diagnostics, gates);
    rawDiagnostics.push(...classified.rawDiagnostics);
    if (gates.interference) gateVerdicts['interference'] = classified.interferenceFail ? 'fail' : 'pass';
    if (gates.mountingHoles) gateVerdicts['mounting-holes'] = classified.mountingHoleFail ? 'fail' : 'pass';
    if (gates.jointAxis) gateVerdicts['joint-axis'] = classified.jointAxisFail ? 'fail' : 'pass';
  }

  if (gates.reachable !== undefined) {
    const reach = await collectReachableVerdict(arm, gates.reachable);
    gateVerdicts['reachable'] = reach.verdict;
    rawDiagnostics.push(...reach.diagnostics);
  }

  return { rawDiagnostics, gateVerdicts };
}

/** Sort validation diagnostics into the three assembly gates' fail flags. */
function classifyAssemblyDiagnostics(
  diagnostics: readonly AssemblyDiagnostic[],
  gates: NormalizedGates,
): {
  interferenceFail: boolean;
  mountingHoleFail: boolean;
  jointAxisFail: boolean;
  rawDiagnostics: SweepComboResult['diagnostics'][number][];
} {
  const rawDiagnostics: SweepComboResult['diagnostics'][number][] = [];
  let interferenceFail = false;
  let mountingHoleFail = false;
  let jointAxisFail = false;
  for (const d of diagnostics) {
    if (d.code === 'assembly.interference.overlap') {
      if (!gates.interference) continue;
      interferenceFail = interferenceFail || d.severity === 'error';
      rawDiagnostics.push({ gate: 'interference', code: d.code, severity: d.severity, message: d.message });
    } else if (d.code === 'assembly.mounting-hole.mismatch') {
      if (!gates.mountingHoles) continue;
      // assembly.mounting-hole.mismatch is emitted at severity 'info'
      // unconditionally (demoted 2026-06-01 — the merge gate is
      // mechanism.disconnect at validate-time, not this authoring-time
      // signal) — presence is the fail condition, not severity.
      mountingHoleFail = true;
      rawDiagnostics.push({ gate: 'mounting-holes', code: d.code, severity: d.severity, message: d.message });
    } else if (d.code === 'assembly.joint-axis.unbound') {
      if (!gates.jointAxis) continue;
      jointAxisFail = jointAxisFail || d.severity === 'error';
      rawDiagnostics.push({ gate: 'joint-axis', code: d.code, severity: d.severity, message: d.message });
    }
  }
  return { interferenceFail, mountingHoleFail, jointAxisFail, rawDiagnostics };
}

/** Reachability verdict + diagnostics for one combo's arm. */
async function collectReachableVerdict(
  arm: Assembly,
  reachable: NonNullable<NormalizedGates['reachable']>,
): Promise<{ verdict: 'pass' | 'fail'; diagnostics: SweepComboResult['diagnostics'][number][] }> {
  const reach = await checkReachable(arm, {
    tipLink: reachable.tipLink,
    target: {
      position: reachable.targetPosition,
      orientation: reachable.targetOrientation,
    },
  });
  const diagnostics = reach.diagnostics.map((d) => ({
    gate: 'reachable',
    code: d.code,
    severity: d.severity,
    message: d.message,
  }));
  return { verdict: reach.ok ? 'pass' : 'fail', diagnostics };
}

function expandParamSpec(spec: SweepParamsDeclaration[string]): ReadonlyArray<number | string> {
  if ('values' in spec) return spec.values;
  const { min, max, steps } = spec;
  const n = Math.max(2, steps);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(min + t * (max - min));
  }
  return out;
}

function cartesianProduct(
  names: readonly string[],
  valueLists: ReadonlyArray<ReadonlyArray<number | string>>,
): Array<Record<string, number | string>> {
  let combos: Array<Record<string, number | string>> = [{}];
  for (let i = 0; i < names.length; i++) {
    const name = names[i]!;
    const values = valueLists[i]!;
    const next: Array<Record<string, number | string>> = [];
    for (const combo of combos) {
      for (const v of values) {
        next.push({ ...combo, [name]: v });
      }
    }
    combos = next;
  }
  return combos;
}

function buildCapDiag(totalCombos: number): {
  code: DiagnosticCode;
  severity: 'warn';
  message: string;
} {
  const code: DiagnosticCode = 'kinematic.sweep-tolerance.combo-cap-exceeded';
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    code,
    severity: 'warn',
    message:
      `The cartesian product of swept params has ${totalCombos} combinations, exceeding the ${SWEEP_COMBO_CAP}-combo cap. ` +
      `Only the first ${SWEEP_COMBO_CAP} (in declaration order) were evaluated. ${entry.hintTemplate}`,
  };
}
