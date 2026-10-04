// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Repair-workflow state of the Checks tab: which suggestion card the agent
// is working on, and whether a recheck fixed it. Pure; the tab renders it.

import type { ValidatorDiagnostic, ValidatorStatus } from '../../../modeling/mates/validator';
import type { ValiditySuggestionCard } from '../../adapters/validitySuggestions';
import type { AgentRepairWorkflow } from '../../store/shellStore';

export type SuggestionWorkflowState = 'drafted' | 'running' | 'still-failing';

export type WorkflowSummaryState = 'fixed' | 'still-failing';

export function resolveWorkflowView(input: {
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

export function workflowFailureStillPresent(
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

export function diagnosticTargetIds(diagnostic: ValidatorDiagnostic): string[] {
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

export function fingerprintValidity(input: {
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

export function diagnosticTargetId(d: ValidatorDiagnostic): string | null {
    if (d.partName) return d.partName;
    if (d.mateName) return d.mateName;
    if (d.partA) return d.partA;
    return null;
}

export function diagnosticTargetLabel(d: ValidatorDiagnostic): string | null {
    if (d.partName) return d.partName;
    if (d.mateName) return d.mateName;
    if (d.partA && d.partB) return `${d.partA} ↔ ${d.partB}`;
    if (d.partA) return d.partA;
    return null;
}

export function diagnosticTargetKey(d: ValidatorDiagnostic): string {
    return d.partName ?? d.mateName ?? `${d.partA ?? ''}::${d.partB ?? ''}`;
}

/** The suggestion card that covers one diagnostic (same code and targets). */
export function cardForDiagnostic(
    cards: ReadonlyArray<ValiditySuggestionCard>,
    d: ValidatorDiagnostic,
): ValiditySuggestionCard | null {
    const targetId = diagnosticTargetId(d);
    const targetIds = diagnosticTargetIds(d).join('|');
    return (
        cards.find(
            (c) =>
                c.kind === 'diagnostic' &&
                c.code === d.code &&
                c.targetId === targetId &&
                c.targetIds.join('|') === targetIds,
        ) ?? null
    );
}
