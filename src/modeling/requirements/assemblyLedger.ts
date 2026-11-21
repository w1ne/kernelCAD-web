// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Adapter: modelled tool reach reports into the one requirements ledger. A
// swept envelope is a geometric measurement, so clear/blocked is a real
// pass/fail. Press/snap fits are declared, not simulated: they enter the
// ledger as `not-evaluated`, never as a forged pass.

import type { AssemblyPathReport } from '../runtime/assemblyPath';
import type { ClearanceRangeReport, ClearanceRangeRow } from '../mates/clearanceRange';
import type { RequirementLedgerEntry } from '../../shared/intent/requirementRecord';

/** Convert assembly-path tool reach and forced-fit findings into ledger
 *  entries. Clear/blocked pairs come only from envelopes that were modelled;
 *  an unmodelled tool adds nothing. */
export function assemblyRequirementEntries(report: AssemblyPathReport): RequirementLedgerEntry[] {
    const entries: RequirementLedgerEntry[] = [];
    for (const finding of report.toolReach ?? []) {
        const name = `assembly.toolReach.${finding.fastener}`;
        entries.push({
            name,
            source: 'assembly',
            status: finding.status === 'clear' ? 'pass' : 'fail',
            measured: finding.status === 'clear' ? 0 : 1,
            limit: 0,
            margin: finding.status === 'clear' ? 0 : -1,
            selections: [],
            message: finding.status === 'tool-blocked'
                ? `${name} failed: the ${finding.tool.label ?? finding.tool.kind} envelope cannot reach '${finding.fastener}'; blocked by ${finding.blockers.join(', ')}.`
                : undefined,
        });
    }
    for (const forced of report.sequence?.requiresForce ?? []) {
        const name = `assembly.requiresForce.${forced.part}`;
        entries.push({
            name,
            source: 'assembly',
            status: 'not-evaluated',
            measured: null,
            limit: null,
            margin: null,
            selections: [],
            message: `${name}: declared ${forced.kind} fit; insertion force and deformation are not simulated by the rigid planner.`,
        });
    }
    return entries;
}

/** Convert a clearance-range report into ledger entries: one per pair and
 *  pose set (rest, range). An unknown row is `not-evaluated`, never a pass. */
export function clearanceRangeRequirementEntries(report: ClearanceRangeReport): RequirementLedgerEntry[] {
    return report.rows.map(clearanceRangeEntry);
}

function clearanceRangeEntry(row: ClearanceRangeRow): RequirementLedgerEntry {
    const name = `assembly.clearance.${row.at}.${row.a}~${row.b}`;
    const where = row.worstSample !== undefined ? ` at ${row.worstSample}` : '';
    if (row.status === 'unknown' || row.actual === null) {
        return {
            name,
            source: 'assembly',
            status: 'not-evaluated',
            measured: row.actual,
            limit: row.planned,
            margin: null,
            selections: [],
            message: `${name}: ${row.reason ?? `${row.measuredSamples} of ${row.totalSamples} samples measured`}.`,
        };
    }
    return {
        name,
        source: 'assembly',
        status: row.status,
        measured: row.actual,
        limit: row.planned,
        margin: row.actual - row.planned,
        selections: [],
        ...(row.status === 'fail'
            ? { message: `${name} failed: '${row.a}' and '${row.b}' are ${row.actual.toFixed(3)} mm apart${where}, need ${row.planned} mm.` }
            : {}),
    };
}
