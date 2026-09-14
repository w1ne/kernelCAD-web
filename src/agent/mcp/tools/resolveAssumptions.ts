// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/resolveAssumptions.ts
//
// MCP `resolve_assumptions` — reads a persisted `<model>.ledger.json`
// assumption ledger (written by `trace_from_image` / other reference-ingest
// paths), applies the agent's confirm/override resolutions, rewrites the
// file, and returns the updated ledger plus a `paramOverrides` map the
// agent feeds straight into `set_param`. Pure ledger logic lives in
// `../../vision/ledger`; this file is the file-IO + diagnostic wrapper.

import { readFile, writeFile } from 'node:fs/promises';
import {
  resolveAssumptions as resolveAssumptionsPure,
  type AssumptionLedger,
  type AssumptionResolutionInput,
} from '../../vision/ledger';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

export interface ResolveAssumptionsInput {
  /** Path to the `<model>.ledger.json` file written alongside the source. */
  ledgerPath: string;
  resolutions: AssumptionResolutionInput[];
}

export interface ResolveAssumptionsOutput {
  ok: boolean;
  ledger?: AssumptionLedger;
  paramOverrides: Record<string, unknown>;
  diagnostics: CompilerDiagnostic[];
}

function makeDiag(
  code: 'reference.assumptions.ledger-not-found' | 'reference.assumptions.unknown-resolution-id',
  severity: CompilerDiagnostic['severity'],
  message: string,
): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code,
    severity,
    message,
    hint: HINT_TEMPLATES[code].template,
    nextAction: NEXT_ACTIONS[code],
  };
}

/**
 * Apply resolutions to a persisted assumption ledger. Never throws — every
 * failure path emits a diagnostic and returns `ok: false`.
 */
export async function resolveAssumptionsTool(
  input: ResolveAssumptionsInput,
): Promise<ResolveAssumptionsOutput> {
  if (typeof input?.ledgerPath !== 'string' || input.ledgerPath.length === 0) {
    return {
      ok: false,
      paramOverrides: {},
      diagnostics: [
        makeDiag(
          'reference.assumptions.ledger-not-found',
          'error',
          'ledgerPath is missing or empty',
        ),
      ],
    };
  }

  let ledger: AssumptionLedger;
  try {
    const raw = await readFile(input.ledgerPath, 'utf8');
    ledger = JSON.parse(raw) as AssumptionLedger;
    if (!ledger || !Array.isArray(ledger.facts)) {
      throw new Error('parsed content is not an AssumptionLedger (missing `facts` array)');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      paramOverrides: {},
      diagnostics: [
        makeDiag(
          'reference.assumptions.ledger-not-found',
          'error',
          `could not read/parse ledger at ${input.ledgerPath}: ${msg}`,
        ),
      ],
    };
  }

  const resolutions = Array.isArray(input.resolutions) ? input.resolutions : [];
  const { ledger: updated, paramOverrides, unknownIds } = resolveAssumptionsPure(ledger, resolutions);

  await writeFile(input.ledgerPath, JSON.stringify(updated, null, 2) + '\n', 'utf8');

  const diagnostics: CompilerDiagnostic[] = [];
  if (unknownIds.length > 0) {
    diagnostics.push(
      makeDiag(
        'reference.assumptions.unknown-resolution-id',
        'warn',
        `resolution id(s) not found in ledger: ${unknownIds.join(', ')}`,
      ),
    );
  }

  return {
    ok: true,
    ledger: updated,
    paramOverrides,
    diagnostics,
  };
}
