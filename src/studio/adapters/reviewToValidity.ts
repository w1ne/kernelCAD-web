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
    ValidatorStatus,
} from '../../modeling/mates/validator';
import type { StudioValidity } from '../types';
import { EMPTY_MODEL_TOPOLOGY, type ModelTopologyCounts } from './featureRecordsToCounts';

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

/**
 * Did a validation actually run for this review payload?
 *
 * Not every `ScriptReviewSummary` the shell holds came from a validator.
 * Three code paths hand the Studio a synthetic pass:
 *
 *   - `GeometryContext` falls back to `{ ok: true, diagnostics: [] }` when a
 *     hosted / dev mesh response carries no `review` block at all.
 *   - the dev `/__kernelcad/review?live=1` path (also used for the
 *     session-backed INITIAL load) short-circuits the expensive review and
 *     returns `{ ok: true, diagnostics: [], live: true }`.
 *
 * Both satisfy `review.ok`, so `deriveStatus` used to answer `'solved'` —
 * a green verdict over an empty set. Rather than trust a flag the server
 * could forget to set, evidence is derived: a real `reviewCadTool` result
 * always carries the validator block, a fitness summary and a mechanism
 * verdict; a review that found something always carries diagnostics.
 */
export function reviewWasValidated(review: ScriptReviewSummary): boolean {
    if (review.validator != null) return true;
    if (review.fitness !== undefined) return true;
    if ((review.diagnostics ?? []).length > 0) return true;
    if (review.mechanism !== undefined && review.mechanism !== 'unverified') return true;
    return false;
}

/**
 * @param review  latest `/__kernelcad/review` (or mesh-embedded) payload.
 * @param model   part / joint counts of the model actually loaded in the
 *                shell, derived from `featureRecords`. Used when the review
 *                payload carries no `validator` block of its own — which is
 *                every session-backed load. Without it the panel reports
 *                `0 parts · 0 joints` for a model the Scene tab is listing.
 */
export function reviewToValidity(
    review: ScriptReviewSummary | null,
    model: ModelTopologyCounts = EMPTY_MODEL_TOPOLOGY,
): StudioValidity | null {
    if (review == null) return null;

    const diagnostics: ValidatorDiagnostic[] = (review.diagnostics ?? []).map(diagnosticFromReview);
    const validated = reviewWasValidated(review);

    return {
        status: deriveStatus(review),
        diagnostics,
        // The server-side pipeline already returns real counts on its
        // `validator` block; prefer them, and fall back to the loaded
        // model's own records when the payload has no validator block.
        partCount: review.validator?.partCount ?? model.partCount,
        jointCount: review.validator?.jointCount ?? model.jointCount,
        validated,
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
