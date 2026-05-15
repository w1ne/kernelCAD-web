import React from 'react';
import type { ValidatorDiagnostic } from '../lib/mates/validator';
import { useFeatureSelection } from './hooks/useFeatureSelection';
import { routeDiagnosticToSelection } from './logic/diagnosticRouter';

export interface DiagnosticRowProps {
    readonly diagnostic: ValidatorDiagnostic;
}

function severityDotClass(severity: ValidatorDiagnostic['severity']): string {
    switch (severity) {
        case 'error':
            return 'bg-red-500';
        case 'warning':
            return 'bg-amber-400';
        case 'info':
        default:
            return 'bg-sky-400';
    }
}

function targetLabel(d: ValidatorDiagnostic): string {
    if (d.partName) return d.partName;
    if (d.mateName) return d.mateName;
    if (d.partA && d.partB) return `${d.partA}↔${d.partB}`;
    if (d.partA) return d.partA;
    return '—';
}

export const DiagnosticRow: React.FC<DiagnosticRowProps> = ({ diagnostic }) => {
    const { selectFeature } = useFeatureSelection();
    const target = targetLabel(diagnostic);

    const onJump = (): void => {
        selectFeature(routeDiagnosticToSelection(diagnostic));
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Diagnostic ${diagnostic.code} on ${target}`}
            onClick={onJump}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onJump();
                }
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#222] border-b border-[#222] cursor-pointer"
        >
            <span
                aria-hidden="true"
                className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${severityDotClass(diagnostic.severity)}`}
            />
            <code className="font-mono text-[11px] text-gray-400 flex-shrink-0">
                {diagnostic.code}
            </code>
            <span className="font-semibold text-gray-100 flex-shrink-0">{target}</span>
            <span className="italic text-gray-400 truncate flex-1">{diagnostic.hint}</span>
            <button
                type="button"
                aria-label={`Jump to ${target}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onJump();
                }}
                className="flex-shrink-0 px-1.5 py-0.5 text-[11px] rounded border border-[#3a3a3a] bg-[#222] text-gray-300 hover:bg-[#2a2a2a]"
            >
                →
            </button>
        </div>
    );
};

export default DiagnosticRow;
