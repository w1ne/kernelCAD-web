// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Adapter: modelled tool reach reports into the one requirements ledger. A
// swept envelope is a geometric measurement, so clear/blocked is a real
// pass/fail. Press/snap fits are declared, not simulated: they enter the
// ledger as `not-evaluated`, never as a forged pass.

import type { AssemblyPathReport } from '../runtime/assemblyPath';
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
