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
    };
}

function normaliseSeverity(severity: string | undefined): ValidatorDiagnostic['severity'] {
    if (severity === 'error' || severity === 'warning' || severity === 'info') return severity;
    return 'error';
}
