import type { JSX } from 'react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { routeDiagnosticToSelection } from '../logic/diagnosticRouter';
import type { ValidatorDiagnostic, ValidatorStatus } from '../../lib/mates/validator';

/**
 * Always-visible inspector view of the validator result. Peer to the
 * bottom drawer (which auto-opens for non-solved states); this tab mirrors
 * the same content so a reviewer can read it without expanding the drawer.
 */
export function ValidityTab(): JSX.Element {
    const { validity } = useRecomputeResult();
    const { selectFeature } = useFeatureSelection();

    if (validity === null) {
        return (
            <div
                className="px-4 py-3 text-sm text-gray-500"
                data-testid="validity-empty-state"
            >
                No assembly to validate
            </div>
        );
    }

    const { status, diagnostics, partCount, jointCount } = validity;
    const color = statusColor(status);

    return (
        <div className="flex flex-col" data-testid="validity-tab">
            <div className="flex items-center gap-3 px-3 py-2">
                <span
                    className={`px-2 py-0.5 text-[11px] font-medium rounded ${color.bg} ${color.text}`}
                    data-testid="validity-chip"
                    data-status={status}
                    data-color={color.name}
                >
                    {status}
                </span>
                <span className="text-[11px] text-gray-400" data-testid="validity-counts">
                    {partCount} parts · {jointCount} joints · {diagnostics.length} diagnostics
                </span>
            </div>
            {diagnostics.length > 0 && (
                <ul
                    className="flex flex-col divide-y divide-[#1f1f1f] max-h-72 overflow-y-auto"
                    data-testid="validity-diagnostics"
                >
                    {diagnostics.map((diag, i) => (
                        <DiagnosticRowInline
                            key={`${diag.code}-${diagnosticTargetKey(diag)}-${i}`}
                            diagnostic={diag}
                            onSelect={() => selectFeature(routeDiagnosticToSelection(diag))}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

function DiagnosticRowInline({
    diagnostic,
    onSelect,
}: {
    diagnostic: ValidatorDiagnostic;
    onSelect: () => void;
}): JSX.Element {
    const target = diagnosticTargetLabel(diagnostic);
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                className="w-full flex items-start gap-2 px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-[#1a1a1a] transition-colors"
                data-testid="diagnostic-row"
                data-code={diagnostic.code}
            >
                <span
                    className={`mt-1 inline-block h-1.5 w-1.5 rounded-full shrink-0 ${severityDotColor(diagnostic.severity)}`}
                    aria-label={`severity ${diagnostic.severity}`}
                />
                <span className="font-mono text-[10px] text-gray-400 shrink-0">{diagnostic.code}</span>
                {target && (
                    <span className="text-gray-200 shrink-0 truncate max-w-[8rem]" title={target}>
                        {target}
                    </span>
                )}
                <span className="text-gray-400 flex-1 truncate" title={diagnostic.hint}>
                    {diagnostic.hint}
                </span>
            </button>
        </li>
    );
}

function diagnosticTargetLabel(d: ValidatorDiagnostic): string | null {
    if (d.partName) return d.partName;
    if (d.mateName) return d.mateName;
    if (d.partA && d.partB) return `${d.partA} ↔ ${d.partB}`;
    if (d.partA) return d.partA;
    return null;
}

function diagnosticTargetKey(d: ValidatorDiagnostic): string {
    return d.partName ?? d.mateName ?? `${d.partA ?? ''}::${d.partB ?? ''}`;
}

type StatusColor = {
    name: 'green' | 'amber' | 'red';
    bg: string;
    text: string;
};

export function statusColor(status: ValidatorStatus): StatusColor {
    switch (status) {
        case 'solved':
        case 'redundant-ok':
            return { name: 'green', bg: 'bg-emerald-900/40', text: 'text-emerald-300' };
        case 'warning':
        case 'under-constrained':
            return { name: 'amber', bg: 'bg-amber-900/40', text: 'text-amber-300' };
        case 'error':
        case 'over-constrained':
        case 'did-not-converge':
            return { name: 'red', bg: 'bg-red-900/40', text: 'text-red-300' };
    }
}

function severityDotColor(severity: ValidatorDiagnostic['severity']): string {
    switch (severity) {
        case 'error':
            return 'bg-red-400';
        case 'warning':
            return 'bg-amber-400';
        case 'info':
            return 'bg-blue-400';
    }
}
