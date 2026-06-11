// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Adapter: WorkbenchContext.scriptReview → ValidatorResult.
//
// `/__kernelcad/review` runs `reviewCadTool` server-side, which calls
// `validateAssembly` under the hood and returns a `ScriptReviewSummary`
// with looser typing. This adapter pulls that into the strict
// `ValidatorResult` shape the Studio shell consumes.
//
// Best-effort mapping: fields that don't exist on the source surface
// degrade gracefully (empty arrays, default 0 counts, no `partName`).
// Phase 1.2 deepens the server payload; Phase 1.1 ships the conservative
// adapter so the shell lights up today.

import type { ScriptReviewSummary } from '../context/GeometryContext';
import type {
    ValidatorDiagnostic,
    ValidatorDiagnosticCode,
    ValidatorResult,
    ValidatorStatus,
} from '../../modeling/mates/validator';

export interface MechanismBannerEntry {
    code: string;
    message: string;
    hint: string;
}

/**
 * Physics-loop banner data extracted from the review payload (P1).
 *
 * The Validity tab reads this to render the red "MECHANISM BROKEN"
 * banner above the legacy diagnostic rows when the recompute's
 * mechanism field is broken. Returns null when the mechanism is real,
 * unverified, or absent (no broken state to surface).
 */
export function reviewToMechanismBanner(
    review: ScriptReviewSummary | null,
): { entries: MechanismBannerEntry[] } | null {
    if (review == null) return null;
    if (review.mechanism !== 'broken') return null;
    const failures = review.mechanismFailures ?? [];
    if (failures.length === 0) return null;
    return {
        entries: failures.map((f) => ({
            code: f.code ?? 'mechanism.unknown',
            message: f.message ?? '',
            hint: f.hint ?? '',
        })),
    };
}

export function reviewToValidity(review: ScriptReviewSummary | null): ValidatorResult | null {
    if (review == null) return null;

    const diagnostics: ValidatorDiagnostic[] = (review.diagnostics ?? []).map(diagnosticFromReview);

    return {
        status: deriveStatus(review),
        diagnostics,
        partCount: 0,
        jointCount: 0,
    };
}

function deriveStatus(review: ScriptReviewSummary): ValidatorStatus {
    // Broken mechanism overrides any "ok" reading from the legacy
    // surface — P1 closes the split surface by making this the merge
    // gate at every consumer.
    if (review.mechanism === 'broken') return 'error';
    if (review.ok) return 'solved';
    const repairMode = review.fitness?.repairMode;
    if (repairMode && repairMode !== 'none') return 'error';
    const hasErrors = (review.diagnostics ?? []).some((d) => d.severity === 'error');
    return hasErrors ? 'error' : 'warning';
}

function diagnosticFromReview(d: NonNullable<ScriptReviewSummary['diagnostics']>[number]): ValidatorDiagnostic {
    const code = (d.code ?? 'assembly.part.floating') as ValidatorDiagnosticCode;
    const severity = normaliseSeverity(d.severity);
    return {
        code,
        severity,
        message: d.message ?? '',
        hint: d.hint ?? '',
        // Carry part/mate attribution so SceneTab can route each diagnostic
        // to the right row's severity dot. Older payloads omit these.
        ...(d.partName ? { partName: d.partName } : {}),
        ...(d.mateName ? { mateName: d.mateName } : {}),
        ...(d.partA ? { partA: d.partA } : {}),
        ...(d.partB ? { partB: d.partB } : {}),
    };
}

function normaliseSeverity(severity: string | undefined): ValidatorDiagnostic['severity'] {
    if (severity === 'error' || severity === 'warning' || severity === 'info') return severity;
    return 'error';
}
