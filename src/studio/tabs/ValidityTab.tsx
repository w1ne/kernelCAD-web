// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useContext, type JSX } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button, EmptyState, type BadgeTone } from '../../ui';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { WorkbenchContext } from '../context/WorkbenchContext';
import { routeDiagnosticToFocusTarget, routeDiagnosticToSelection } from '../logic/diagnosticRouter';
import type { ValidatorDiagnostic, ValidatorStatus } from '../../modeling/mates/validator';
import { buildValiditySuggestions, type ValiditySuggestionCard } from '../adapters/validitySuggestions';
import { useShellStore, shellStore } from '../store/useShellStore';
import { actionableInterferences, countChecks, groupChecks, type InterferenceFinding } from '../logic/checksModel';
import { ChecksSection, ChecksSummary, FindingsList, InterferenceList, MechanismBanner, type FindingActions } from './checks/ChecksParts';
import { SuggestionCard, WorkflowSummary } from './checks/SuggestionCard';
import { draftRepair } from './checks/draftRepair';
import {
    cardForDiagnostic,
    fingerprintValidity,
    resolveWorkflowView,
    workflowFailureStillPresent,
} from './checks/repairWorkflow';

/** Suggested-fix cards shown above the findings list. */
const SUGGESTION_LIMIT = 3;

/**
 * The inspector Checks tab (tab id `validity`): one place for the validator
 * verdict, the mechanism verdict, every diagnostic by category and severity,
 * extra interferences, and a "Fix with agent" action wherever a finding
 * carries a fix hint. The bottom drawer shows the same validator content.
 */
export function ValidityTab(): JSX.Element {
    const result = useRecomputeResult();
    const { validity, mechanismBanner, suggestedRepairPrompt, repairEvidence } = result;
    const { selectFeature } = useFeatureSelection();
    const { agentRepairWorkflow } = useShellStore();
    const run = useRunChecks();

    if (validity === null) return <ChecksEmpty run={run} />;

    const { status, diagnostics, partCount, jointCount, validated } = validity;
    // A review payload with no validator evidence behind it derives to
    // `status: 'solved'` from its `ok: true` alone. Painting that green
    // would tell the user their mechanism validated when nothing ran, so
    // the chip reports the absence instead. Only the PASSING verdict is
    // suppressed — a real failure still shows as itself.
    const verdict: ValidityVerdict = !validated && isPassingStatus(status) ? 'not run' : status;
    const color = verdictColor(verdict);
    const allCards = buildValiditySuggestions({
        validity,
        mechanismBanner,
        suggestedRepairPrompt,
        repairEvidence,
        limit: Number.POSITIVE_INFINITY,
    });
    const suggestionCards = allCards.slice(0, SUGGESTION_LIMIT);
    const validityFingerprint = fingerprintValidity({ status, diagnostics, mechanismBanner });
    const workflowView = resolveWorkflowView({
        workflow: agentRepairWorkflow,
        suggestionCards,
        failureStillPresent:
            agentRepairWorkflow == null
                ? false
                : workflowFailureStillPresent(agentRepairWorkflow, diagnostics, mechanismBanner),
        validityFingerprint,
    });
    const groups = groupChecks(diagnostics);
    const interferences = actionableInterferences(result);

    const findingActions = makeFindingActions(allCards, validityFingerprint, selectFeature);

    return (
        <div className="flex flex-col gap-4 pb-6" data-testid="validity-tab">
            <ChecksSummary
                verdict={verdict}
                verdictLabel={VERDICT_LABEL[verdict]}
                tone={color.tone}
                color={color.name}
                validated={validated}
                counts={countChecks(result)}
                partCount={partCount}
                jointCount={jointCount}
                diagnosticCount={diagnostics.length}
                onRun={run.onRun}
                running={run.running}
            />
            {mechanismBanner != null && <MechanismBanner entries={mechanismBanner.entries} />}
            {workflowView.summary != null && (
                <div className="px-3">
                    <WorkflowSummary summary={workflowView.summary} />
                </div>
            )}
            {suggestionCards.length > 0 && (
                <ChecksSection title="Suggested fixes" testId="checks-suggestions">
                    <div className="flex flex-col gap-2 px-3">
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
                </ChecksSection>
            )}
            {groups.length > 0 && (
                <ChecksSection title="Findings">
                    <FindingsList groups={groups} actions={findingActions} />
                </ChecksSection>
            )}
            {interferences.length > 0 && (
                <ChecksSection title="Interferences">
                    <InterferenceList pairs={interferences} onShow={(pair) => showInterference(pair, selectFeature)} />
                </ChecksSection>
            )}
        </div>
    );
}

function ChecksEmpty({ run }: { run: { onRun?: () => void; running: boolean } }): JSX.Element {
    return (
        <div data-testid="validity-empty-state">
            <EmptyState
                icon={<ShieldCheck strokeWidth={1.75} />}
                title="No checks yet"
                description="Checks run when the model builds. Assembly, mechanism and manufacturing findings show here."
                action={
                    run.onRun != null ? (
                        <Button variant="secondary" size="sm" loading={run.running} onClick={run.onRun}>
                            Run checks
                        </Button>
                    ) : undefined
                }
            />
        </div>
    );
}

/** Re-runs the geometry pipeline, which re-fetches the review. Absent outside a workbench. */
function useRunChecks(): { onRun?: () => void; running: boolean } {
    const workbench = useContext(WorkbenchContext);
    if (workbench == null || typeof workbench.executeGeometry !== 'function') return { running: false };
    return {
        onRun: () => void workbench.executeGeometry(workbench.code),
        running: workbench.isComputing === true,
    };
}

function makeFindingActions(
    allCards: readonly ValiditySuggestionCard[],
    validityFingerprint: string,
    selectFeature: (id: string | null) => void,
): FindingActions {
    return {
        onSelect: (d) => selectDiagnostic(d, selectFeature),
        fixFor: (d) => {
            const card = cardForDiagnostic(allCards, d);
            if (card == null) return null;
            return {
                fix: () => draftRepair(card, validityFingerprint, () => selectDiagnostic(d, selectFeature)),
                prompt: card.promptText,
            };
        },
    };
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

function showInterference(pair: InterferenceFinding, selectFeature: (id: string | null) => void): void {
    selectFeature(pair.a);
    shellStore.setViewportFocusTarget({ ids: [pair.a, pair.b], source: 'validity-diagnostic' });
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

type StatusColor = {
    name: 'green' | 'amber' | 'red' | 'grey';
    tone: BadgeTone;
};

/** What the chip actually reports: the validator's status, or the explicit
 *  absence of one. `'not run'` is a shell-only verdict — it never comes back
 *  from the validator, it is what the shell says when nothing validated. */
export type ValidityVerdict = ValidatorStatus | 'not run';

const VERDICT_LABEL: Record<ValidityVerdict, string> = {
    solved: 'Solved',
    'redundant-ok': 'Solved · redundant',
    warning: 'Warnings',
    'under-constrained': 'Under-constrained',
    error: 'Failed',
    'over-constrained': 'Over-constrained',
    'did-not-converge': 'Did not converge',
    'not run': 'Not run',
};

/** Statuses that read as a pass. Only these are suppressed when unvalidated;
 *  a failing verdict is reported as itself either way. */
// eslint-disable-next-line react-refresh/only-export-components
export function isPassingStatus(status: ValidatorStatus): boolean {
    return status === 'solved' || status === 'redundant-ok';
}

// eslint-disable-next-line react-refresh/only-export-components
export function verdictColor(verdict: ValidityVerdict): StatusColor {
    if (verdict === 'not run') return { name: 'grey', tone: 'neutral' };
    return statusColor(verdict);
}

// eslint-disable-next-line react-refresh/only-export-components
export function statusColor(status: ValidatorStatus): StatusColor {
    switch (status) {
        case 'solved':
        case 'redundant-ok':
            return { name: 'green', tone: 'ok' };
        case 'warning':
        case 'under-constrained':
            return { name: 'amber', tone: 'warn' };
        case 'error':
        case 'over-constrained':
        case 'did-not-converge':
            return { name: 'red', tone: 'danger' };
    }
}
