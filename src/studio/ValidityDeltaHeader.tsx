// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React from 'react';
import type { ValidatorResult, ValidatorStatus } from '../modeling/mates/validator';
import { computeValidityDelta } from './logic/validityDelta';

export interface ValidityDeltaHeaderProps {
    readonly prev: ValidatorResult | null;
    readonly curr: ValidatorResult | null;
    /** When provided, renders a collapse/expand chevron that calls back on click. */
    readonly collapsed?: boolean;
    readonly onToggleCollapse?: () => void;
}

function statusChipClass(status: ValidatorStatus | null): string {
    switch (status) {
        case 'solved':
        case 'redundant-ok':
            return 'bg-emerald-900 text-emerald-200 border-emerald-700';
        case 'warning':
        case 'under-constrained':
            return 'bg-amber-900 text-amber-200 border-amber-700';
        case 'error':
        case 'over-constrained':
        case 'did-not-converge':
            return 'bg-red-900 text-red-200 border-red-700';
        default:
            return 'bg-surface-2 text-fg-2 border-border-strong';
    }
}

export const ValidityDeltaHeader: React.FC<ValidityDeltaHeaderProps> = ({ prev, curr, collapsed, onToggleCollapse }) => {
    const delta = computeValidityDelta(prev, curr);
    const statusNow = delta.statusNow ?? 'unknown';
    const currentDiagnosticCount = curr?.diagnostics.length ?? 0;

    const deltaText =
        delta.statusWas === null
            ? `now: ${statusNow} · ${currentDiagnosticCount} diagnostics`
            : `was: ${delta.statusWas} → now: ${statusNow} · +${delta.newCount} new · ${delta.clearedCount} cleared`;

    return (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-surface-2">
            <span
                data-testid="validity-status-chip"
                className={`px-2 py-0.5 text-[11px] rounded border ${statusChipClass(delta.statusNow)}`}
            >
                {statusNow}
            </span>
            <span className="text-xs text-fg">{deltaText}</span>
            <span className="ml-auto text-2xs text-fg-3 italic">
                since last recompute
            </span>
            {onToggleCollapse && (
                <button
                    type="button"
                    data-testid="validity-drawer-toggle"
                    aria-label={collapsed ? 'Expand validity drawer' : 'Collapse validity drawer'}
                    title={collapsed ? 'Expand validity drawer' : 'Collapse validity drawer'}
                    onClick={onToggleCollapse}
                    className="px-1.5 py-0.5 text-xs text-fg-2 hover:text-fg rounded border border-border-strong hover:border-fg-3 bg-transparent"
                >
                    {collapsed ? '▲' : '▼'}
                </button>
            )}
        </div>
    );
};

export default ValidityDeltaHeader;
