// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { reviewClearanceRange, type ClearanceRangeReport } from '../../../modeling/mates/clearanceRange';
import { pairKey } from '../../../modeling/runtime/detectInterferences';
import { findDfmSpec } from '../../../modeling/runtime/dfm/runDfmChecks';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface CheckClearanceRangeInput extends EvaluateInput {
  /** Assembly name when the script defines more than one. */
  assembly?: string;
  /** Planned clearance (mm) for movable mate pairs; overrides dfmSpec minClearance. */
  min_clearance_mm?: number;
  /** Samples per limited mate (min, interior..., max). Default 5. */
  samples_per_mate?: number;
}

export type CheckClearanceRangeOutput =
  | (ClearanceRangeReport & { source: 'local'; assembly: string })
  | { ok: false; source: 'local'; error: string; errorCode?: string };

const DEFAULT_SAMPLES_PER_MATE = 5;

/** verify({ check: 'clearance-range' }): per mating pair, actual vs planned
 *  clearance at rest and across the declared joint range. */
export async function checkClearanceRangeTool(input: CheckClearanceRangeInput): Promise<CheckClearanceRangeOutput> {
  const invalid = validateInput(input);
  if (invalid !== undefined) return { ok: false, source: 'local', error: invalid, errorCode: 'feature.invalid-args' };
  try {
    const { evaluation, model } = await evaluateAndBuildScript(input);
    if (evaluation.exitCode !== 0 || !model) {
      return { ok: false, source: 'local', error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.', errorCode: evaluation.diagnostics[0]?.code };
    }
    const assemblies = model.session.assemblies as Map<string, Assembly>;
    const arm = input.assembly !== undefined ? assemblies.get(input.assembly) : assemblies.values().next().value;
    if (arm === undefined) {
      return {
        ok: false,
        source: 'local',
        error: input.assembly !== undefined
          ? `verify clearance-range: assembly '${input.assembly}' not found.`
          : 'verify clearance-range: no assembly captured by the script.',
        errorCode: 'feature.invalid-args',
      };
    }
    const dfm = findDfmSpec(model.records);
    const minClearanceMm = input.min_clearance_mm ?? dfm?.minClearance;
    const report = await reviewClearanceRange(arm, {
      loweredScene: model.rootShape ?? model.tailShape,
      minClearanceMm,
      samplesPerMate: input.samples_per_mate ?? DEFAULT_SAMPLES_PER_MATE,
      ignoredPairs: new Set((dfm?.ignore ?? []).map(([a, b]) => pairKey(a, b))),
    });
    if (report.rows.length === 0) {
      return {
        ok: false,
        source: 'local',
        error: `verify clearance-range: assembly '${arm.name}' has no planned clearance. Declare solvedModel({}, { clearances: [{ parts: [a, b], minMm }] }), dfmSpec({ minClearance }), or pass min_clearance_mm for its movable mate pairs.`,
        errorCode: 'feature.invalid-args',
      };
    }
    return { ...report, source: 'local', assembly: arm.name };
  } catch (error) {
    const diagnostic = kernelErrorToDiagnostic(error);
    return { ok: false, source: 'local', error: diagnostic.message, errorCode: diagnostic.code };
  }
}

function validateInput(input: CheckClearanceRangeInput): string | undefined {
  const min = input.min_clearance_mm;
  if (min !== undefined && !(typeof min === 'number' && Number.isFinite(min) && min >= 0)) {
    return `verify clearance-range: min_clearance_mm must be a finite number >= 0; got ${JSON.stringify(min)}.`;
  }
  const samples = input.samples_per_mate;
  if (samples !== undefined && !(Number.isInteger(samples) && samples >= 1 && samples <= 64)) {
    return `verify clearance-range: samples_per_mate must be an integer from 1 to 64; got ${JSON.stringify(samples)}.`;
  }
  return undefined;
}
