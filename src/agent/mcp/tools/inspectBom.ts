// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/inspectBom.ts
//
// Reader for inspect({ of: 'bom' }). Mirrors inspectAssembly.ts's
// evaluate-then-select-assembly shape; the actual computation lives in the
// shared `computeBom` (src/agent/script-runtime/bom.ts) so `inspect` and
// `export({ format: 'bom-csv' | 'bom-json' })` report identical numbers.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { computeBom, type BomRow, type BomTotals } from '../../script-runtime/bom';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';

export interface InspectBomInput {
  file?: string;
  code?: string;
  assembly?: string;
}

export type InspectBomOutput =
  | {
      ok: true;
      featureCount: number;
      assembly: string;
      rows: BomRow[];
      totals: BomTotals;
      diagnostics: CompilerDiagnostic[];
    }
  | {
      ok: false;
      featureCount: number;
      error: string;
    };

export async function inspectBomTool(input: InspectBomInput): Promise<InspectBomOutput> {
  const { evaluation, model } = await evaluateAndBuildScript(input as EvaluateInput);
  if (evaluation.exitCode !== 0 || !model) {
    return {
      ok: false,
      featureCount: evaluation.featureCount,
      error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.',
    };
  }

  const assemblies = model.session.assemblies as Map<string, Assembly>;
  const arm = input.assembly !== undefined
    ? assemblies.get(input.assembly)
    : assemblies.values().next().value;
  if (arm === undefined) {
    return {
      ok: false,
      featureCount: evaluation.featureCount,
      error: input.assembly
        ? `inspect({ of: 'bom' }): assembly '${input.assembly}' not found.`
        : "inspect({ of: 'bom' }): no assembly captured by the script.",
    };
  }

  const bom = await computeBom(arm, model.session);
  return {
    ok: true,
    featureCount: evaluation.featureCount,
    assembly: arm.name,
    rows: bom.rows,
    totals: bom.totals,
    diagnostics: withNextActions(bom.diagnostics),
  };
}
