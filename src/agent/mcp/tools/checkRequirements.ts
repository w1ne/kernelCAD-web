// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// verify({ check: 'requirements' }) and the call-time `requirements` lane:
// evaluate the script, run every script `require()` plus the external
// requirements, and return the one ledger. This is how an eval task grades a
// build from requirements alone, with no expert solution geometry.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { ExternalRequirement, RequirementsLedger } from '../../../shared/intent/requirementRecord';
import { invalidArgsText } from '../../../shared/intent/invalidArgs';

export interface CheckRequirementsInput extends Omit<EvaluateInput, 'requirements'> {
  requirements?: readonly ExternalRequirement[];
}

export interface CheckRequirementsOutput {
  ok: boolean;
  requirements: RequirementsLedger;
  featureCount: number;
  diagnostics?: unknown[];
}

const EMPTY_LEDGER: RequirementsLedger = {
  ok: true,
  entries: [],
  summary: { pass: 0, fail: 0, notEvaluated: 0 },
};

function normalizeExternal(value: unknown): ExternalRequirement[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is ExternalRequirement =>
    typeof v === 'object' && v !== null
    && typeof (v as { name?: unknown }).name === 'string'
    && typeof (v as { predicate?: unknown }).predicate === 'object'
    && (v as { predicate?: unknown }).predicate !== null);
}

export async function checkRequirementsTool(input: CheckRequirementsInput): Promise<CheckRequirementsOutput> {
  const { requirements, ...evaluateInput } = input;
  if (evaluateInput.file === undefined && evaluateInput.code === undefined) {
    return {
      ok: false,
      requirements: EMPTY_LEDGER,
      featureCount: 0,
      diagnostics: [{
        ...invalidArgsText({
          api: "verify({ check: 'requirements' })",
          path: 'file | code',
          gotText: 'nothing',
          requires: 'a script to build',
          example: "verify({ check: 'requirements', code: 'return box(10, 10, 10);', requirements: [...] })",
        }),
        code: 'cli.invalid-args',
        severity: 'error',
      }],
    };
  }
  const external = normalizeExternal(requirements);
  const built = await evaluateAndBuildScript({
    ...(evaluateInput.file !== undefined ? { file: evaluateInput.file } : {}),
    ...(evaluateInput.code !== undefined ? { code: evaluateInput.code } : {}),
    ...(evaluateInput.baseline !== undefined ? { baseline: evaluateInput.baseline } : {}),
    ...(external.length > 0 ? { requirements: external } : {}),
  });
  const ledger = built.evaluation.requirements ?? EMPTY_LEDGER;
  return {
    ok: ledger.ok && built.evaluation.exitCode === 0,
    requirements: ledger,
    featureCount: built.evaluation.featureCount,
    diagnostics: built.evaluation.diagnostics,
  };
}
