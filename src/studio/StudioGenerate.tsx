// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useEffect, useMemo } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useGeneration } from '../funnel/hooks/useGeneration';
import { type GenerateEvent } from '../funnel/lib/generateClient';
import { useTextTo3dPreview } from '../funnel/hooks/useTextTo3dPreview';
import { inAppAgentEnabled } from './agentAvailability';
import { ConceptResult } from './components/ConceptResult';
import { GenerateForm } from './components/GenerateForm';
import { useCode } from './context/CodeContext';
import { useAgentGeneration } from './hooks/useAgentGeneration';
import { useConceptWorkflow } from './hooks/useConceptWorkflow';
import { useFeatureSelection } from './hooks/useFeatureSelection';
import { useGenerationReview } from './hooks/useGenerationReview';
import { usePromptDraft } from './hooks/usePromptDraft';
import { useReferencePhoto } from './hooks/useReferencePhoto';
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
    const {
        pendingReferenceImage,
        knownDimensionLabel,
        setKnownDimensionLabel,
        knownDimensionMm,
        setKnownDimensionMm,
        referenceImageError,
        setReferenceImageError,
        readingReferenceImage,
        referenceImage,
        photoReferenceSelected,
        referenceNeedsDimension,
        onReferenceImageSelect,
    } = useReferencePhoto();

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
        referenceImage,
        referenceNeedsDimension,
        setReferenceImageError,
        readingReferenceImage,
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
        photoReferenceSelected,
        referenceNeedsDimension,
        setReferenceImageError,
        readingReferenceImage,
        referenceImage,
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
                currentCode={currentCode}
                busy={busy}
                agentBusy={agentBusy}
                conceptBusy={conceptBusy}
                previewPhase={preview.phase}
                photoReferenceSelected={photoReferenceSelected}
                referenceNeedsDimension={referenceNeedsDimension}
                readingReferenceImage={readingReferenceImage}
                pendingReferenceImage={pendingReferenceImage}
                knownDimensionLabel={knownDimensionLabel}
                onKnownDimensionLabelChange={setKnownDimensionLabel}
                knownDimensionMm={knownDimensionMm}
                onKnownDimensionMmChange={setKnownDimensionMm}
                referenceImageError={referenceImageError}
                onReferenceImageSelect={onReferenceImageSelect}
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
            {reviewing && phase.state === 'done' && stagedEdit == null && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] text-gray-300 truncate" title={phase.artifact.title}>
                            {phase.artifact.title}
                        </div>
                        <div className="text-[10px] text-green-500 whitespace-nowrap" title="Built and passed the kernel gates">
                            ✓ verified
                        </div>
                    </div>
                    <div className="rounded overflow-hidden border border-[#2a2e38]" style={{ height: 180 }}>
                        <DiffEditor
                            original={baseline}
                            modified={phase.artifact.code}
                            language="typescript"
                            theme="vs-dark"
                            options={{
                                readOnly: true,
                                renderSideBySide: false,
                                minimap: { enabled: false },
                                fontSize: 11,
                                lineNumbers: 'off',
                                scrollBeyondLastLine: false,
                                renderOverviewRuler: false,
                            }}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={stageGeneratedEdit}
                            className="flex-1 rounded bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-[11px] font-medium transition-colors"
                        >
                            Stage edit
                        </button>
                        <button
                            type="button"
                            onClick={reject}
                            className="flex-1 rounded bg-[#1a1d24] hover:bg-[#222630] text-gray-300 border border-[#2a2e38] px-3 py-1.5 text-[11px] font-medium transition-colors"
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}
            {reviewing && phase.state === 'done' && stagedEdit != null && (
                <div className="rounded border border-amber-900/60 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200">
                    Review the current staged edit before staging another proposal.
                </div>
            )}

            {phase.state === 'done' && !reviewing && resolution?.action === 'staged' && (
                <div className="text-[10px] text-green-500 truncate" aria-live="polite">
                    ✓ staged for review — {phase.artifact.title}
                </div>
            )}
            {phase.state === 'done' && !reviewing && resolution?.action === 'discarded' && (
                <div className="text-[10px] text-gray-500 truncate" aria-live="polite">
                    discarded — {phase.artifact.title}
                </div>
            )}
            {phase.state === 'error' && (
                <div className="text-[10px] text-red-400" aria-live="polite">
                    {phase.code === 'rate_limited'
                        ? 'Rate limit reached — try again in a minute.'
                        : `Didn't finish: ${phase.message.slice(0, 140)}`}
                </div>
            )}

            <ConceptResult
                phase={preview.phase}
                onBuildAsCad={buildConceptAsCad}
                buildDisabled={busy || readingReferenceImage || referenceNeedsDimension}
            />
        </div>
    );
};

export default StudioGenerate;
