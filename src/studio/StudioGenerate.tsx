// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useEffect, useRef } from 'react';
import { ListOrdered, Sparkles, X } from 'lucide-react';
import { useGeneration, type GenerationPhase } from '../funnel/hooks/useGeneration';
import { useTextTo3dPreview } from '../funnel/hooks/useTextTo3dPreview';
import { buttonClass } from '../ui/buttonStyles';
import { cx } from '../ui/cx';
import { AGENT_STARTER_PROMPTS } from './activityBarModel';
import { inAppAgentEnabled } from './agentAvailability';
import { ownAgentPrompt } from './agentRunModel';
import { ConceptResult } from './components/ConceptResult';
import { GenerateForm } from './components/GenerateForm';
import { GenerationReviewPanel } from './components/GenerationReviewPanel';
import { GenerationStatus, RunProgress } from './components/GenerationStatus';
import { useCode } from './context/CodeContext';
import { useGeometry } from './context/GeometryContext';
import { useAgentGeneration, type GenerationReviewSnapshot, type QueuedPrompt } from './hooks/useAgentGeneration';
import { useConceptWorkflow } from './hooks/useConceptWorkflow';
import { useFeatureSelection } from './hooks/useFeatureSelection';
import { useGenerationReview } from './hooks/useGenerationReview';
import { usePromptDraft } from './hooks/usePromptDraft';
import { useStagedEditActions } from './hooks/useStagedEditActions';
import { useShellStore, shellStore } from './store/useShellStore';
import type { AgentRepairWorkflow, StagedEdit } from './store/shellStore';

/** Web-only gate. No hooks here, so the conditional return is safe. */
export const StudioGenerate: React.FC = () => {
    if (!inAppAgentEnabled()) return null;
    return <StudioGenerateInner />;
};

const pillClass =
    'focus-ring rounded-control border border-border bg-surface-2 px-2.5 py-1.5 text-left text-ui text-fg-2 transition-colors duration-80 hover:border-agent hover:text-fg max-md:min-h-touch';

/** Before the first run: what the agent does and prompts to start from. */
function AgentIntro({ onPick }: { onPick: (prompt: string) => void }) {
    return (
        <div className="flex flex-col gap-3" data-testid="agent-intro">
            <div>
                <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-agent-fg" strokeWidth={1.75} aria-hidden="true" />
                    <p className="text-body font-medium text-fg">Describe a part or a change</p>
                </div>
                <p className="mt-1 text-ui text-fg-2">
                    The agent writes the model code, builds and checks it, and shows you the change before anything is applied.
                </p>
            </div>
            <div className="flex flex-col gap-1.5">
                <p className="text-2xs font-medium uppercase tracking-wider text-fg-3">Start from</p>
                {AGENT_STARTER_PROMPTS.map((prompt) => (
                    <button key={prompt} type="button" className={pillClass} onClick={() => onPick(prompt)}>{prompt}</button>
                ))}
            </div>
        </div>
    );
}

/** Follow-ups sent while a run was busy. They run after the change is reviewed. */
function FollowUpQueue({ queue, paused, canSend, onSend, onRemove }: {
    queue: readonly QueuedPrompt[];
    paused: boolean;
    canSend: boolean;
    onSend: () => void;
    onRemove: (id: number) => void;
}) {
    if (queue.length === 0) return null;
    return (
        <section aria-label="Queued follow-ups" className="flex flex-col gap-1.5" data-testid="agent-queue">
            <p className="flex items-center gap-1.5 text-2xs font-medium text-fg-3">
                <ListOrdered className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                {paused
                    ? 'Queued · paused because the last run did not finish'
                    : 'Queued · runs after you accept or discard the change'}
            </p>
            <ol className="flex flex-col gap-1">
                {queue.map((item, index) => (
                    <li key={item.id} className="flex items-center gap-1 rounded-control bg-surface-2 py-0.5 pl-2 pr-0.5">
                        <span className="min-w-0 flex-1 truncate text-ui text-fg-2" title={item.text}>{item.text}</span>
                        {index === 0 && canSend && (
                            <button type="button" onClick={onSend} className={cx(buttonClass('ghost', 'sm'), 'text-agent-fg max-md:h-touch')}>
                                Send now
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            aria-label={`Remove queued follow-up: ${item.text}`}
                            className={cx(buttonClass('ghost', 'sm'), 'w-control-sm px-0 max-md:size-touch')}
                        >
                            <X className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ol>
        </section>
    );
}

/** The prompt of the current run, as the user sent it. */
function UserMessage({ snapshot }: { snapshot: GenerationReviewSnapshot }) {
    return (
        <div className="self-end max-w-[90%] rounded-panel bg-surface-3 px-3 py-2" data-testid="agent-user-message">
            <p className="sr-only">You asked:</p>
            <p className="line-clamp-6 whitespace-pre-wrap break-words text-body text-fg">{snapshot.promptText}</p>
            {snapshot.selectedFeatureId && (
                <p className="mt-1 text-2xs text-fg-3">Target: {snapshot.selectedFeatureId}</p>
            )}
        </div>
    );
}

/** Follow-up ideas from the agent's result; a click puts one in the composer. */
function Suggestions({ items, onPick }: { items: readonly string[]; onPick: (text: string) => void }) {
    if (items.length === 0) return null;
    return (
        <div className="flex flex-col gap-1.5" data-testid="agent-suggestions">
            <p className="text-2xs font-medium uppercase tracking-wider text-fg-3">Next</p>
            <div className="flex flex-wrap gap-1.5">
                {items.map((s) => (
                    <button key={s} type="button" className={cx(pillClass, 'rounded-full py-1')} onClick={() => onPick(s)}>{s}</button>
                ))}
            </div>
        </div>
    );
}

/**
 * Accept = stage the proposal, then approve it through the shared
 * staged-edit path (one undo step, saved; refused if the editor moved on,
 * in which case it waits in the review card on the model).
 */
function useAcceptProposal(phase: GenerationPhase, stagedEdit: StagedEdit | null, stage: () => void) {
    const { appliedEditHistory } = useShellStore();
    const { stagedEdit: slotEdit, handleApprove } = useStagedEditActions();
    const pendingApprove = useRef<string | null>(null);
    const accept = () => {
        if (phase.state !== 'done' || stagedEdit != null) return;
        pendingApprove.current = `agent:${phase.generationId}`;
        stage();
    };
    useEffect(() => {
        if (pendingApprove.current == null || slotEdit?.id !== pendingApprove.current) return;
        pendingApprove.current = null;
        void handleApprove();
    }, [slotEdit, handleApprove]);
    const applied = phase.state === 'done'
        && appliedEditHistory.some((entry) => entry.editId === `agent:${phase.generationId}` && entry.outcome === 'approved');
    return { accept, applied };
}

/** Start the next queued follow-up once `ready` (asynchronously, after the render). */
function useQueueRunner(ready: boolean, sendNext: () => void) {
    useEffect(() => {
        if (!ready) return;
        const id = window.setTimeout(sendNext, 0);
        return () => window.clearTimeout(id);
    }, [ready, sendNext]);
}

/** A failed repair run goes back to "drafted", so the Checks card can offer it again. */
function useRepairRollback(phase: GenerationPhase, workflow: AgentRepairWorkflow | null) {
    useEffect(() => {
        if (phase.state !== 'error' || workflow?.state !== 'running') return;
        shellStore.setAgentRepairWorkflow({ ...workflow, state: 'drafted' });
    }, [workflow, phase.state]);
}

/** All state of the agent pane: the run, the review, the queue and the composer. */
function useAgentPane() {
    const { phase, events, submit, cancel } = useGeneration();
    const { code } = useCode();
    const currentCode = code ?? '';
    const { executeGeometry } = useGeometry();
    const { selectedFeatureId, selectFeature } = useFeatureSelection();
    const { agentDraftPrompt, agentDraftPromptVersion, agentRepairWorkflow, stagedEdit } = useShellStore();
    const { prompt, setPrompt } = usePromptDraft(agentDraftPrompt, agentDraftPromptVersion);

    // The single prompt box also drives the paid 3D concept preview.
    const preview = useTextTo3dPreview();
    const conceptBusy = preview.phase.state === 'running';
    const run = useAgentGeneration({
        phase, submit, currentCode, prompt, selectedFeatureId, agentRepairWorkflow, conceptBusy,
    });
    const review = useGenerationReview({
        phase, stagedEdit, currentCode, prompt, selectedFeatureId, agentRepairWorkflow,
        reviewSnapshot: run.reviewSnapshot,
    });
    const concept = useConceptWorkflow({
        prompt, busy: run.busy, currentCode, selectedFeatureId, agentRepairWorkflow, submit, preview,
        setBaseline: run.setBaseline, setReviewSnapshot: run.setReviewSnapshot,
    });
    const { accept, applied } = useAcceptProposal(phase, stagedEdit, review.stageGeneratedEdit);
    useRepairRollback(phase, agentRepairWorkflow);

    // A queued follow-up starts once the agent is free and nothing waits for
    // review. After a failed run the queue pauses; the user sends it on.
    const agentFree = !run.busy && !review.reviewing && stagedEdit == null;
    useQueueRunner(run.queue.length > 0 && agentFree && phase.state !== 'error', run.sendNextQueued);

    const snapshot = run.reviewSnapshot;
    const copyForOwnAgent = (failure: { title: string; detail: string }) => ownAgentPrompt({
        promptText: snapshot?.promptText ?? prompt,
        targetId: snapshot ? snapshot.selectedFeatureId : selectedFeatureId,
        code: snapshot?.fromCode ?? currentCode,
        failure,
    });
    return {
        phase, events, cancel, currentCode, executeGeometry, selectedFeatureId, selectFeature, stagedEdit,
        prompt, setPrompt, preview, conceptBusy, run, review, concept, accept, applied, agentFree, copyForOwnAgent,
    };
}

type AgentPaneState = ReturnType<typeof useAgentPane>;

/** The conversation: intro or the sent prompt, the run, the proposal, the outcome. */
function AgentTranscript({ pane }: { pane: AgentPaneState }) {
    const { phase, run, review, preview } = pane;
    const snapshot = run.reviewSnapshot;
    const started = phase.state !== 'idle' && snapshot != null;
    const suggestions = phase.state === 'done' ? phase.artifact.suggestions.filter((s) => s.trim()).slice(0, 3) : [];
    const showIntro = !started && (preview.phase.state === 'idle' || preview.phase.state === 'unavailable');

    // Keep the newest card in view when the run changes state: the top of a
    // proposal (so Accept is reachable in a short phone sheet), else the end.
    const endRef = useRef<HTMLDivElement>(null);
    const proposalRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const target = proposalRef.current ?? endRef.current;
        target?.scrollIntoView?.({ block: proposalRef.current ? 'start' : 'nearest' });
    }, [phase.state]);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3" data-testid="agent-transcript">
            {showIntro && <AgentIntro onPick={pane.setPrompt} />}
            {started && <UserMessage snapshot={snapshot} />}
            <RunProgress phase={phase} events={pane.events} onCancel={pane.cancel} />

            {/* Review gate: size, verified badge, before/after, diff, accept/discard. Never auto-applies. */}
            {review.reviewing && phase.state === 'done' && (
                <div ref={proposalRef} className="scroll-mt-3"><GenerationReviewPanel
                    key={phase.generationId}
                    artifact={phase.artifact}
                    partial={phase.partial}
                    baseline={run.baseline}
                    stagedEdit={pane.stagedEdit}
                    currentCode={pane.currentCode}
                    onAccept={pane.accept}
                    onReject={review.reject}
                    renderInViewer={pane.executeGeometry}
                /></div>
            )}

            <GenerationStatus
                phase={phase}
                reviewing={review.reviewing}
                resolution={review.resolution}
                applied={pane.applied}
                onRetry={snapshot ? run.retry : undefined}
                onRepair={snapshot ? run.repair : undefined}
                ownAgentPrompt={pane.copyForOwnAgent}
            />

            {!run.busy && <Suggestions items={suggestions} onPick={pane.setPrompt} />}

            <ConceptResult phase={preview.phase} onBuildAsCad={pane.concept.buildConceptAsCad} buildDisabled={run.busy} />
            <div ref={endRef} />
        </div>
    );
}

const StudioGenerateInner: React.FC = () => {
    const pane = useAgentPane();
    const { run } = pane;
    return (
        <div className="flex h-full min-h-0 flex-col">
            <AgentTranscript pane={pane} />
            <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
                <FollowUpQueue
                    queue={run.queue}
                    paused={pane.phase.state === 'error'}
                    canSend={pane.agentFree}
                    onSend={run.sendNextQueued}
                    onRemove={run.removeQueued}
                />
                <GenerateForm
                    selectedFeatureId={pane.selectedFeatureId}
                    prompt={pane.prompt}
                    onPromptChange={pane.setPrompt}
                    busy={run.busy}
                    conceptBusy={pane.conceptBusy}
                    previewPhase={pane.preview.phase}
                    onSubmit={run.onSubmit}
                    onConcept={pane.concept.onConcept}
                    agentBusy={run.agentBusy}
                    onClearTarget={() => pane.selectFeature(null)}
                />
            </div>
        </div>
    );
};

export default StudioGenerate;
