// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Words and tone of the model's motion badge. Kept apart from the component
// so the wording can change in one place.

import type { MechanismVerdictSummary } from '../../../modeling/runtime/mechanismVerdict';

export type MotionBadgeTone = 'ok' | 'neutral' | 'danger';

export interface MotionBadgeModel {
    readonly tone: MotionBadgeTone;
    readonly label: 'Motion checked' | 'Motion not checked' | 'Mechanism broken';
    /** First tooltip line: the plain statement (a failure count when broken). */
    readonly statement: string;
    /** Further tooltip lines: more skipped checks, or every failing joint. */
    readonly lines: readonly string[];
}

/** Null for a static model: no moving joints and no motion intent, no badge. */
export function motionBadgeModel(summary: MechanismVerdictSummary | null | undefined): MotionBadgeModel | null {
    if (!summary) return null;
    if (summary.verdict === 'broken') {
        return {
            tone: 'danger',
            label: 'Mechanism broken',
            // The statement repeats the first failure; list every failure once instead.
            statement: summary.failures.length > 0
                ? `Mechanism broken: ${summary.failures.length} failure${summary.failures.length === 1 ? '' : 's'}`
                : summary.statement,
            lines: summary.failures.map((f) => (f.joint ? `Joint '${f.joint}': ${f.reason}` : f.reason)),
        };
    }
    if (summary.verdict === 'unverified') {
        return {
            tone: 'neutral',
            label: 'Motion not checked',
            // The statement names the first skipped check; list the rest.
            statement: summary.statement,
            lines: summary.skipped.slice(1).map((s) => `Also skipped: ${s}`),
        };
    }
    return {
        tone: 'ok',
        label: 'Motion checked',
        // The statement lists every check that ran and the first range not checked.
        statement: summary.statement,
        lines: summary.skipped.slice(1).map((s) => `Also not checked: ${s}`),
    };
}

/** Failing joint or part name → reason, for marking rows of the scene list. */
export function brokenRowReasons(summary: MechanismVerdictSummary | null | undefined): ReadonlyMap<string, string> {
    const out = new Map<string, string>();
    if (summary?.verdict !== 'broken') return out;
    for (const f of summary.failures) {
        for (const id of [f.joint, f.part]) {
            if (id && !out.has(id)) out.set(id, f.reason);
        }
    }
    return out;
}
