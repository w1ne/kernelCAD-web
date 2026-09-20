// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useEffect, useMemo } from 'react';
import { useGeneration } from '../funnel/hooks/useGeneration';
import { type GenerateEvent } from '../funnel/lib/generateClient';
import { useTextTo3dPreview } from '../funnel/hooks/useTextTo3dPreview';
import { inAppAgentEnabled } from './agentAvailability';
import { ConceptResult } from './components/ConceptResult';
import { GenerateForm } from './components/GenerateForm';
import { GenerationReviewPanel } from './components/GenerationReviewPanel';
import { GenerationStatus } from './components/GenerationStatus';
import { useCode } from './context/CodeContext';
import { useAgentGeneration } from './hooks/useAgentGeneration';
import { useConceptWorkflow } from './hooks/useConceptWorkflow';
import { useFeatureSelection } from './hooks/useFeatureSelection';
import { useGenerationReview } from './hooks/useGenerationReview';
import { usePromptDraft } from './hooks/usePromptDraft';
import { useShellStore, shellStore } from './store/useShellStore';

/** Web-only gate. No hooks here, so the conditional return is safe. */
export const StudioGenerate: React.FC = () => {
    if (!inAppAgentEnabled()) return null;
    return <StudioGenerateInner />;
};

/** Human-readable label for a streamed agent event (the live "what it's doing"). */
function stepLabel(e: GenerateEvent): string | null {
    switch (e.kind) {
        case 'status':
            return e.phase === 'tool_calling' ? 'using tools…' : 'thinking…';
        case 'tool_call':
            return `→ ${e.name}`;
        case 'tool_result':
            return `${e.ok ? '✓' : '⟳'} ${e.name}`;
        default:
            return null;
    }
}

const StudioGenerateInner: React.FC = () => {
    const { phase, events, submit } = useGeneration();
    const { code } = useCode();
    const currentCode = code ?? '';
    const { selectedFeatureId } = useFeatureSelection();
    const { agentDraftPrompt, agentDraftPromptVersion, agentRepairWorkflow, stagedEdit } = useShellStore();
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

    const steps = useMemo(() => events.map(stepLabel).filter(Boolean) as string[], [events]);

    useEffect(() => {
        if (phase.state !== 'error' || agentRepairWorkflow?.state !== 'running') return;
        shellStore.setAgentRepairWorkflow({ ...agentRepairWorkflow, state: 'drafted' });
    }, [agentRepairWorkflow, phase.state]);

    return (
        <div className="p-3 flex flex-col gap-2">
            <div className="uppercase tracking-wide text-[10px] text-gray-500">Agent</div>
            <GenerateForm
                selectedFeatureId={selectedFeatureId}
                prompt={prompt}
                onPromptChange={setPrompt}
                busy={busy}
                conceptBusy={conceptBusy}
                previewPhase={preview.phase}
                onSubmit={onSubmit}
                onConcept={onConcept}
            />

            {/* Live plan / tool-calls while the agent works. */}
            {agentBusy && (
                <div className="flex flex-col gap-0.5 max-h-28 overflow-auto" aria-live="polite">
                    {steps.length === 0 && <div className="text-[10px] text-gray-500">starting…</div>}
                    {steps.slice(-6).map((s, i) => (
                        <div key={i} className="text-[10px] text-gray-400 truncate font-mono">{s}</div>
                    ))}
                </div>
            )}

            {/* Review gate: diff + verified badge + accept/reject. Never auto-applies. */}
            {reviewing && phase.state === 'done' && (
                <GenerationReviewPanel
                    artifact={phase.artifact}
                    baseline={baseline}
                    stagedEdit={stagedEdit}
                    onStage={stageGeneratedEdit}
                    onReject={reject}
                />
            )}

            <GenerationStatus phase={phase} reviewing={reviewing} resolution={resolution} />

            <ConceptResult
                phase={preview.phase}
                onBuildAsCad={buildConceptAsCad}
                buildDisabled={busy}
            />
        </div>
    );
};

export default StudioGenerate;
