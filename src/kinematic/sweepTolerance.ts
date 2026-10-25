// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/sweepTolerance.ts
//
// Parameter-space tolerance sweep. Declares one or more `param()` names with
// a value list or {min,max,steps} range, re-evaluates the script once per
// cartesian-product combination (reusing the existing `set_param`
// string-rewrite + `evaluate_script` build path — no new script engine),
// and evaluates one ledger at each point:
//
//   - every script `require()`, dfmSpec, gated FEA and mechanical-intent entry
//     reported by the S2 requirements ledger;
//   - the standard mechanism gates (interference + mounting-hole + joint-axis,
//     all three already fold out of one `validateAssemblyWithMates` call), plus
//     reachability when a `gates.reachable` target is declared.
//
// After the coarse grid, each pass/fail transition along a numeric parameter
// is bisected down to `boundaryTolerance` and reported with the parameter
// value, the side that fails, and the ledger requirement(s) / gate(s) that are
// binding there. The result says "checked at N points plus boundaries" and
// never claims a proof; interval bounds are deliberately out of scope.
//
// Combo count is capped at 64 (per-param cartesian product) — a design-time
// tolerance sweep, not a manufacturing DOE; exceeding the cap truncates to
// the first 64 combos in enumeration order and emits
// `kinematic.sweep-tolerance.combo-cap-exceeded`. Boundary bisection has its
// own evaluation budget (`boundaryBudget`, default 64); exhausting it reports
// the final bracket as `exhausted` and emits
// `kinematic.sweep-tolerance.boundary-budget-exhausted`.
//
// Hole diameters bound through a ParamRef (`.hole({ diameter: someParam })`)
// are resolved against the live param table by the mounting-hole gate, so
// sweeping that diameter produces a real pass/fail envelope.

// The script-evaluation step (the CLI command tree's `evaluateAndBuildScript`,
// which pulls node-only modules — file reads, CLI arg parsing — transitively)
// is injected: kinematic owns the `SweepEvaluator` seam below, and the
// composition layer (`src/composition/scriptApi.ts`) binds the implementation
// when it constructs the script API. This keeps the module free of agent and
// composition imports while it stays reachable from the browser runtime via
// `src/modeling/api.ts` -> `import * as kinematic from '../kinematic'` — see
// `src/modeling/runtime/browserGraphNodeFree.test.ts`.
import { setParamValue } from '../modeling/edits/setParamValue';
import type { Assembly } from '../modeling/capture/assembly';
import { validateAssemblyWithMates } from '../modeling/mates/validator';
import { detectInterferencesForPoses } from '../modeling/mates/poseEnvelope';
import { checkReachable } from './checkReachable';
import { KernelError } from '../shared/intent/kernelError';
import { DIAGNOSTIC_REGISTRY, type DiagnosticCode } from '../shared/diagnostics/registry';
import type { RequirementLedgerEntry } from '../shared/intent/requirementRecord';
import type {
  SweepBoundary,
  SweepComboResult,
  SweepCoverage,
  SweepEvaluation,
  SweepEvaluationModel,
  SweepEvaluationResult,
  SweepEvaluator,
  SweepGateSpec,
  SweepParamsDeclaration,
  SweepRequirementEntry,
  SweepToleranceResult,
} from './types';

export type { SweepEvaluation, SweepEvaluator } from './types';

export const SWEEP_COMBO_CAP = 64;
export const SWEEP_BOUNDARY_TOLERANCE = 1e-3;
export const SWEEP_BOUNDARY_BUDGET = 64;

export interface SweepToleranceInput {
  readonly code?: string;
  readonly file?: string;
  readonly assembly?: string;
  readonly params: SweepParamsDeclaration;
  readonly gates?: SweepGateSpec;
  /** Absolute parameter tolerance for boundary bisection. Default 1e-3.
   *  Bisection stops once the pass and fail values differ by at most this. */
  readonly boundaryTolerance?: number;
  /** Maximum extra evaluations spent on boundary bisection (default 64). Set
   *  to 0 to skip bisection and report no boundaries. */
  readonly boundaryBudget?: number;
}

type NumericValue = number;

/**
 * Run every ledger requirement plus the standard mechanism gates across a
 * cartesian product of declared `param()` values, reusing `set_param`'s
 * source-rewrite and `evaluate_script`'s build path per combo, then bisect
 * numeric pass/fail transitions to report where and why the design breaks.
 *
 * Emits `kinematic.sweep-tolerance.combo-cap-exceeded` (warn) when the full
 * cartesian product exceeds `SWEEP_COMBO_CAP` (64) — the swept combos are
 * still evaluated (the first 64 in enumeration order); the caller should
 * narrow the sweep to get full coverage.
 *
 * Every emitted diagnostic in `result.results[].diagnostics` carries the
 * gate name it came from. `result.firstFailure[gateName]` is the fast-scan
 * entry point — the first combo (in enumeration order) at which that gate
 * failed. `result.firstRequirementFailure[requirementName]` is the same for
 * the ledger.
 */
export async function sweepTolerance(
  input: SweepToleranceInput,
  evaluator?: SweepEvaluator,
): Promise<SweepToleranceResult> {
  const baseCode = await resolveBaseCode(input);
  const paramNames = Object.keys(input.params);
  if (paramNames.length === 0) {
    return emptySweepResult(validateBoundaryTolerance(input.boundaryTolerance), validateBoundaryBudget(input.boundaryBudget));
  }

  const paramTypes = await assertParamsAreSweepable(baseCode, paramNames, input.params, evaluator);

  const valueLists = paramNames.map((name) => expandParamSpec(input.params[name]!));
  const allCombos = cartesianProduct(paramNames, valueLists);
  const combosCapped = allCombos.length > SWEEP_COMBO_CAP;
  const combos = combosCapped ? allCombos.slice(0, SWEEP_COMBO_CAP) : allCombos;

  const gates = normalizeGates(input.gates);
  const boundaryTolerance = validateBoundaryTolerance(input.boundaryTolerance);
  const boundaryBudget = validateBoundaryBudget(input.boundaryBudget);
  const diagnostics: SweepToleranceResult['diagnostics'][number][] = [];

  const results: SweepComboResult[] = [];
  const firstFailure: Record<string, SweepComboResult | undefined> = {};
  const firstRequirementFailure: Record<string, SweepComboResult | undefined> = {};
  const cache = new Map<string, SweepComboResult>();

  const evaluateAt = async (combo: Readonly<Record<string, number | string>>): Promise<SweepComboResult> => {
    const key = comboKey(combo);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const row = await evaluateComboAt(baseCode, paramNames, input.assembly, gates, combo, evaluator);
    cache.set(key, row);
    return row;
  };

  for (const combo of combos) {
    const comboResult = await evaluateAt(combo);
    results.push(comboResult);
    recordFirstFailures(comboResult, firstFailure, firstRequirementFailure);
  }

  if (combosCapped) diagnostics.push(buildCapDiag(allCombos.length));

  const boundarySearch = await findBoundaries({
    results,
    paramNames,
    paramTypes,
    evaluateAt,
    tolerance: boundaryTolerance,
    budget: boundaryBudget,
  });
  if (boundarySearch.budgetExhausted) {
    diagnostics.push(buildBudgetDiag(boundaryBudget, boundaryTolerance));
  }

  const coverage = buildCoverage(results.length, boundarySearch.boundaries, { evaluations: boundarySearch.evaluations });
  const ok = results.every((r) => r.verdict === 'pass');
  return {
    ok,
    combosEvaluated: results.length,
    combosCapped,
    results,
    firstFailure,
    firstRequirementFailure,
    boundaries: boundarySearch.boundaries,
    boundaryEvaluations: boundarySearch.evaluations,
    boundaryBudget,
    boundaryTolerance,
    coverage,
    diagnostics,
    source: 'local',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers.
// ─────────────────────────────────────────────────────────────────────────

function emptySweepResult(boundaryTolerance: number, boundaryBudget: number): SweepToleranceResult {
  return {
    ok: true,
    combosEvaluated: 0,
    combosCapped: false,
    results: [],
    firstFailure: {},
    firstRequirementFailure: {},
    boundaries: [],
    boundaryEvaluations: 0,
    boundaryBudget,
    boundaryTolerance,
    coverage: buildCoverage(0, [], { evaluations: 0 }),
    diagnostics: [],
    source: 'local',
  };
}

/**
 * `sweep_tolerance` makes sense over numeric ranges (min/max/steps or a value
 * list of numbers) and over discrete choice/string lists, whose points cannot
 * be bisected. Evaluate the base script once and check each declared param's
 * type up front so a bad request fails loudly with one clear diagnostic
 * instead of 64 confusing per-combo `set_param` failures.
 */
async function assertParamsAreSweepable(
  baseCode: string,
  paramNames: string[],
  params: SweepParamsDeclaration,
  evaluator: SweepEvaluator | undefined,
): Promise<Map<string, string>> {
  // Same env-var save/restore dance as `runComboEvaluation` below: the agent
  // evaluator calls `evaluateAndBuildScript`, which runs
  // `applyEvaluateDefaults()`, setting `KERNELCAD_VALIDATE_DEFAULT` to
  // `'error'` the first time it's read and leaving it set for the process.
  // Without restoring it here, this pre-check call would permanently flip
  // validation to `'error'` and silently disable `runComboEvaluation`'s own
  // 'warn' override for the entire sweep — every combo's `solvedModel()`
  // would then throw on the first mechanism-invalid combo instead of
  // surfacing through this function's own gate classification.
  const hadValidateDefault = process.env.KERNELCAD_VALIDATE_DEFAULT !== undefined;
  let built: SweepEvaluation;
  try {
    built = await requireEvaluator(evaluator).evaluate(baseCode);
  } finally {
    if (!hadValidateDefault) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  }
  const types = new Map<string, string>();
  if (built.evaluation.exitCode !== 0 || !built.model) return types; // let the normal per-combo path surface the eval error.
  const table = built.model.session.paramTable;
  for (const name of paramNames) {
    if (!table.has(name)) continue; // unknown-name errors surface per-combo via set_param.
    const entry = table.get(name);
    const values = expandParamSpec(params[name]!);
    if (entry.type === 'number') {
      if (!values.every((v) => typeof v === 'number' && Number.isFinite(v))) {
        throw new KernelError(
          'feature.invalid-args',
          `sweep_tolerance: param '${name}' is numeric, so every swept value must be a finite number.`,
          undefined,
          `invalid-args.param.type-mismatch — sweep_tolerance: param '${name}' is numeric; use numeric values only.`,
        );
      }
    } else if (entry.type === 'choice' || entry.type === 'string') {
      if (!values.every((v) => typeof v === 'string')) {
        throw new KernelError(
          'feature.invalid-args',
          `sweep_tolerance: param '${name}' is '${entry.type}', so every swept value must be a string.`,
          undefined,
          `invalid-args.param.type-mismatch — sweep_tolerance: param '${name}' is '${entry.type}'; use string values only.`,
        );
      }
    } else {
      throw new KernelError(
        'feature.invalid-args',
        `sweep_tolerance: param '${name}' is '${entry.type}', not sweepable. Only number, choice and string params can be swept.`,
        undefined,
        `invalid-args.param.type-mismatch — sweep_tolerance: param '${name}' is '${entry.type}'; sweep only number/choice/string params.`,
      );
    }
    types.set(name, entry.type);
  }
  return types;
}

async function resolveBaseCode(input: SweepToleranceInput): Promise<string> {
  if (input.code !== undefined) return input.code;
  if (input.file !== undefined) {
    const { readFile } = await import('node:fs/promises');
    return readFile(input.file, 'utf-8');
  }
  throw new Error('sweepTolerance requires either `code` or `file`.');
}

function validateBoundaryTolerance(value: number | undefined): number {
  if (value === undefined) return SWEEP_BOUNDARY_TOLERANCE;
  if (!Number.isFinite(value) || value <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `sweep_tolerance: boundaryTolerance must be a positive finite number; got ${String(value)}.`,
      undefined,
      'invalid-args.sweep.boundary-tolerance — pass a positive absolute parameter tolerance (default 0.001).',
    );
  }
  return value;
}

function validateBoundaryBudget(value: number | undefined): number {
  if (value === undefined) return SWEEP_BOUNDARY_BUDGET;
  if (!Number.isInteger(value) || value < 0) {
    throw new KernelError(
      'feature.invalid-args',
      `sweep_tolerance: boundaryBudget must be a non-negative integer; got ${String(value)}.`,
      undefined,
      'invalid-args.sweep.boundary-budget — pass 0 to skip bisection or a positive evaluation budget.',
    );
  }
  return value;
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

async function evaluateComboAt(
  baseCode: string,
  paramNames: readonly string[],
  assemblyName: string | undefined,
  gates: NormalizedGates,
  combo: Readonly<Record<string, number | string>>,
  evaluator: SweepEvaluator | undefined,
): Promise<SweepComboResult> {
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

  if (editFailed !== undefined) {
    return {
      combo,
      gates: Object.fromEntries(gateNames(gates).map((g) => [g, 'fail' as const])),
      requirements: [],
      verdict: 'fail',
      diagnostics: gateNames(gates).map((g) => ({
        gate: g,
        code: 'feature.invalid-args',
        severity: 'error',
        message: editFailed!,
      })),
    };
  }
  return collectComboResult(comboCode, assemblyName, gates, combo, evaluator);
}

async function collectComboResult(
  code: string,
  assemblyName: string | undefined,
  gates: NormalizedGates,
  combo: Readonly<Record<string, number | string>>,
  evaluator: SweepEvaluator | undefined,
): Promise<SweepComboResult> {
  const { evaluation, model } = await runComboEvaluation(code, evaluator);
  if (evaluation.exitCode !== 0 || !model) {
    return failedEvaluationResult(evaluation, combo, gates);
  }

  const assemblies = model.session.assemblies as ReadonlyMap<string, Assembly>;
  const arm = assemblyName !== undefined ? assemblies.get(assemblyName) : assemblies.values().next().value;
  if (!arm) {
    return noAssemblyResult(combo, gates);
  }

  const { rawDiagnostics, gateVerdicts } = await collectComboGateVerdicts(arm, gates);
  const requirements = compactRequirements(evaluation.requirements?.entries ?? []);
  const verdict = verdictOf(gateVerdicts, requirements);

  return { combo, gates: gateVerdicts, requirements, verdict, diagnostics: rawDiagnostics };
}

function compactRequirements(entries: readonly RequirementLedgerEntry[]): SweepRequirementEntry[] {
  return entries.map((entry) => ({
    name: entry.name,
    source: entry.source,
    status: entry.status,
    measured: entry.measured,
    limit: entry.limit,
    margin: entry.margin,
    ...(entry.message !== undefined ? { message: entry.message } : {}),
    ...(entry.featureId !== undefined ? { featureId: entry.featureId } : {}),
    selectionCount: entry.selections.length,
  }));
}

function verdictOf(
  gates: Readonly<Record<string, 'pass' | 'fail'>>,
  requirements: readonly SweepRequirementEntry[],
): 'pass' | 'fail' {
  const gatesPass = Object.values(gates).every((v) => v === 'pass');
  const requirementsPass = requirements.every((r) => r.status === 'pass');
  return gatesPass && requirementsPass ? 'pass' : 'fail';
}

function recordFirstFailures(
  row: SweepComboResult,
  firstFailure: Record<string, SweepComboResult | undefined>,
  firstRequirementFailure: Record<string, SweepComboResult | undefined>,
): void {
  for (const [gate, verdict] of Object.entries(row.gates)) {
    if (verdict === 'fail' && firstFailure[gate] === undefined) firstFailure[gate] = row;
  }
  for (const requirement of row.requirements) {
    if (requirement.status !== 'pass' && firstRequirementFailure[requirement.name] === undefined) {
      firstRequirementFailure[requirement.name] = row;
    }
  }
}

type AssemblyDiagnostic = Awaited<ReturnType<typeof validateAssemblyWithMates>>['diagnostics'][number];

/**
 * Evaluate one combo under the sweep's validation default.
 *
 * The agent evaluator wraps `evaluateAndBuildScript`, which defaults
 * KERNELCAD_VALIDATE_DEFAULT to 'error' (see applyEvaluateDefaults) and
 * makes an in-script `arm.solvedModel({})` call THROW on a mechanism-invalid
 * combo before sweepTolerance's own gates ever run — the sweep exists to
 * survey the envelope, not stop at the first broken combo. Default to 'warn'
 * (only when the caller hasn't set an explicit value) so the script still
 * evaluates and this function's own gate classification below is the
 * source of truth for pass/fail.
 */
async function runComboEvaluation(
  code: string,
  evaluator: SweepEvaluator | undefined,
): Promise<{ evaluation: SweepEvaluationResult; model: SweepEvaluationModel | undefined }> {
  const hadValidateDefault = process.env.KERNELCAD_VALIDATE_DEFAULT !== undefined;
  if (!hadValidateDefault) process.env.KERNELCAD_VALIDATE_DEFAULT = 'warn';
  let evaluation: SweepEvaluationResult;
  let model: SweepEvaluationModel | undefined;
  try {
    const built = await requireEvaluator(evaluator).evaluate(code);
    evaluation = built.evaluation;
    model = built.model;
  } finally {
    if (!hadValidateDefault) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  }
  return { evaluation, model };
}

/**
 * Resolve the injected evaluator at the point of use. Runtimes that never
 * received one (the browser script graph, or a raw modeling-level entry point
 * that bypasses composition) fail here at call time; the no-params path above
 * never needs one and stays a vacuous pass.
 */
function requireEvaluator(evaluator: SweepEvaluator | undefined): SweepEvaluator {
  if (evaluator === undefined) {
    throw new Error(
      'sweepTolerance: no script evaluator is available in this runtime. ' +
      'Run the script through a composition entry point (src/composition/runScript ' +
      'or src/composition/buildModel), which binds one; direct callers pass a SweepEvaluator.',
    );
  }
  return evaluator;
}

/** Every declared gate fails when the combo script did not evaluate. */
function failedEvaluationResult(
  evaluation: SweepEvaluationResult,
  combo: Readonly<Record<string, number | string>>,
  gates: NormalizedGates,
): SweepComboResult {
  const message = evaluation.diagnostics[0]?.message ?? 'Script evaluation failed for this combo.';
  return {
    combo,
    gates: Object.fromEntries(gateNames(gates).map((g) => [g, 'fail' as const])),
    requirements: [],
    verdict: 'fail',
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
    requirements: [],
    verdict: 'fail',
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

// ─────────────────────────────────────────────────────────────────────────
// Boundaries.
// ─────────────────────────────────────────────────────────────────────────

interface BoundarySearchInput {
  readonly results: readonly SweepComboResult[];
  readonly paramNames: readonly string[];
  readonly paramTypes: ReadonlyMap<string, string>;
  readonly evaluateAt: (combo: Readonly<Record<string, number | string>>) => Promise<SweepComboResult>;
  readonly tolerance: number;
  readonly budget: number;
}

interface BoundarySearchResult {
  readonly boundaries: SweepBoundary[];
  readonly evaluations: number;
  readonly budgetExhausted: boolean;
}

interface Slice {
  readonly at: Record<string, number | string>;
  readonly rows: SweepComboResult[];
}

async function findBoundaries(input: BoundarySearchInput): Promise<BoundarySearchResult> {
  const boundaries: SweepBoundary[] = [];
  const seen = new Set<string>();
  let evaluations = 0;
  let budgetExhausted = false;

  for (const parameter of input.paramNames) {
    if (input.paramTypes.get(parameter) !== undefined && input.paramTypes.get(parameter) !== 'number') continue;
    for (const slice of slicesFor(input.results, parameter)) {
      const rows = slice.rows
        .filter((row) => numericValue(row.combo[parameter]) !== undefined)
        .sort((a, b) => numericValue(a.combo[parameter])! - numericValue(b.combo[parameter])!);
      for (let i = 1; i < rows.length; i++) {
        const previous = rows[i - 1]!;
        const next = rows[i]!;
        if (previous.verdict === next.verdict) continue;

        const key = `${parameter}|${comboKey(slice.at)}|${String(previous.combo[parameter])}|${String(next.combo[parameter])}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const search = await bisectTransition({
          parameter,
          at: slice.at,
          previous,
          next,
          evaluateAt: input.evaluateAt,
          tolerance: input.tolerance,
          remainingBudget: input.budget - evaluations,
        });
        evaluations += search.evaluations;
        budgetExhausted = budgetExhausted || search.exhausted;
        boundaries.push(search.boundary);
      }
    }
  }

  return { boundaries, evaluations, budgetExhausted };
}

interface BisectTransitionInput {
  readonly parameter: string;
  readonly at: Readonly<Record<string, number | string>>;
  readonly previous: SweepComboResult;
  readonly next: SweepComboResult;
  readonly evaluateAt: (combo: Readonly<Record<string, number | string>>) => Promise<SweepComboResult>;
  readonly tolerance: number;
  readonly remainingBudget: number;
}

async function bisectTransition(
  input: BisectTransitionInput,
): Promise<{ boundary: SweepBoundary; evaluations: number; exhausted: boolean }> {
  const { parameter, at, previous, next } = input;
  const direction: SweepBoundary['direction'] =
    previous.verdict === 'pass' ? 'pass-to-fail' : 'fail-to-pass';
  let passValue = numericValue((previous.verdict === 'pass' ? previous : next).combo[parameter])!;
  let failValue = numericValue((previous.verdict === 'pass' ? next : previous).combo[parameter])!;
  const from = numericValue(previous.combo[parameter])!;
  const to = numericValue(next.combo[parameter])!;
  let failRow = previous.verdict === 'pass' ? next : previous;
  let evaluations = 0;
  let exhausted = false;

  while (Math.abs(passValue - failValue) > input.tolerance) {
    if (evaluations >= input.remainingBudget) {
      exhausted = true;
      break;
    }
    const mid = (passValue + failValue) / 2;
    const row = await input.evaluateAt({ ...at, [parameter]: mid });
    evaluations += 1;
    if (row.verdict === 'pass') passValue = mid;
    else {
      failValue = mid;
      failRow = row;
    }
  }

  const withinTolerance = Math.abs(passValue - failValue) <= input.tolerance;
  const value = (passValue + failValue) / 2;
  const failureSide: SweepBoundary['failureSide'] = failValue < passValue ? 'below' : 'above';
  const { requirements: bindingRequirements, gates: bindingGates } = bindingOf(failRow);
  const binding = [...bindingRequirements, ...bindingGates];

  return {
    evaluations,
    exhausted,
    boundary: {
      parameter,
      direction,
      from,
      to,
      passValue,
      failValue,
      value,
      failureSide,
      binding,
      bindingRequirements,
      bindingGates,
      at,
      evaluations,
      withinTolerance,
      exhausted,
      message: boundaryMessage({
        parameter,
        failureSide,
        value,
        passValue,
        failValue,
        binding,
        at,
        tolerance: input.tolerance,
        exhausted,
      }),
    },
  };
}

function slicesFor(results: readonly SweepComboResult[], parameter: string): Slice[] {
  const grouped = new Map<string, Slice>();
  for (const row of results) {
    const at: Record<string, number | string> = {};
    for (const [name, value] of Object.entries(row.combo)) {
      if (name !== parameter) at[name] = value;
    }
    const key = comboKey(at);
    const existing = grouped.get(key);
    if (existing === undefined) grouped.set(key, { at, rows: [row] });
    else existing.rows.push(row);
  }
  return [...grouped.values()];
}

function bindingOf(row: SweepComboResult): { requirements: string[]; gates: string[] } {
  return {
    requirements: row.requirements.filter((r) => r.status !== 'pass').map((r) => r.name),
    gates: Object.entries(row.gates).filter(([, verdict]) => verdict === 'fail').map(([gate]) => gate),
  };
}

interface BoundaryMessageInput {
  readonly parameter: string;
  readonly failureSide: 'below' | 'above';
  readonly value: number;
  readonly passValue: number;
  readonly failValue: number;
  readonly binding: readonly string[];
  readonly at: Readonly<Record<string, number | string>>;
  readonly tolerance: number;
  readonly exhausted: boolean;
}

function boundaryMessage(input: BoundaryMessageInput): string {
  const names = input.binding.length > 0 ? input.binding.join(', ') : 'the constraint';
  const at = Object.keys(input.at).length > 0
    ? ` with ${Object.entries(input.at).map(([k, v]) => `${k}=${formatValue(v)}`).join(', ')}`
    : '';
  if (input.exhausted) {
    return `${names} flips between ${formatValue(input.passValue)} and ${formatValue(input.failValue)} on ${input.parameter}${at}; boundary budget exhausted before ±${formatValue(input.tolerance)}, so this is an interval, not a proven edge.`;
  }
  return `${names} fails ${input.failureSide} ${formatValue(input.value)} ${input.parameter}${at}; binding: ${names}.`;
}

function buildCoverage(
  points: number,
  boundaries: readonly SweepBoundary[],
  search: { readonly evaluations: number },
): SweepCoverage {
  const boundaryCount = boundaries.length;
  const exhausted = boundaries.filter((b) => b.exhausted).length;
  return {
    points,
    boundaries: boundaryCount,
    boundaryEvaluations: search.evaluations,
    statement:
      `Checked at ${points} point${points === 1 ? '' : 's'} plus ${boundaryCount} boundar${boundaryCount === 1 ? 'y' : 'ies'}` +
      `${search.evaluations > 0 ? ` (${search.evaluations} bisection evaluation${search.evaluations === 1 ? '' : 's'})` : ''}; sampled, not a proof.` +
      `${exhausted > 0 ? ` ${exhausted} boundar${exhausted === 1 ? 'y' : 'ies'} exhausted the bisection budget.` : ''}`,
    proven: false,
  };
}

function numericValue(value: number | string | undefined): NumericValue | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function comboKey(combo: Readonly<Record<string, number | string>>): string {
  return JSON.stringify(Object.keys(combo).sort().map((key) => [key, combo[key]]));
}

function formatValue(value: number | string): string {
  if (typeof value === 'string') return value;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
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

function buildBudgetDiag(budget: number, tolerance: number): {
  code: DiagnosticCode;
  severity: 'warn';
  message: string;
} {
  const code: DiagnosticCode = 'kinematic.sweep-tolerance.boundary-budget-exhausted';
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    code,
    severity: 'warn',
    message:
      `Boundary bisection used its ${budget}-evaluation budget before closing every bracket to ±${formatValue(tolerance)}. ` +
      `The exhausted boundaries are reported as intervals. ${entry.hintTemplate}`,
  };
}
