// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX, MouseEvent } from 'react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { routeDiagnosticToFocusTarget, routeDiagnosticToSelection } from '../logic/diagnosticRouter';
import type { ValidatorDiagnostic, ValidatorStatus } from '../../modeling/mates/validator';
import {
    buildValiditySuggestions,
    type ValiditySuggestionCard,
} from '../adapters/validitySuggestions';
import { useShellStore, shellStore } from '../store/useShellStore';
import type { AgentRepairWorkflow } from '../store/shellStore';

/**
 * Always-visible inspector view of the validator result. Peer to the
 * bottom drawer (which auto-opens for non-solved states); this tab mirrors
 * the same content so a reviewer can read it without expanding the drawer.
 */
export function ValidityTab(): JSX.Element {
    const { validity, mechanismBanner, suggestedRepairPrompt, repairEvidence } = useRecomputeResult();
    const { selectFeature } = useFeatureSelection();
    const { agentRepairWorkflow } = useShellStore();

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
        repairEvidence,
    });
    const validityFingerprint = fingerprintValidity({
        status,
        diagnostics,
        mechanismBanner,
    });
    const workflowView = resolveWorkflowView({
        workflow: agentRepairWorkflow,
        suggestionCards,
        failureStillPresent:
            agentRepairWorkflow == null
                ? false
                : workflowFailureStillPresent(agentRepairWorkflow, diagnostics, mechanismBanner),
        validityFingerprint,
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
                            workflowState={workflowView.cardStates.get(card.id) ?? null}
                            validityFingerprint={validityFingerprint}
                            onSelect={makeSuggestionSelectHandler(card, selectFeature)}
                        />
                    ))}
                </div>
            )}
            {workflowView.summary != null && (
                <WorkflowSummary summary={workflowView.summary} />
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
                            onSelect={() => selectDiagnostic(diag, selectFeature)}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

function selectDiagnostic(
    diagnostic: ValidatorDiagnostic,
    selectFeature: (id: string | null) => void,
): void {
    selectFeature(routeDiagnosticToSelection(diagnostic));
    const focusTarget = routeDiagnosticToFocusTarget(diagnostic);
    if (focusTarget == null) return;
    shellStore.setViewportFocusTarget({
        ids: focusTarget.ids,
        source: 'validity-diagnostic',
    });
}

function makeSuggestionSelectHandler(
    card: ValiditySuggestionCard,
    selectFeature: (id: string | null) => void,
): (() => void) | undefined {
    if (card.targetId == null && card.targetIds.length === 0) return undefined;
    return () => {
        selectFeature(card.targetId);
        if (card.targetIds.length === 0) return;
        shellStore.setViewportFocusTarget({
            ids: card.targetIds,
            source: 'validity-suggestion',
        });
    };
}

function SuggestionCard({
    card,
    workflowState,
    validityFingerprint,
    onSelect,
}: {
    card: ValiditySuggestionCard;
    workflowState: SuggestionWorkflowState | null;
    validityFingerprint: string;
    onSelect?: () => void;
}): JSX.Element {
    const className =
        'w-full rounded border border-[#2a2a2a] bg-[#141414] px-2.5 py-2 text-left text-xs text-gray-300';
    const usePrompt = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onSelect?.();
        shellStore.setAgentDraftPrompt(card.promptText);
        shellStore.setAgentRepairWorkflow({
            cardId: card.id,
            code: card.code,
            promptText: card.promptText,
            targetId: card.targetId,
            targetIds: card.targetIds,
            promptSource: card.promptSource,
            validityFingerprint,
            state: 'drafted',
        });
        shellStore.setAgentRailOpen(true);
    };

    return (
        <div
            className={className}
            data-testid="validity-suggestion-card"
            data-code={card.code}
            data-kind={card.kind}
            data-prompt-source={card.promptSource}
            data-workflow-state={workflowState ?? undefined}
        >
            <div className="flex items-center gap-2">
                <span
                    className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${severityDotColor(card.severity)}`}
                    aria-label={`severity ${card.severity}`}
                />
                <span className="font-medium text-gray-100">{card.title}</span>
                <span className="font-mono text-[10px] text-gray-500">{card.code}</span>
                {card.diagnosticCount > 1 && (
                    <span
                        className="rounded border border-[#343434] bg-[#1b1b1b] px-1.5 py-0.5 text-[10px] text-gray-300"
                        data-testid="validity-suggestion-count"
                    >
                        {card.diagnosticCount} findings
                    </span>
                )}
                {card.targetLabel != null && (
                    <span className="ml-auto max-w-[8rem] truncate text-[11px] text-gray-300" title={card.targetLabel}>
                        {card.targetLabel}
                    </span>
                )}
                {workflowState != null && (
                    <WorkflowBadge state={workflowState} />
                )}
            </div>
            <div className="mt-1 text-[11px] text-gray-400">{card.evidence}</div>
            <div className="mt-0.5 text-[11px] text-gray-500">{card.action}</div>
            {card.repairEvidence != null && (
                <RepairEvidenceBlock repairEvidence={card.repairEvidence} />
            )}
            <div
                className="mt-1.5 max-h-24 overflow-y-auto whitespace-pre-wrap break-words rounded border border-[#252525] bg-[#101010] px-2 py-1 text-[10px] text-gray-400"
                data-testid="validity-suggestion-prompt-preview"
            >
                <span className="font-medium text-gray-300">
                    {card.promptSource === 'review' ? 'Review prompt' : 'Fallback prompt'}
                </span>
                <span className="mx-1 text-gray-600">·</span>
                <span className="break-words">{card.promptText}</span>
            </div>
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

type SuggestionWorkflowState = 'drafted' | 'running' | 'still-failing';

type WorkflowSummaryState = 'fixed' | 'still-failing';

function WorkflowBadge({ state }: { state: SuggestionWorkflowState }): JSX.Element {
    const label = state === 'still-failing' ? 'Rechecked · Still failing' : workflowLabel(state);
    return (
        <span
            className={`rounded border px-1.5 py-0.5 text-[10px] ${workflowBadgeClass(state)}`}
            data-testid="validity-suggestion-workflow-badge"
        >
            {label}
        </span>
    );
}

function WorkflowSummary({
    summary,
}: {
    summary: { state: WorkflowSummaryState; code: string };
}): JSX.Element {
    const fixed = summary.state === 'fixed';
    return (
        <div
            className={`mx-3 mb-2 rounded border px-2 py-1 text-[11px] ${fixed ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-200' : 'border-red-900/50 bg-red-950/30 text-red-200'}`}
            data-testid="validity-suggestion-workflow-summary"
            data-workflow-state={summary.state}
        >
            Rechecked · {fixed ? 'Fixed' : 'Still failing'} {summary.code}
        </div>
    );
}

function workflowLabel(state: SuggestionWorkflowState): string {
    switch (state) {
        case 'drafted':
            return 'Drafted';
        case 'running':
            return 'Running';
        case 'still-failing':
            return 'Still failing';
    }
}

function workflowBadgeClass(state: SuggestionWorkflowState): string {
    switch (state) {
        case 'drafted':
            return 'border-blue-800/70 bg-blue-950/40 text-blue-200';
        case 'running':
            return 'border-amber-800/70 bg-amber-950/40 text-amber-200';
        case 'still-failing':
            return 'border-red-800/70 bg-red-950/40 text-red-200';
    }
}

function resolveWorkflowView(input: {
    workflow: AgentRepairWorkflow | null;
    suggestionCards: ReadonlyArray<ValiditySuggestionCard>;
    failureStillPresent: boolean;
    validityFingerprint: string;
}): {
    cardStates: Map<string, SuggestionWorkflowState>;
    summary: { state: WorkflowSummaryState; code: string } | null;
} {
    const cardStates = new Map<string, SuggestionWorkflowState>();
    const { workflow } = input;
    if (workflow == null) return { cardStates, summary: null };

    const matchingCard = input.suggestionCards.find((card) => cardMatchesWorkflow(card, workflow));
    const rechecked =
        workflow.state === 'running' &&
        input.validityFingerprint !== workflow.validityFingerprint;
    if (!rechecked && matchingCard != null) {
        cardStates.set(matchingCard.id, workflow.state);
        return { cardStates, summary: null };
    }

    if (matchingCard != null) {
        cardStates.set(matchingCard.id, 'still-failing');
        return { cardStates, summary: null };
    }

    if (rechecked && input.failureStillPresent) {
        return { cardStates, summary: { state: 'still-failing', code: workflow.code } };
    }

    if (rechecked) {
        return { cardStates, summary: { state: 'fixed', code: workflow.code } };
    }

    return { cardStates, summary: null };
}

function cardMatchesWorkflow(card: ValiditySuggestionCard, workflow: AgentRepairWorkflow): boolean {
    if (card.id === workflow.cardId) return true;
    if (card.code !== workflow.code) return false;
    if (sameTargetSet(card.targetIds, workflow.targetIds ?? [])) return true;
    return card.targetId === workflow.targetId;
}

function workflowFailureStillPresent(
    workflow: AgentRepairWorkflow,
    diagnostics: ReadonlyArray<ValidatorDiagnostic>,
    mechanismBanner: {
        readonly entries: ReadonlyArray<{
            readonly code: string;
            readonly message: string;
            readonly hint: string;
        }>;
    } | null,
): boolean {
    if (mechanismBanner?.entries.some((entry) => entry.code === workflow.code) === true) {
        return true;
    }
    return diagnostics.some((diagnostic) => {
        if (diagnostic.code !== workflow.code) return false;
        if (sameTargetSet(diagnosticTargetIds(diagnostic), workflow.targetIds ?? [])) return true;
        return diagnosticTargetId(diagnostic) === workflow.targetId;
    });
}

function sameTargetSet(a: readonly string[], b: readonly string[]): boolean {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;
    const left = [...a].sort();
    const right = [...b].sort();
    return left.every((value, index) => value === right[index]);
}

function diagnosticTargetIds(diagnostic: ValidatorDiagnostic): string[] {
    return uniqueNonEmpty([diagnostic.partName, diagnostic.partA, diagnostic.partB]);
}

function uniqueNonEmpty(values: ReadonlyArray<string | undefined>): string[] {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const value of values) {
        if (!value || seen.has(value)) continue;
        seen.add(value);
        ids.push(value);
    }
    return ids;
}

function fingerprintValidity(input: {
    status: ValidatorStatus;
    diagnostics: ReadonlyArray<ValidatorDiagnostic>;
    mechanismBanner: {
        readonly entries: ReadonlyArray<{
            readonly code: string;
            readonly message: string;
            readonly hint: string;
        }>;
    } | null;
}): string {
    return JSON.stringify({
        status: input.status,
        mechanism: input.mechanismBanner?.entries.map((entry) => ({
            code: entry.code,
            message: entry.message,
            hint: entry.hint,
        })) ?? [],
        diagnostics: input.diagnostics.map((diagnostic) => ({
            code: diagnostic.code,
            severity: diagnostic.severity,
            message: diagnostic.message,
            hint: diagnostic.hint,
            partName: diagnostic.partName,
            mateName: diagnostic.mateName,
            partA: diagnostic.partA,
            partB: diagnostic.partB,
        })),
    });
}

function RepairEvidenceBlock({
    repairEvidence,
}: {
    repairEvidence: NonNullable<ValiditySuggestionCard['repairEvidence']>;
}): JSX.Element {
    return (
        <div
            className="mt-1.5 rounded border border-[#30281a] bg-[#16120b] px-2 py-1 text-[10px] text-amber-200/80"
            data-testid="validity-suggestion-repair-evidence"
        >
            {repairEvidence.repairMode != null && (
                <div>
                    Repair mode: {repairEvidence.repairMode}
                </div>
            )}
            {repairEvidence.blockingReasons.slice(0, 2).map((reason, index) => (
                <div
                    key={`${reason.code}-${reason.message}-${index}`}
                    className="mt-0.5"
                >
                    {reason.code !== '' && (
                        <span className="font-mono text-amber-100">{reason.code}</span>
                    )}
                    {reason.message !== '' && (
                        <span className="ml-1">{reason.message}</span>
                    )}
                    {reason.repairHint !== '' && (
                        <span className="ml-1 text-amber-200/70">Hint: {reason.repairHint}</span>
                    )}
                </div>
            ))}
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

function diagnosticTargetId(d: ValidatorDiagnostic): string | null {
    if (d.partName) return d.partName;
    if (d.mateName) return d.mateName;
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
