// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX, MouseEvent } from 'react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { routeDiagnosticToSelection } from '../logic/diagnosticRouter';
import type { ValidatorDiagnostic, ValidatorStatus } from '../../modeling/mates/validator';
import {
    buildValiditySuggestions,
    type ValiditySuggestionCard,
} from '../adapters/validitySuggestions';
import { shellStore } from '../store/shellStore';

/**
 * Always-visible inspector view of the validator result. Peer to the
 * bottom drawer (which auto-opens for non-solved states); this tab mirrors
 * the same content so a reviewer can read it without expanding the drawer.
 */
export function ValidityTab(): JSX.Element {
    const { validity, mechanismBanner, suggestedRepairPrompt } = useRecomputeResult();
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
    const suggestionCards = buildValiditySuggestions({
        validity,
        mechanismBanner,
        suggestedRepairPrompt,
    });

    return (
        <div className="flex flex-col" data-testid="validity-tab">
            {mechanismBanner != null && (
                <MechanismBanner entries={mechanismBanner.entries} />
            )}
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
            {suggestionCards.length > 0 && (
                <div className="flex flex-col gap-1.5 px-3 pb-2">
                    {suggestionCards.map((card) => (
                        <SuggestionCard
                            key={card.id}
                            card={card}
                            onSelect={
                                card.targetId == null
                                    ? undefined
                                    : () => selectFeature(card.targetId)
                            }
                        />
                    ))}
                </div>
            )}
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

function SuggestionCard({
    card,
    onSelect,
}: {
    card: ValiditySuggestionCard;
    onSelect?: () => void;
}): JSX.Element {
    const className =
        'w-full rounded border border-[#2a2a2a] bg-[#141414] px-2.5 py-2 text-left text-xs text-gray-300';
    const usePrompt = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onSelect?.();
        shellStore.setAgentDraftPrompt(card.promptText);
        shellStore.setAgentRailOpen(true);
    };

    return (
        <div
            className={className}
            data-testid="validity-suggestion-card"
            data-code={card.code}
            data-kind={card.kind}
        >
            <div className="flex items-center gap-2">
                <span
                    className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${severityDotColor(card.severity)}`}
                    aria-label={`severity ${card.severity}`}
                />
                <span className="font-medium text-gray-100">{card.title}</span>
                <span className="font-mono text-[10px] text-gray-500">{card.code}</span>
                {card.targetLabel != null && (
                    <span className="ml-auto max-w-[8rem] truncate text-[11px] text-gray-300" title={card.targetLabel}>
                        {card.targetLabel}
                    </span>
                )}
            </div>
            <div className="mt-1 text-[11px] text-gray-400">{card.evidence}</div>
            <div className="mt-0.5 text-[11px] text-gray-500">{card.action}</div>
            <div className="mt-2 flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={usePrompt}
                    className="rounded border border-[#343a46] bg-[#1b1f27] px-2 py-1 text-[10px] font-medium text-gray-200 hover:bg-[#242a35] transition-colors"
                >
                    Use prompt
                </button>
                {onSelect != null && (
                    <button
                        type="button"
                        onClick={onSelect}
                        className="rounded border border-[#2b3340] px-2 py-1 text-[10px] text-gray-300 hover:bg-[#1a1a1a] transition-colors"
                    >
                        Jump
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Physics-grounded loop banner (P1 surface convergence).
 *
 * Rendered above the legacy diagnostic rows when the recompute's
 * mechanism verdict is `'broken'`. Lists each criterion failure with
 * its actionable hint so the agent / human reviewer sees the merge
 * gate first, then the advisory diagnostics underneath.
 *
 * Spec: docs/specs/2026-06-01-physics-grounded-loop-design.md
 */
function MechanismBanner({
    entries,
}: {
    entries: ReadonlyArray<{ code: string; message: string; hint: string }>;
}): JSX.Element {
    return (
        <div
            className="bg-red-950/60 border-b border-red-900 px-3 py-2"
            data-testid="mechanism-banner"
            role="alert"
        >
            <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-red-300">
                    MECHANISM BROKEN
                </span>
                <span className="text-[10px] text-red-400/80">
                    this assembly will not work as built
                </span>
            </div>
            <ul
                className="mt-1.5 flex flex-col gap-1.5"
                data-testid="mechanism-banner-entries"
            >
                {entries.map((entry, i) => (
                    <li
                        key={`${entry.code}-${i}`}
                        className="text-[11px] text-red-200"
                        data-testid="mechanism-banner-entry"
                        data-code={entry.code}
                    >
                        <div className="flex items-start gap-2">
                            <span className="font-mono text-[10px] text-red-300/90 shrink-0">
                                {entry.code}
                            </span>
                            <span className="text-red-100">{entry.message}</span>
                        </div>
                        {entry.hint && (
                            <div className="mt-0.5 pl-[5.5rem] text-red-300/80">
                                Fix: {entry.hint}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
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

// eslint-disable-next-line react-refresh/only-export-components
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
