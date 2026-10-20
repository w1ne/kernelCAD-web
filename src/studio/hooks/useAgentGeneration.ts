// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useRef, useState } from 'react';
import { useGeneration, type GenerationPhase } from '../../funnel/hooks/useGeneration';
import type { GenerateRequest } from '../../funnel/lib/generateClient';
import { repairPrompt } from '../agentRunModel';
import { shellStore } from '../store/useShellStore';
import type { AgentRepairWorkflow } from '../store/shellStore';
import type { SelectedFeatureId } from '../types';
import type { MarkupSnapshot } from '../markup/markupSnapshot';
import { attachMarkupSnapshotToPrompt } from '../markup/markupSnapshot';

export interface GenerationReviewSnapshot {
    readonly fromCode: string;
    readonly promptText: string;
    readonly selectedFeatureId: SelectedFeatureId;
    readonly repairWorkflow: AgentRepairWorkflow | null;
    readonly markupSnapshot: MarkupSnapshot;
}

type ReferenceImage = GenerateRequest['referenceImage'];
type Attachments = GenerateRequest['attachments'];

/** A follow-up the user sent while a run was busy. */
export interface QueuedPrompt {
    readonly id: number;
    readonly text: string;
    readonly referenceImage?: ReferenceImage;
    readonly attachments?: Attachments;
    readonly markupSnapshot: MarkupSnapshot;
}

interface UseAgentGenerationArgs {
    readonly phase: GenerationPhase;
    readonly submit: Submit;
    readonly currentCode: string;
    readonly prompt: string;
    readonly selectedFeatureId: SelectedFeatureId;
    readonly agentRepairWorkflow: AgentRepairWorkflow | null;
    readonly conceptBusy: boolean;
    readonly captureMarkupSnapshot: () => MarkupSnapshot;
}

type Submit = ReturnType<typeof useGeneration>['submit'];

/** Start a run: edit mode with the current model, or a fresh generation for an empty editor. */
function dispatchRun(submit: Submit, requestText: string, fromCode: string, photoReference?: ReferenceImage, attachments?: Attachments): void {
    const code = fromCode.trim() ? fromCode : undefined;
    if (attachments?.length) {
        void submit(requestText, code, undefined, photoReference, attachments);
    } else if (photoReference) {
        void submit(requestText, code, undefined, photoReference);
    } else if (code !== undefined) {
        void submit(requestText, code);
    } else {
        void submit(requestText);
    }
}

/** Follow-ups typed while a run is busy, oldest first. */
function useFollowUpQueue() {
    const [queue, setQueue] = useState<readonly QueuedPrompt[]>([]);
    const nextId = useRef(1);
    const enqueue = useCallback((text: string, referenceImage: ReferenceImage | undefined, attachments: Attachments | undefined, markupSnapshot: MarkupSnapshot) => {
        const id = nextId.current++;
        setQueue((current) => [...current, {
            id,
            text,
            ...(referenceImage ? { referenceImage } : {}),
            ...(attachments?.length ? { attachments } : {}),
            markupSnapshot,
        }]);
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

type PromptErrorSetter = (message: string | null) => void;

function captureMarkupForSubmit(
    captured: MarkupSnapshot | undefined,
    capture: () => MarkupSnapshot,
    setPromptError: PromptErrorSetter,
): MarkupSnapshot | null {
    try {
        return captured ?? capture();
    } catch {
        setPromptError('Studio markup exceeds its snapshot limits. Remove some notes, measurements, or picked topology, then try again.');
        return null;
    }
}

function enqueueFollowUp(
    text: string,
    referenceImage: ReferenceImage | undefined,
    attachments: Attachments | undefined,
    markupSnapshot: MarkupSnapshot,
    selectedFeatureId: SelectedFeatureId,
    enqueue: (text: string, referenceImage: ReferenceImage | undefined, attachments: Attachments | undefined, snapshot: MarkupSnapshot) => void,
    setPromptError: PromptErrorSetter,
): boolean {
    try {
        attachMarkupSnapshotToPrompt(scopedPrompt(text, selectedFeatureId), markupSnapshot);
    } catch (error) {
        setPromptError(error instanceof Error ? error.message : 'The prompt plus Studio markup is too large. Remove some markup or shorten the prompt.');
        return false;
    }
    setPromptError(null);
    enqueue(text, referenceImage, attachments, markupSnapshot);
    return true;
}

function repairRunContext(
    workflow: AgentRepairWorkflow | null,
    prompt: string,
    selectedFeatureId: SelectedFeatureId,
): { targetId: SelectedFeatureId; workflowForRun: AgentRepairWorkflow | null; markRunning: boolean } {
    const matchesDraftedRepair = workflow?.state === 'drafted' && workflow.promptText === prompt;
    const targetId = matchesDraftedRepair && workflow?.targetId === null ? null : selectedFeatureId;
    const markRunning = matchesDraftedRepair && workflow?.targetId === targetId;
    const workflowForRun = markRunning && workflow ? { ...workflow, state: 'running' as const } : workflow;
    return { targetId, workflowForRun, markRunning };
}

function startAgentRun(
    submit: Submit,
    text: string,
    snapshot: GenerationReviewSnapshot,
    photoReference: ReferenceImage | undefined,
    attachments: Attachments | undefined,
    setters: {
        setPromptError: PromptErrorSetter;
        setBaseline: (value: string) => void;
        setReviewSnapshot: (snapshot: GenerationReviewSnapshot) => void;
        setLastReferenceImage: (reference: ReferenceImage) => void;
        setLastAttachments: (attachments: Attachments) => void;
    },
): boolean {
    let requestText: string;
    try {
        requestText = attachMarkupSnapshotToPrompt(text, snapshot.markupSnapshot);
    } catch (error) {
        setters.setPromptError(error instanceof Error
            ? error.message
            : 'The Studio markup snapshot is too large. Remove some markup or shorten the prompt.');
        return false;
    }
    setters.setPromptError(null);
    setters.setBaseline(snapshot.fromCode);
    setters.setReviewSnapshot(snapshot);
    setters.setLastReferenceImage(photoReference);
    setters.setLastAttachments(attachments);
    dispatchRun(submit, requestText, snapshot.fromCode, photoReference, attachments);
    return true;
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
    captureMarkupSnapshot,
}: UseAgentGenerationArgs) {
    // The editor source captured at submit time — the "before" side of the diff
    // (so the diff is stable even though `code` changes once we apply).
    const [baseline, setBaseline] = useState('');
    const [reviewSnapshot, setReviewSnapshot] = useState<GenerationReviewSnapshot | null>(null);
    const [promptError, setPromptError] = useState<string | null>(null);
    const [lastReferenceImage, setLastReferenceImage] = useState<ReferenceImage>(undefined);
    const [lastAttachments, setLastAttachments] = useState<Attachments>(undefined);
    const { queue, enqueue, removeQueued } = useFollowUpQueue();

    const agentBusy = phase.state === 'running';
    // One operation at a time: the pane narrates one run.
    const busy = agentBusy || conceptBusy;

    const runAgent = (
        text: string,
        snapshot: GenerationReviewSnapshot,
        photoReference?: ReferenceImage,
        attachments?: Attachments,
    ) => startAgentRun(submit, text, snapshot, photoReference, attachments, {
        setPromptError,
        setBaseline,
        setReviewSnapshot,
        setLastReferenceImage,
        setLastAttachments,
    });

    const onSubmit = (message?: string, referenceImage?: ReferenceImage, attachments?: Attachments, capturedMarkup?: MarkupSnapshot): boolean => {
        const trimmed = (message ?? prompt).trim();
        if (!trimmed || conceptBusy) return false;
        const markupSnapshot = captureMarkupForSubmit(capturedMarkup, captureMarkupSnapshot, setPromptError);
        if (!markupSnapshot) return false;
        if (agentBusy) {
            return enqueueFollowUp(trimmed, referenceImage, attachments, markupSnapshot, selectedFeatureId, enqueue, setPromptError);
        }
        const repair = repairRunContext(agentRepairWorkflow, trimmed, selectedFeatureId);
        const accepted = runAgent(scopedPrompt(trimmed, repair.targetId), {
            fromCode: currentCode,
            promptText: trimmed,
            selectedFeatureId: repair.targetId,
            repairWorkflow: repair.workflowForRun,
            markupSnapshot,
        }, referenceImage, attachments);
        if (accepted && repair.markRunning && repair.workflowForRun) shellStore.setAgentRepairWorkflow(repair.workflowForRun);
        return accepted;
    };

    /** Send the last request again, on the model as it is now. */
    const retry = () => {
        if (busy || reviewSnapshot == null) return;
        runAgent(scopedPrompt(reviewSnapshot.promptText, reviewSnapshot.selectedFeatureId), {
            ...reviewSnapshot,
            fromCode: currentCode,
        }, lastReferenceImage, lastAttachments);
    };

    /** Send the last request back with the error, so the agent fixes its script. */
    const repair = (errorMessage: string) => {
        if (busy || reviewSnapshot == null) return;
        const text = repairPrompt(reviewSnapshot.promptText, errorMessage);
        runAgent(scopedPrompt(text, reviewSnapshot.selectedFeatureId), {
            ...reviewSnapshot,
            fromCode: currentCode,
            promptText: text,
        }, lastReferenceImage, lastAttachments);
    };

    /** Start the oldest queued follow-up now. */
    const sendNextQueued = () => {
        const next = queue[0];
        if (!next || busy) return;
        removeQueued(next.id);
        onSubmit(next.text, next.referenceImage, next.attachments, next.markupSnapshot);
    };

    return {
        agentBusy,
        busy,
        promptError,
        clearPromptError: () => setPromptError(null),
        reportPromptError: setPromptError,
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
