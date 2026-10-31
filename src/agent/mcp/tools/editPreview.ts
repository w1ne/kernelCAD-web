// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// S6 — preview an edit against declared intent before writing it.
//
// `set_param({ preview: true })` (and any source-edit tool that wants the same
// answer) calls this module. It builds the baseline and the revised source in
// two scratch `buildModel` sessions, then reports:
//   - the same `diff_geometry` material delta the dedicated tool returns,
//   - the S2 ledger diff (flips, margin shrink/grow, added/removed entries),
//   - the S1 selectors that moved or re-bound.
//
// Read-only with respect to the active MCP session, revision state and all
// caches: it never calls `evaluateScriptTool`, never sets the active session,
// and never writes a source file.

import { evaluateAndBuildScript, withIntentLint, type EvaluateAndBuildResult } from '../../cli/commands/evaluate';
import {
  emptyLedger,
  type RequirementsLedger,
} from '../../../shared/intent/requirementRecord';
import {
  diffRequirementLedgers,
  type RequirementLedgerDiff,
} from '../../../shared/intent/requirementDiff';
import { diffSelectionBindings, type SelectionBindingChange } from '../../../kernel/naming/bindingDiff';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { SelectionRecord } from '../../../shared/intent/selectionRecord';
import {
  diffGeometrySides,
  sideFromBuiltModel,
  type DiffGeometryOutput,
  type SideSummary,
} from './diffGeometry';

export interface PreviewCodeEditInput {
  /** Source before the edit. */
  baselineCode: string;
  /** Source after the edit. Built in a scratch session; never written. */
  revisedCode: string;
}

export interface PreviewSideSummary {
  /** True when the script built (gate failures on a built model are not build failures). */
  buildOk: boolean;
  exitCode: number;
  featureCount: number;
  requirementsOk: boolean;
  requirements: RequirementsLedger;
  diagnostics: CompilerDiagnostic[];
}

export interface EditPreviewResult {
  preview: true;
  /** True when both sides built and the geometry + ledger diff could be computed. */
  ok: boolean;
  geometry?: Extract<DiffGeometryOutput, { ok: true }>;
  requirementsDiff?: RequirementLedgerDiff;
  bindings?: SelectionBindingChange[];
  before?: PreviewSideSummary;
  after?: PreviewSideSummary;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
  errorCode?: string;
}

function firstError(diagnostics: readonly CompilerDiagnostic[]): CompilerDiagnostic | undefined {
  return diagnostics.find((d) => d.severity === 'error');
}

/** `evaluateScriptTool`'s `didBuildSucceed`, without the viewer/session
 *  side effects. Gate and union errors are verdicts on a model that DID
 *  build; any other error means the build itself failed. */
function didBuildSucceed(built: EvaluateAndBuildResult): boolean {
  if (built.model === undefined) return false;
  const gateDiagnostics = new Set<unknown>([
    ...(built.dfmReport?.diagnostics ?? []),
    ...(built.feaReport?.diagnostics ?? []),
    ...(built.tubeReport?.diagnostics ?? []),
  ]);
  return built.model.diagnostics.every(
    (d) => d.severity !== 'error' || gateDiagnostics.has(d) || d.code.startsWith('union.'),
  );
}

function sideSummary(built: EvaluateAndBuildResult, buildOk: boolean): PreviewSideSummary {
  return {
    buildOk,
    exitCode: built.evaluation.exitCode,
    featureCount: built.evaluation.featureCount,
    requirementsOk: built.evaluation.requirements?.ok ?? true,
    requirements: built.evaluation.requirements ?? emptyLedger(),
    diagnostics: built.evaluation.diagnostics,
  };
}

function selectionsOf(built: EvaluateAndBuildResult): SelectionRecord[] {
  return built.evaluation.selections ?? [];
}

type PreviewSideBuild =
  | { ok: true; built: EvaluateAndBuildResult; side: SideSummary }
  | { ok: false; result: EditPreviewResult };

/** Build one side for the preview. A build failure is a failed preview; a
 *  gate/union verdict on a model that built is not. */
async function buildPreviewSide(
  code: string,
  label: 'baseline' | 'revised',
): Promise<PreviewSideBuild> {
  const built = await evaluateAndBuildScript({ code });
  const buildOk = didBuildSucceed(built);
  if (!buildOk || built.model === undefined) {
    const error = firstError(built.evaluation.diagnostics);
    return {
      ok: false,
      result: {
        preview: true,
        ok: false,
        diagnostics: withIntentLint(built.evaluation, code).diagnostics,
        error: error?.message ?? `the ${label} script did not build.`,
        ...(error?.code !== undefined ? { errorCode: error.code } : {}),
      },
    };
  }
  const side = sideFromBuiltModel(built.model);
  if (!side.ok) {
    return {
      ok: false,
      result: {
        preview: true,
        ok: false,
        error: `${label} geometry: ${side.error}`,
        ...(side.errorCode !== undefined ? { errorCode: side.errorCode } : {}),
        ...(side.diagnostics !== undefined ? { diagnostics: side.diagnostics } : {}),
      },
    };
  }
  return { ok: true, built, side: side.side };
}

/** Build both versions and diff them. The only process-global touched is
 *  `KERNELCAD_VALIDATE_DEFAULT`, which is saved and restored here because
 *  `evaluateAndBuildScript` sets it on first use. */
export async function previewCodeEdit(input: PreviewCodeEditInput): Promise<EditPreviewResult> {
  const hadValidateDefault = process.env.KERNELCAD_VALIDATE_DEFAULT !== undefined;
  try {
    const baseline = await buildPreviewSide(input.baselineCode, 'baseline');
    if (!baseline.ok) return baseline.result;
    const revised = await buildPreviewSide(input.revisedCode, 'revised');
    if (!revised.ok) return revised.result;

    const geometry = await diffGeometrySides(baseline.side, revised.side);
    if (!geometry.ok) {
      return {
        preview: true,
        ok: false,
        error: geometry.error,
        ...(geometry.errorCode !== undefined ? { errorCode: geometry.errorCode } : {}),
      };
    }

    const before = sideSummary(baseline.built, true);
    const afterEvaluation = withIntentLint(revised.built.evaluation, input.revisedCode);
    const after = { ...sideSummary(revised.built, true), diagnostics: afterEvaluation.diagnostics };
    return {
      preview: true,
      ok: true,
      geometry,
      requirementsDiff: diffRequirementLedgers(before.requirements, after.requirements),
      bindings: diffSelectionBindings(selectionsOf(baseline.built), selectionsOf(revised.built)),
      before,
      after,
      diagnostics: [
        ...before.diagnostics,
        ...after.diagnostics,
        ...(geometry.diagnostics ?? []),
      ],
    };
  } finally {
    if (!hadValidateDefault) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  }
}
