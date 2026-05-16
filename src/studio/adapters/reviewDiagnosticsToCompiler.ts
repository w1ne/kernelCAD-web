// Adapter: ScriptReviewSummary.diagnostics → CompilerDiagnostic[].
//
// Used to surface review-side diagnostics as Monaco markers in the
// CodeTab. The review payload doesn't carry `scriptLocation` today, so
// every adapted diagnostic falls back to line 1 unless a future server
// enrichment surfaces precise locations.

import type { ScriptReviewSummary } from '../context/GeometryContext';
import type { CompilerDiagnostic, DiagnosticSeverity } from '../../shared/diagnostics/diagnostic';
import type { DiagnosticCode } from '../../shared/diagnostics/codes';

export function reviewDiagnosticsToCompiler(
    review: ScriptReviewSummary | null,
): CompilerDiagnostic[] {
    if (review == null) return [];
    return (review.diagnostics ?? []).map((d): CompilerDiagnostic => ({
        target: 'export-occt',
        code: (d.code ?? 'feature.kernel-failed') as DiagnosticCode,
        severity: normaliseSeverity(d.severity),
        message: d.message ?? '',
        hint: d.hint ?? '',
    }));
}

function normaliseSeverity(severity: string | undefined): DiagnosticSeverity {
    if (severity === 'error' || severity === 'warn' || severity === 'info') return severity;
    if (severity === 'warning') return 'warn';
    return 'error';
}
