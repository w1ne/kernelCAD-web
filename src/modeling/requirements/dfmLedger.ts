// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Adapter: the existing dfmSpec report reports into the one requirements
// ledger. The ledger does not replace the DFM gate's diagnostics/exit code;
// it names the same measurements with status / measured / limit / margin.

import type { DfmCheckReport } from '../runtime/dfm/runDfmChecks';
import type { DfmSpecMetadata } from '../../shared/intent/dfmSpecRecord';
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
    source: 'dfm',
    status,
    measured,
    limit,
    margin,
    selections: [],
    ...(message !== undefined ? { message } : {}),
  };
}

/** Convert a DFM report into ledger entries: one per measured clearance pair,
 *  thin-wall part, declared channel and FDM part. Declared exemptions
 *  ('ignored' / 'mated' pairs) are not requirements in play and are skipped. */
function clearanceEntries(report: DfmCheckReport, spec: DfmSpecMetadata): RequirementLedgerEntry[] {
  if (spec.minClearance === undefined) return [];
  const minClearance = spec.minClearance;
  const out: RequirementLedgerEntry[] = [];
  for (const pair of report.clearance) {
    if (pair.status === 'ignored' || pair.status === 'mated') continue;
    const name = `dfm.clearance.${pair.a}~${pair.b}`;
    if (pair.status === 'unknown') {
      out.push(entry(name, 'not-evaluated', null, minClearance, null,
        `${name}: the kernel could not measure the gap between '${pair.a}' and '${pair.b}'.`));
      continue;
    }
    const measured = pair.status === 'interfering' ? 0 : pair.distanceMm;
    const margin = measured - minClearance;
    const status = pair.status === 'ok' ? 'pass' : 'fail';
    out.push(entry(name, status, measured, minClearance, margin,
      status === 'fail'
        ? `${name} failed: '${pair.a}' and '${pair.b}' are ${measured.toFixed(3)} mm apart, need ${minClearance} mm${pair.status === 'interfering' ? ' (overlapping)' : ''}.`
        : undefined));
  }
  return out;
}

function wallEntries(report: DfmCheckReport, spec: DfmSpecMetadata): RequirementLedgerEntry[] {
  if (spec.minWall === undefined) return [];
  const minWall = spec.minWall;
  return report.walls.map(({ part, result }) => {
    const measured = Number.isFinite(result.thinnestMm) ? result.thinnestMm : null;
    const name = `dfm.minWall.${part}`;
    if (measured === null) {
      return entry(name, 'not-evaluated', null, minWall, null,
        `${name}: no wall ray hit on '${part}', so the wall thickness is unmeasured.`);
    }
    const margin = measured - minWall;
    return entry(name, margin >= -eps ? 'pass' : 'fail', measured, minWall, margin,
      margin < -eps
        ? `${name} failed: thinnest wall ${measured.toFixed(3)} mm, need ${minWall} mm.`
        : undefined);
  });
}

function channelEntry(
  name: string,
  sealed: boolean,
  openings: number,
  result: DfmCheckReport['voids'][number]['result'],
): RequirementLedgerEntry {
  if (sealed) {
    const detected = result.detectedSealedVoidCount;
    return entry(name, detected > 0 ? 'pass' : 'not-evaluated', detected, 1, detected - 1,
      detected > 0 ? undefined : `${name}: declared sealed, but no sealed cavity was detected.`);
  }
  const found = result.channelOpenings?.found ?? null;
  if (found === null) return entry(name, 'not-evaluated', null, openings, null, `${name}: mouth counting did not run.`);
  const margin = -Math.abs(found - openings);
  return entry(name, found === openings ? 'pass' : 'fail', found, openings, margin,
    found === openings ? undefined : `${name} failed: found ${found} mouth(s), declared ${openings}.`);
}

function voidEntries(report: DfmCheckReport, spec: DfmSpecMetadata): RequirementLedgerEntry[] {
  const out: RequirementLedgerEntry[] = [];
  for (const { part, result } of report.voids) {
    for (const channel of spec.channels.filter(c => c.part === part)) {
      out.push(channelEntry(`dfm.voids.${part}.${channel.name}`, channel.sealed, channel.openings, result));
    }
    if (result.sealedVoids.length > 0) {
      const name = `dfm.voids.${part}.undeclared`;
      out.push(entry(name, 'fail', result.sealedVoids.length, 0, -result.sealedVoids.length,
        `${name} failed: ${result.sealedVoids.length} undeclared sealed void(s).`));
    }
  }
  return out;
}

function fdmEntries(report: DfmCheckReport): RequirementLedgerEntry[] {
  return (report.fdm ?? []).map(({ part, result }) => {
    const name = `dfm.fdm.${part}`;
    return entry(name, result.verdict === 'pass' ? 'pass' : 'fail',
      result.orientation.unsupportedAreaMm2, result.settings.maxOverhangDeg, null,
      result.verdict === 'fail'
        ? `${name} failed: unsupported area ${result.orientation.unsupportedAreaMm2.toFixed(2)} mm^2 at the declared build direction.`
        : undefined);
  });
}

export function dfmRequirementEntries(
  report: DfmCheckReport | undefined,
  spec: DfmSpecMetadata | undefined,
): RequirementLedgerEntry[] {
  if (report === undefined || spec === undefined) return [];
  return [
    ...clearanceEntries(report, spec),
    ...wallEntries(report, spec),
    ...voidEntries(report, spec),
    ...fdmEntries(report),
  ];
}
