// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useEffect, useRef } from 'react';
import { ListOrdered, Sparkles, X } from 'lucide-react';
import { useGeneration } from '../funnel/hooks/useGeneration';
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
import { useAgentGeneration, type QueuedPrompt } from './hooks/useAgentGeneration';
import { useConceptWorkflow } from './hooks/useConceptWorkflow';
import { useFeatureSelection } from './hooks/useFeatureSelection';
import { useGenerationReview } from './hooks/useGenerationReview';
import { usePromptDraft } from './hooks/usePromptDraft';
import { useStagedEditActions } from './hooks/useStagedEditActions';
import { useShellStore, shellStore } from './store/useShellStore';

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

const StudioGenerateInner: React.FC = () => {
    const { phase, events, submit, cancel } = useGeneration();
    const { code } = useCode();
    const currentCode = code ?? '';
    const { executeGeometry } = useGeometry();
    const { selectedFeatureId, selectFeature } = useFeatureSelection();
    const { agentDraftPrompt, agentDraftPromptVersion, agentRepairWorkflow, stagedEdit, appliedEditHistory } = useShellStore();
    const { prompt, setPrompt } = usePromptDraft(agentDraftPrompt, agentDraftPromptVersion);

    // The single prompt box also drives the paid 3D concept preview.
    const preview = useTextTo3dPreview();
    const conceptBusy = preview.phase.state === 'running';
    const {
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
    } = useAgentGeneration({
        phase,
        submit,
        currentCode,
        prompt,
        selectedFeatureId,
        agentRepairWorkflow,
        conceptBusy,
    });

    const {
        resolution,
        reviewing,
        stageGeneratedEdit,
        reject,
    } = useGenerationReview({
        phase,
        stagedEdit,
        currentCode,
        prompt,
        selectedFeatureId,
        agentRepairWorkflow,
        reviewSnapshot,
    });

    const { onConcept, buildConceptAsCad } = useConceptWorkflow({
        prompt,
        busy,
        currentCode,
        selectedFeatureId,
        agentRepairWorkflow,
        submit,
        preview,
        setBaseline,
        setReviewSnapshot,
    });

    // Accept = stage the proposal, then approve it through the shared
    // staged-edit path (one undo step, saved; refused if the editor moved on).
    const staged = useStagedEditActions();
    const pendingApprove = useRef<string | null>(null);
    const onAccept = () => {
        if (phase.state !== 'done' || stagedEdit != null) return;
        pendingApprove.current = `agent:${phase.generationId}`;
        stageGeneratedEdit();
    };
    const { stagedEdit: slotEdit, handleApprove } = staged;
    useEffect(() => {
        if (pendingApprove.current == null || slotEdit?.id !== pendingApprove.current) return;
        pendingApprove.current = null;
        void handleApprove();
    }, [slotEdit, handleApprove]);
    const applied = phase.state === 'done'
        && appliedEditHistory.some((entry) => entry.editId === `agent:${phase.generationId}` && entry.outcome === 'approved');

    useEffect(() => {
        if (phase.state !== 'error' || agentRepairWorkflow?.state !== 'running') return;
        shellStore.setAgentRepairWorkflow({ ...agentRepairWorkflow, state: 'drafted' });
    }, [agentRepairWorkflow, phase.state]);

    // A queued follow-up starts once the agent is free and nothing waits for
    // review. After a failed run the queue pauses; the user sends it on.
    const queueReady = queue.length > 0 && !busy && !reviewing && stagedEdit == null && phase.state !== 'error';
    useEffect(() => {
        if (!queueReady) return;
        const id = window.setTimeout(sendNextQueued, 0);
        return () => window.clearTimeout(id);
    }, [queueReady, sendNextQueued]);

    // Keep the newest card in view when the run changes state.
    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        endRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [phase.state]);

    const copyForOwnAgent = (failure: { title: string; detail: string }) => ownAgentPrompt({
        promptText: reviewSnapshot?.promptText ?? prompt,
        targetId: reviewSnapshot?.selectedFeatureId ?? selectedFeatureId,
        code: reviewSnapshot?.fromCode ?? currentCode,
        failure,
    });
    const suggestions = phase.state === 'done' ? phase.artifact.suggestions.filter((s) => s.trim()).slice(0, 3) : [];
    const started = phase.state !== 'idle' && reviewSnapshot != null;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3" data-testid="agent-transcript">
                {!started && (preview.phase.state === 'idle' || preview.phase.state === 'unavailable') && <AgentIntro onPick={setPrompt} />}

                {started && (
                    <div className="self-end max-w-[90%] rounded-panel bg-surface-3 px-3 py-2" data-testid="agent-user-message">
                        <p className="sr-only">You asked:</p>
                        <p className="line-clamp-6 whitespace-pre-wrap break-words text-body text-fg">{reviewSnapshot.promptText}</p>
                        {reviewSnapshot.selectedFeatureId && (
                            <p className="mt-1 text-2xs text-fg-3">Target: {reviewSnapshot.selectedFeatureId}</p>
                        )}
                    </div>
                )}

                <RunProgress phase={phase} events={events} onCancel={cancel} />

                {/* Review gate: size, verified badge, before/after, diff, accept/discard. Never auto-applies. */}
                {reviewing && phase.state === 'done' && (
                    <GenerationReviewPanel
                        key={phase.generationId}
                        artifact={phase.artifact}
                        partial={phase.partial}
                        baseline={baseline}
                        stagedEdit={stagedEdit}
                        currentCode={currentCode}
                        onAccept={onAccept}
                        onReject={reject}
                        renderInViewer={executeGeometry}
                    />
                )}

                <GenerationStatus
                    phase={phase}
                    reviewing={reviewing}
                    resolution={resolution}
                    applied={applied}
                    onRetry={reviewSnapshot ? retry : undefined}
                    onRepair={reviewSnapshot ? repair : undefined}
                    ownAgentPrompt={copyForOwnAgent}
                />

                {suggestions.length > 0 && !busy && (
                    <div className="flex flex-col gap-1.5" data-testid="agent-suggestions">
                        <p className="text-2xs font-medium uppercase tracking-wider text-fg-3">Next</p>
                        <div className="flex flex-wrap gap-1.5">
                            {suggestions.map((s) => (
                                <button key={s} type="button" className={cx(pillClass, 'rounded-full py-1')} onClick={() => setPrompt(s)}>{s}</button>
                            ))}
                        </div>
                    </div>
                )}

                <ConceptResult
                    phase={preview.phase}
                    onBuildAsCad={buildConceptAsCad}
                    buildDisabled={busy}
                />
                <div ref={endRef} />
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
                <FollowUpQueue
                    queue={queue}
                    paused={phase.state === 'error'}
                    canSend={!busy && !reviewing && stagedEdit == null}
                    onSend={sendNextQueued}
                    onRemove={removeQueued}
                />
                <GenerateForm
                    selectedFeatureId={selectedFeatureId}
                    prompt={prompt}
                    onPromptChange={setPrompt}
                    busy={busy}
                    conceptBusy={conceptBusy}
                    previewPhase={preview.phase}
                    onSubmit={onSubmit}
                    onConcept={onConcept}
                    agentBusy={agentBusy}
                    onClearTarget={() => selectFeature(null)}
                />
            </div>
        </div>
    );
};

export default StudioGenerate;
