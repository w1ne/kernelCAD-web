// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Adapter: a gated feaStudy.minSafetyFactor reports into the one requirements
// ledger. Studies without a declared minimum remain reports and add nothing.

import type { FeaGateReport } from '../runtime/fea/runFeaGate';
import type { FeaSummary } from '../../kernel/fea/types';
import type { RequirementLedgerEntry } from '../../shared/intent/requirementRecord';

const eps = 1e-9;

function entry(
  name: string,
  status: RequirementLedgerEntry['status'],
  measured: RequirementLedgerEntry['measured'],
  limit: RequirementLedgerEntry['limit'],
  margin: number | null,
  message?: string,
): RequirementLedgerEntry {
  return {
    name,
    source: 'fea',
    status,
    measured,
    limit,
    margin,
    selections: [],
    ...(message !== undefined ? { message } : {}),
  };
}

export function feaRequirementEntries(report: FeaGateReport | undefined): RequirementLedgerEntry[] {
  if (report === undefined) return [];
  const entries: RequirementLedgerEntry[] = [];
  const byStudy = new Map<string, FeaSummary>(report.summaries.map(s => [s.study, s]));
  for (const summary of report.summaries) {
    const required = summary.minSafetyFactorRequired;
    if (required === undefined) continue;
    const margin = summary.minSafetyFactor - required;
    entries.push(entry(
      `fea.${summary.study}.minSafetyFactor`,
      margin >= -eps ? 'pass' : 'fail',
      summary.minSafetyFactor,
      required,
      margin,
      margin < -eps
        ? `fea.${summary.study}.minSafetyFactor failed: measured ${summary.minSafetyFactor.toFixed(2)}, need ${required} (peak ${summary.maxVonMisesMPa.toFixed(1)} MPa).`
        : undefined,
    ));
  }
  // A gated study the gate skipped (KERNELCAD_FEA_GATE=off) or that produced
  // no summary is UNVERIFIED, never a pass.
  for (const skipped of report.skipped) {
    if (byStudy.has(skipped)) continue;
    entries.push(entry(`fea.${skipped}.minSafetyFactor`, 'not-evaluated', null, null, null,
      `fea.${skipped}.minSafetyFactor was not evaluated: the gate was skipped.`));
  }
  return entries;
}
