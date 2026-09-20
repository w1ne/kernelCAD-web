// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/scriptEvaluation.ts
//
// The shared, script-running half of `evaluateAndBuildScript`: build the model
// from `{ code }` or `{ file }`, run the agent-parts-discipline check and the
// opt-in DFM/FEA gates, and project the result into an exit code + diagnostics.
//
// It lives in composition (not agent) for two reasons:
//   - the sweep-tolerance evaluator (`sweepEvaluator.ts`) is a composition
//     concern and must not import the agent CLI tree;
//   - `runScriptCore`/`buildModel` must not import the evaluator back, so the
//     evaluation core sits above them, not inside modeling.
//
// The CLI (`src/agent/cli/commands/evaluate.ts`) delegates here for `{ code }`
// and keeps its `node:fs` CLI wiring, envelope review, and trace projection.
import type { CompilerDiagnostic } from '../shared/diagnostics/diagnostic';
import { withNextActions } from '../shared/diagnostics/diagnostic';
import {
  FILE_READ_CODE, FILE_READ_HINT, fileReadErrorMessage,
} from '../shared/diagnostics/fileReadError';
import { kernelErrorToDiagnostic } from '../shared/diagnostics/kernelErrorToDiagnostic';
import { buildModel, buildModelFromFile, type BuiltModel } from '../modeling/buildModel';
import type { ScriptApiFactory } from '../modeling/runtime/runScriptCore';
import {
  runDfmChecksOnModel,
  type DfmCheckReport,
} from '../modeling/runtime/dfm/runDfmChecks';
import {
  runFeaGateOnModel,
  type FeaGateReport,
} from '../modeling/runtime/fea/runFeaGate';
import { detectUnstructuredBodies } from '../modeling/validation/unstructuredBodies';
import type { SweepEvaluator } from '../kinematic/sweepTolerance';
import { createScriptApi } from './scriptApi';

export interface EvaluateInput {
  file?: string;
  code?: string;
  /** Absolute directory to resolve relative imports/assets against when
   *  evaluating an inline `code` string. Unused on the `file` path. */
  scriptDir?: string;
}

export interface EvaluateOptions {
  /** Script-API factory for the evaluated script. Defaults to the composed
   *  factory (`createScriptApi` + `defaultSweepEvaluator`), so a script that
   *  calls `kc.kinematic.sweepTolerance` works on every evaluate path. */
  apiFactory?: ScriptApiFactory;
}

export interface FeatureHealthEntry {
  featureId: string;
  status: 'warning' | 'error';
}

/** Project the RecomputeEngine health map down to the lean non-healthy list.
 *  Returns `[]` when every feature is healthy. */
export function nonHealthyFeatures(
  health: ReadonlyMap<string, 'healthy' | 'warning' | 'error'>,
): FeatureHealthEntry[] {
  const out: FeatureHealthEntry[] = [];
  for (const [featureId, status] of health) {
    if (status === 'warning' || status === 'error') out.push({ featureId, status });
  }
  return out;
}

export interface EvaluateResult {
  exitCode: number;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
  /** Per-feature health degradations from the recompute pass — ONLY the
   *  features that fell back to a passthrough (`warning`) or failed to lower
   *  (`error`). Empty when every feature is healthy. Lets an agent see WHICH
   *  feature degraded even when `exitCode` is still 0 (e.g. a gated-off
   *  upstream that turned a downstream feature into a no-op passthrough).
   *  A full build always populates this (possibly `[]`); a dry run leaves it
   *  `[]` since no geometry is lowered. */
  featureHealth: FeatureHealthEntry[];
}

export interface EvaluateAndBuildResult {
  evaluation: EvaluateResult;
  model?: BuiltModel;
  /** DFM gate report when the script declares `dfmSpec(...)` and the build
   *  had no fatal diagnostics. Undefined otherwise — the gates are opt-in.
   *  Its diagnostics are already merged into `evaluation.diagnostics`. */
  dfmReport?: DfmCheckReport;
  /** Structural gate report when the script declares a `feaStudy(...)` with a
   *  `minSafetyFactor` and the build had no fatal diagnostics. Undefined
   *  otherwise. Its diagnostics are already merged into
   *  `evaluation.diagnostics`. */
  feaReport?: FeaGateReport;
}

/**
 * Apply the evaluate-command environment defaults before the user script is
 * loaded. Currently flips `Assembly.solvedModel`'s validate gate default to
 * `'error'` (read by T9) so harness runs trip on invalid assemblies rather
 * than silently emitting warnings.
 *
 * Idempotent: a caller-supplied `KERNELCAD_VALIDATE_DEFAULT` (including
 * `warn` / `off`) is preserved so users can still opt out with
 * `KERNELCAD_VALIDATE_DEFAULT=warn npx kernelcad evaluate ...`.
 *
 * Per spec 2026-05-11-assembly-mates-validator-design.md §"Validity gate"
 * (T10 of the v0.6 assembly mates plan).
 */
export function applyEvaluateDefaults(): void {
  if (process.env.KERNELCAD_VALIDATE_DEFAULT === undefined) {
    process.env.KERNELCAD_VALIDATE_DEFAULT = 'error';
  }
}

/** Build the model for an evaluate input, or return the failure evaluation
 *  that should be surfaced verbatim. File-read faults get their dedicated
 *  diagnostic; every other build throw is projected through
 *  `kernelErrorToDiagnostic`. */
async function buildModelForInput(
  input: EvaluateInput,
  apiFactory: ScriptApiFactory,
): Promise<{ model: BuiltModel } | { evaluation: EvaluateResult }> {
  try {
    const model = input.code !== undefined
      ? await buildModel(
          {
            code: input.code,
            fileName: input.file ?? '<inline>',
            ...(input.scriptDir !== undefined ? { scriptDir: input.scriptDir } : {}),
          },
          { apiFactory },
        )
      : await buildModelFromFile({ file: input.file! }, { apiFactory });
    return { model };
  } catch (e) {
    if (isFileReadError(e)) {
      return { evaluation: fileReadEvaluation(e) };
    }
    const diag = kernelErrorToDiagnostic(e);
    return {
      evaluation: { exitCode: 1, featureCount: 0, diagnostics: [diag], featureHealth: [] },
    };
  }
}

/** Run the opt-in gates over a build that had no fatal diagnostics.
 *
 *  W3 DFM enforcement: when the script declares dfmSpec(...), run the
 *  declared gates and merge their diagnostics into the model's. This one
 *  hook covers CLI evaluate, MCP evaluate_script (delegates here), and the
 *  eval harness. Zero cost for scripts without the record (findDfmSpec is
 *  a records scan returning undefined). Skipped after fatal build
 *  diagnostics — the underlying failure surfaces first.
 *
 *  Structural enforcement: same seam, same opt-in shape as the DFM gate.
 *  Only studies that declare `minSafetyFactor` run here — a study without
 *  one is a report you fetch with `run_fea`, not a gate. */
async function runOptInGates(
  model: BuiltModel,
  fatal: boolean,
): Promise<{ dfmReport?: DfmCheckReport; feaReport?: FeaGateReport }> {
  let dfmReport: DfmCheckReport | undefined;
  if (!fatal) {
    dfmReport = await runDfmChecksOnModel(model);
    if (dfmReport) model.diagnostics.push(...dfmReport.diagnostics);
  }

  let feaReport: FeaGateReport | undefined;
  if (!fatal) {
    feaReport = await runFeaGateOnModel(model);
    if (feaReport) model.diagnostics.push(...feaReport.diagnostics);
  }

  return {
    ...(dfmReport !== undefined ? { dfmReport } : {}),
    ...(feaReport !== undefined ? { feaReport } : {}),
  };
}

export async function evaluateAndBuildScript(
  input: EvaluateInput,
  opts?: EvaluateOptions,
): Promise<EvaluateAndBuildResult> {
  // T10: harness-style evaluation flips the `solvedModel` validate gate to
  // `'error'` (read by T9 in `Assembly.solvedModel`). Done before script
  // load so the env var is visible to anything user-script transitively
  // touches. Does not override a caller-supplied value.
  applyEvaluateDefaults();

  if (input.code === undefined && input.file === undefined) {
    return { evaluation: invalidArgsEvaluation() };
  }

  const apiFactory = opts?.apiFactory ?? composedApiFactory;
  const built = await buildModelForInput(input, apiFactory);
  if ('evaluation' in built) return { evaluation: built.evaluation };
  const model = built.model;
  const fatal = model.diagnostics.some(d => d.severity === 'error');

  // Agent-parts-discipline: flag multi-body models authored as loose
  // top-level bodies instead of named `assembly().part(...)`. Runs on a
  // clean build only — a broken build surfaces its own failure first.
  // Emitting here (the shared producer for `evaluate_script` AND the
  // `/__kernelcad/review` payload, plus the CLI) surfaces the info
  // diagnostic on every authoring surface from a single seam, and — unlike
  // the assembly validator — runs for NON-assembly scripts too.
  if (!fatal) {
    model.diagnostics.push(
      ...detectUnstructuredBodies({ returnValue: model.returnValue, code: model.code }),
    );
  }

  const gates = await runOptInGates(model, fatal);

  const fatalAfterGates = model.diagnostics.some(d => d.severity === 'error');
  return {
    evaluation: {
      exitCode: fatalAfterGates ? 1 : 0,
      featureCount: model.records.length,
      diagnostics: withNextActions(model.diagnostics),
      featureHealth: nonHealthyFeatures(model.health),
    },
    model,
    ...gates,
  };
}

export async function evaluateScript(input: EvaluateInput): Promise<EvaluateResult> {
  return (await evaluateAndBuildScript(input)).evaluation;
}

/** The composed script-API factory: modeling's API plus the kinematic
 *  namespace bound to the sweep evaluator below. Every composed facade
 *  (`runScript`, `buildModel`) and every `evaluateAndBuildScript` call uses
 *  it, so `kc.kinematic.sweepTolerance` works wherever a script can run. */
export const composedApiFactory: ScriptApiFactory = (ctx) =>
  createScriptApi(ctx, defaultSweepEvaluator);

/** Script-evaluation implementation injected into `sweepTolerance`. This
 *  module owns it because it also owns `evaluateAndBuildScript`; kinematic
 *  only declares the `SweepEvaluator` seam, so it never imports composition. */
export const defaultSweepEvaluator: SweepEvaluator = {
  evaluate: (code) => evaluateAndBuildScript({ code }),
};

export function invalidArgsEvaluation(): EvaluateResult {
  return {
    exitCode: 2, featureCount: 0, featureHealth: [],
    diagnostics: withNextActions([{
      target: 'export-occt', code: 'cli.invalid-args', severity: 'error',
      message: 'evaluateScript: must provide either { file } or { code }.',
      hint: 'Pass --file <path> on the CLI, or { file } / { code } when calling programmatically.',
    }]),
  };
}

export function fileReadEvaluation(e: unknown): EvaluateResult {
  return {
    exitCode: 2, featureCount: 0, featureHealth: [],
    diagnostics: withNextActions([{
      target: 'export-occt', code: FILE_READ_CODE, severity: 'error',
      message: fileReadErrorMessage(e),
      hint: FILE_READ_HINT,
    }]),
  };
}

export function isFileReadError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as { code?: unknown }).code === 'string' &&
    ['ENOENT', 'EACCES', 'EPERM', 'EISDIR', 'ENOTDIR'].includes((e as { code: string }).code)
  );
}
