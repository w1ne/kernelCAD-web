// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { useGeneration, type GenerationPhase } from '../../funnel/hooks/useGeneration';
import type { GenerateRequest } from '../../funnel/lib/generateClient';
import { shellStore } from '../store/useShellStore';
import type { AgentRepairWorkflow } from '../store/shellStore';
import type { SelectedFeatureId } from '../types';

export interface GenerationReviewSnapshot {
    readonly fromCode: string;
    readonly promptText: string;
    readonly selectedFeatureId: SelectedFeatureId;
    readonly repairWorkflow: AgentRepairWorkflow | null;
}

interface UseAgentGenerationArgs {
    readonly phase: GenerationPhase;
    readonly submit: ReturnType<typeof useGeneration>['submit'];
    readonly currentCode: string;
    readonly prompt: string;
    readonly selectedFeatureId: SelectedFeatureId;
    readonly agentRepairWorkflow: AgentRepairWorkflow | null;
    readonly conceptBusy: boolean;
}

/**
 * Submits the unified prompt to the in-app agent: snapshots the editor source
 * for the review diff, prefixes a selected target, and promotes a matching
 * drafted repair workflow to `running`.
 */
export function useAgentGeneration({
    phase,
    submit,
    currentCode,
    prompt,
    selectedFeatureId,
    agentRepairWorkflow,
    conceptBusy,
}: UseAgentGenerationArgs) {
    // The editor source captured at submit time — the "before" side of the diff
    // (so the diff is stable even though `code` changes once we apply).
    const [baseline, setBaseline] = useState('');
    const [reviewSnapshot, setReviewSnapshot] = useState<GenerationReviewSnapshot | null>(null);

    const agentBusy = phase.state === 'running';
    // One operation at a time: the rail is too narrow to narrate two runs.
    const busy = agentBusy || conceptBusy;

    const runAgent = (
        text: string,
        snapshot: GenerationReviewSnapshot,
        photoReference?: GenerateRequest['referenceImage'],
    ) => {
        // Edit mode: hand the agent the current model so it iterates instead of
        // replacing. Empty editor → fresh generation.
        setBaseline(snapshot.fromCode);
        setReviewSnapshot(snapshot);
        if (snapshot.fromCode.trim()) {
            if (photoReference) {
                void submit(text, snapshot.fromCode, undefined, photoReference);
            } else {
                void submit(text, snapshot.fromCode);
            }
            return;
        }
        if (photoReference) {
            void submit(text, undefined, undefined, photoReference);
        } else {
            void submit(text);
        }
    };

    const onSubmit = (message?: string, referenceImage?: GenerateRequest['referenceImage']) => {
        const trimmed = (message ?? prompt).trim();
        if (!trimmed || busy) return;
        const matchesDraftedRepair =
            agentRepairWorkflow != null &&
            agentRepairWorkflow.state === 'drafted' &&
            agentRepairWorkflow.promptText === trimmed;
        const runTargetId =
            matchesDraftedRepair && agentRepairWorkflow.targetId === null
                ? null
                : selectedFeatureId;
        const agentPrompt = runTargetId === null ? trimmed : `Edit selected target "${runTargetId}": ${trimmed}`;
        let repairWorkflowForRun = agentRepairWorkflow;
        if (
            matchesDraftedRepair &&
            agentRepairWorkflow.targetId === runTargetId
        ) {
            repairWorkflowForRun = { ...agentRepairWorkflow, state: 'running' };
            shellStore.setAgentRepairWorkflow(repairWorkflowForRun);
        }
        runAgent(agentPrompt, {
            fromCode: currentCode,
            promptText: trimmed,
            selectedFeatureId: runTargetId,
            repairWorkflow: repairWorkflowForRun,
        }, referenceImage);
    };

    return { agentBusy, busy, baseline, reviewSnapshot, setBaseline, setReviewSnapshot, onSubmit };
}
