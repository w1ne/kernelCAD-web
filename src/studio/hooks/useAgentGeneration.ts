// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useRef, useState } from 'react';
import { useGeneration, type GenerationPhase } from '../../funnel/hooks/useGeneration';
import type { GenerateRequest } from '../../funnel/lib/generateClient';
import { repairPrompt } from '../agentRunModel';
import { shellStore } from '../store/useShellStore';
import type { AgentRepairWorkflow } from '../store/shellStore';
import type { SelectedFeatureId } from '../types';

export interface GenerationReviewSnapshot {
    readonly fromCode: string;
    readonly promptText: string;
    readonly selectedFeatureId: SelectedFeatureId;
    readonly repairWorkflow: AgentRepairWorkflow | null;
}

type ReferenceImage = GenerateRequest['referenceImage'];

/** A follow-up the user sent while a run was busy. */
export interface QueuedPrompt {
    readonly id: number;
    readonly text: string;
    readonly referenceImage?: ReferenceImage;
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

/** The request text the agent gets: the prompt, scoped to a selected target. */
function scopedPrompt(text: string, targetId: SelectedFeatureId): string {
    return targetId === null ? text : `Edit selected target "${targetId}": ${text}`;
}

/**
 * Submits the unified prompt to the in-app agent: snapshots the editor source
 * for the review diff, prefixes a selected target, and promotes a matching
 * drafted repair workflow to `running`. While a run is busy, new prompts
 * queue as follow-ups. The last run can be sent again (Retry) or sent back
 * with its error (Repair).
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
    const [lastReferenceImage, setLastReferenceImage] = useState<ReferenceImage>(undefined);
    const [queue, setQueue] = useState<readonly QueuedPrompt[]>([]);
    const nextQueueId = useRef(1);

    const agentBusy = phase.state === 'running';
    // One operation at a time: the pane narrates one run.
    const busy = agentBusy || conceptBusy;

    const runAgent = (
        text: string,
        snapshot: GenerationReviewSnapshot,
        photoReference?: ReferenceImage,
    ) => {
        // Edit mode: hand the agent the current model so it iterates instead of
        // replacing. Empty editor → fresh generation.
        setBaseline(snapshot.fromCode);
        setReviewSnapshot(snapshot);
        setLastReferenceImage(photoReference);
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

    const onSubmit = (message?: string, referenceImage?: ReferenceImage) => {
        const trimmed = (message ?? prompt).trim();
        if (!trimmed || conceptBusy) return;
        if (agentBusy) {
            // A follow-up: it runs after this run's change is reviewed.
            const id = nextQueueId.current++;
            setQueue((current) => [...current, { id, text: trimmed, ...(referenceImage ? { referenceImage } : {}) }]);
            return;
        }
        const matchesDraftedRepair =
            agentRepairWorkflow != null &&
            agentRepairWorkflow.state === 'drafted' &&
            agentRepairWorkflow.promptText === trimmed;
        const runTargetId =
            matchesDraftedRepair && agentRepairWorkflow.targetId === null
                ? null
                : selectedFeatureId;
        let repairWorkflowForRun = agentRepairWorkflow;
        if (
            matchesDraftedRepair &&
            agentRepairWorkflow.targetId === runTargetId
        ) {
            repairWorkflowForRun = { ...agentRepairWorkflow, state: 'running' };
            shellStore.setAgentRepairWorkflow(repairWorkflowForRun);
        }
        runAgent(scopedPrompt(trimmed, runTargetId), {
            fromCode: currentCode,
            promptText: trimmed,
            selectedFeatureId: runTargetId,
            repairWorkflow: repairWorkflowForRun,
        }, referenceImage);
    };

    /** Send the last request again, on the model as it is now. */
    const retry = () => {
        if (busy || reviewSnapshot == null) return;
        runAgent(scopedPrompt(reviewSnapshot.promptText, reviewSnapshot.selectedFeatureId), {
            ...reviewSnapshot,
            fromCode: currentCode,
        }, lastReferenceImage);
    };

    /** Send the last request back with the error, so the agent fixes its script. */
    const repair = (errorMessage: string) => {
        if (busy || reviewSnapshot == null) return;
        const text = repairPrompt(reviewSnapshot.promptText, errorMessage);
        runAgent(scopedPrompt(text, reviewSnapshot.selectedFeatureId), {
            ...reviewSnapshot,
            fromCode: currentCode,
            promptText: text,
        }, lastReferenceImage);
    };

    const removeQueued = useCallback((id: number) => {
        setQueue((current) => current.filter((item) => item.id !== id));
    }, []);

    /** Start the oldest queued follow-up now. */
    const sendNextQueued = () => {
        const next = queue[0];
        if (!next || busy) return;
        setQueue((current) => current.slice(1));
        onSubmit(next.text, next.referenceImage);
    };

    return {
        agentBusy,
        busy,
        baseline,
        reviewSnapshot,
        setBaseline,
        setReviewSnapshot,
        onSubmit,
        retry,
        repair,
        queue,
        removeQueued,
        sendNextQueued,
    };
}
