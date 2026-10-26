// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Adapter: mechanical intent diagnostics report into the one requirements
// ledger. Each declared intent gets one entry; its measured/limit fields stay
// null because these gates are structural contracts, not numeric bands.

import type { MechanicalIntentDiagnostic } from '../mates/mechanicalIntent';
import type { RequirementLedgerEntry } from '../../shared/intent/requirementRecord';

export function mechanicalRequirementEntries(
  diagnostics: readonly MechanicalIntentDiagnostic[],
  checkedIntentNames?: readonly string[],
): RequirementLedgerEntry[] {
  const names = new Set<string>([
    ...(checkedIntentNames ?? []),
    ...diagnostics.map(d => d.intentName),
  ]);
  const entries: RequirementLedgerEntry[] = [];
  for (const name of names) {
    const failures = diagnostics.filter(d => d.intentName === name);
    entries.push({
      name: `mechanical.${name}`,
      source: 'mechanical',
      status: failures.length === 0 ? 'pass' : 'fail',
      measured: null,
      limit: null,
      margin: null,
      selections: [],
      ...(failures.length > 0
        ? { message: failures.map(d => `${d.code}: ${d.message}`).join(' ') }
        : {}),
    });
  }
  return entries;
}
