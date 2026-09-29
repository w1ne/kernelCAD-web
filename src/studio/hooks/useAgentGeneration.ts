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
    readonly submit: Submit;
    readonly currentCode: string;
    readonly prompt: string;
    readonly selectedFeatureId: SelectedFeatureId;
    readonly agentRepairWorkflow: AgentRepairWorkflow | null;
    readonly conceptBusy: boolean;
}

type Submit = ReturnType<typeof useGeneration>['submit'];

/** Start a run: edit mode with the current model, or a fresh generation for an empty editor. */
function dispatchRun(submit: Submit, text: string, fromCode: string, photoReference?: ReferenceImage): void {
    const code = fromCode.trim() ? fromCode : undefined;
    if (photoReference) {
        void submit(text, code, undefined, photoReference);
    } else if (code !== undefined) {
        void submit(text, code);
    } else {
        void submit(text);
    }
}

/** Follow-ups typed while a run is busy, oldest first. */
function useFollowUpQueue() {
    const [queue, setQueue] = useState<readonly QueuedPrompt[]>([]);
    const nextId = useRef(1);
    const enqueue = useCallback((text: string, referenceImage?: ReferenceImage) => {
        const id = nextId.current++;
        setQueue((current) => [...current, { id, text, ...(referenceImage ? { referenceImage } : {}) }]);
    }, []);
    const removeQueued = useCallback((id: number) => {
        setQueue((current) => current.filter((item) => item.id !== id));
    }, []);
    return { queue, enqueue, removeQueued };
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
    const { queue, enqueue, removeQueued } = useFollowUpQueue();

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
        dispatchRun(submit, text, snapshot.fromCode, photoReference);
    };

    const onSubmit = (message?: string, referenceImage?: ReferenceImage) => {
        const trimmed = (message ?? prompt).trim();
        if (!trimmed || conceptBusy) return;
        if (agentBusy) {
            // A follow-up: it runs after this run's change is reviewed.
            enqueue(trimmed, referenceImage);
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

    /** Start the oldest queued follow-up now. */
    const sendNextQueued = () => {
        const next = queue[0];
        if (!next || busy) return;
        removeQueued(next.id);
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
