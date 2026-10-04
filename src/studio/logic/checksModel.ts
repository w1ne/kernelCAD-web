// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure model behind the inspector Checks tab: one list of findings from the
// validator diagnostics, the mechanism verdict and the interference channel,
// each with a severity and a category. The tab badge and the tab body read
// the same numbers.

import type { ValidatorDiagnostic } from '../../modeling/mates/validator';
import { jointContactCapMm3 } from '../../modeling/runtime/jointContactCap';
import type { StudioRecomputeResult } from '../types';

export type CheckSeverity = ValidatorDiagnostic['severity'];

export type CheckCategory = 'mechanism' | 'assembly' | 'manufacturing' | 'model';

export const CHECK_CATEGORY_LABEL: Readonly<Record<CheckCategory, string>> = {
    mechanism: 'Mechanism',
    assembly: 'Assembly',
    manufacturing: 'Manufacturing',
    model: 'Model',
};

export const CHECK_SEVERITY_LABEL: Readonly<Record<CheckSeverity, string>> = {
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
};

/** Which group a diagnostic code belongs to, from its dotted prefix. */
export function checkCategory(code: string): CheckCategory {
    if (code.startsWith('mechanism.') || code.startsWith('kinematic.')) return 'mechanism';
    if (code.startsWith('assembly.')) return 'assembly';
    if (code.startsWith('dfm.') || code.startsWith('manufactur')) return 'manufacturing';
    return 'model';
}

export function severityRank(severity: CheckSeverity): number {
    switch (severity) {
        case 'error':
            return 3;
        case 'warning':
            return 2;
        case 'info':
            return 1;
    }
}

export interface CheckGroup {
    readonly category: CheckCategory;
    readonly severity: CheckSeverity;
    readonly diagnostics: readonly ValidatorDiagnostic[];
}

/**
 * Diagnostics grouped by category. Groups with the worst finding come first;
 * inside a group, errors come before warnings before info. The sort is
 * stable, so equal findings keep the validator's order.
 */
export function groupChecks(diagnostics: readonly ValidatorDiagnostic[]): CheckGroup[] {
    const byCategory = new Map<CheckCategory, ValidatorDiagnostic[]>();
    for (const d of diagnostics) {
        const category = checkCategory(d.code);
        const list = byCategory.get(category);
        if (list == null) byCategory.set(category, [d]);
        else list.push(d);
    }
    const groups = [...byCategory.entries()].map(([category, list]): CheckGroup => {
        const sorted = [...list].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
        return { category, severity: sorted[0]!.severity, diagnostics: sorted };
    });
    const order: CheckCategory[] = ['mechanism', 'assembly', 'manufacturing', 'model'];
    return groups.sort(
        (a, b) =>
            severityRank(b.severity) - severityRank(a.severity) ||
            order.indexOf(a.category) - order.indexOf(b.category),
    );
}

export interface InterferenceFinding {
    readonly a: string;
    readonly b: string;
    readonly volumeMm3: number;
}

/**
 * Interfering part pairs above the contact-noise cap that no validator
 * diagnostic already reports. The status bar counts the same cap.
 */
export function actionableInterferences(
    result: Pick<StudioRecomputeResult, 'rawInterferencePairs' | 'interferenceSummary' | 'validity'>,
): InterferenceFinding[] {
    const cap = result.interferenceSummary?.capMm3 ?? jointContactCapMm3();
    const reported = new Set<string>();
    for (const d of result.validity?.diagnostics ?? []) {
        if (d.partA && d.partB) reported.add(pairKey(d.partA, d.partB));
    }
    return (result.rawInterferencePairs ?? [])
        .filter((p) => p.volumeMm3 > cap && !reported.has(pairKey(p.a, p.b)))
        .sort((x, y) => y.volumeMm3 - x.volumeMm3);
}

function pairKey(a: string, b: string): string {
    return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

export interface ChecksCounts {
    readonly errors: number;
    readonly warnings: number;
    readonly infos: number;
}

/**
 * Finding counts by severity: broken-mechanism entries are errors, extra
 * interferences are warnings, diagnostics count as themselves.
 */
export function countChecks(
    result: Pick<
        StudioRecomputeResult,
        'validity' | 'mechanismBanner' | 'rawInterferencePairs' | 'interferenceSummary'
    >,
): ChecksCounts {
    let errors = result.mechanismBanner?.entries.length ?? 0;
    let warnings = actionableInterferences(result).length;
    let infos = 0;
    for (const d of result.validity?.diagnostics ?? []) {
        if (d.severity === 'error') errors += 1;
        else if (d.severity === 'warning') warnings += 1;
        else infos += 1;
    }
    return { errors, warnings, infos };
}

/** "2 errors · 1 warning", or null when nothing needs attention. */
export function describeCounts(counts: ChecksCounts): string | null {
    const parts: string[] = [];
    if (counts.errors > 0) parts.push(plural(counts.errors, 'error'));
    if (counts.warnings > 0) parts.push(plural(counts.warnings, 'warning'));
    if (counts.infos > 0) parts.push(plural(counts.infos, 'note'));
    return parts.length > 0 ? parts.join(' · ') : null;
}

function plural(n: number, word: string): string {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Tab badge: findings that need attention (errors and warnings). */
export function checksBadgeCount(
    result: Parameters<typeof countChecks>[0] | null,
): number | undefined {
    if (result == null) return undefined;
    const { errors, warnings } = countChecks(result);
    const n = errors + warnings;
    return n > 0 ? n : undefined;
}
