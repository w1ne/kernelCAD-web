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

import { evaluateAndBuildScript } from '../agent/cli/commands/evaluate';
import { setParamValue } from '../agent/mcp/edits/setParamValue';
import type { Assembly } from '../modeling/capture/assembly';
import { validateAssemblyWithMates } from '../modeling/mates/validator';
import { detectInterferencesForPoses } from '../modeling/mates/poseEnvelope';
import { checkReachable } from './checkReachable';
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
  // `evaluateAndBuildScript` defaults KERNELCAD_VALIDATE_DEFAULT to 'error'
  // (see applyEvaluateDefaults), which makes an in-script
  // `arm.solvedModel({})` call THROW on a mechanism-invalid combo before
  // sweepTolerance's own gates ever run — the sweep exists to survey the
  // envelope, not stop at the first broken combo. Default to 'warn' (only
  // when the caller hasn't set an explicit value) so the script still
  // evaluates and this function's own gate classification below is the
  // source of truth for pass/fail.
  const hadValidateDefault = process.env.KERNELCAD_VALIDATE_DEFAULT !== undefined;
  if (!hadValidateDefault) process.env.KERNELCAD_VALIDATE_DEFAULT = 'warn';
  let evaluation: Awaited<ReturnType<typeof evaluateAndBuildScript>>['evaluation'];
  let model: Awaited<ReturnType<typeof evaluateAndBuildScript>>['model'];
  try {
    const built = await evaluateAndBuildScript({ code });
    evaluation = built.evaluation;
    model = built.model;
  } finally {
    if (!hadValidateDefault) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  }
  if (evaluation.exitCode !== 0 || !model) {
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

  const assemblies = model.session.assemblies as Map<string, Assembly>;
  const arm = assemblyName !== undefined ? assemblies.get(assemblyName) : assemblies.values().next().value;
  if (!arm) {
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

  const rawDiagnostics: SweepComboResult['diagnostics'][number][] = [];
  const gateVerdicts: Record<string, 'pass' | 'fail'> = {};

  if (gates.interference || gates.mountingHoles || gates.jointAxis) {
    const interferencePairs = gates.interference
      ? await detectInterferencesForPoses(arm, {})
      : undefined;
    const validated = await validateAssemblyWithMates(arm, interferencePairs);
    let interferenceFail = false;
    let mountingHoleFail = false;
    let jointAxisFail = false;
    for (const d of validated.diagnostics) {
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
    if (gates.interference) gateVerdicts['interference'] = interferenceFail ? 'fail' : 'pass';
    if (gates.mountingHoles) gateVerdicts['mounting-holes'] = mountingHoleFail ? 'fail' : 'pass';
    if (gates.jointAxis) gateVerdicts['joint-axis'] = jointAxisFail ? 'fail' : 'pass';
  }

  if (gates.reachable !== undefined) {
    const reach = await checkReachable(arm, {
      tipLink: gates.reachable.tipLink,
      target: {
        position: gates.reachable.targetPosition,
        orientation: gates.reachable.targetOrientation,
      },
    });
    gateVerdicts['reachable'] = reach.ok ? 'pass' : 'fail';
    for (const d of reach.diagnostics) {
      rawDiagnostics.push({ gate: 'reachable', code: d.code, severity: d.severity, message: d.message });
    }
  }

  return { combo, gates: gateVerdicts, diagnostics: rawDiagnostics };
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
