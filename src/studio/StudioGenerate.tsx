// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useEffect, useMemo, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useGeneration } from '../funnel/hooks/useGeneration';
import {
    isReferenceImageMimeType,
    MAX_REFERENCE_IMAGE_BYTES,
    type GenerateEvent,
    type GenerateRequest,
} from '../funnel/lib/generateClient';
import { useTextTo3dPreview } from '../funnel/hooks/useTextTo3dPreview';
import { inAppAgentEnabled } from './agentAvailability';
import { ConceptResult } from './components/ConceptResult';
import { useCode } from './context/CodeContext';
import { useFeatureSelection } from './hooks/useFeatureSelection';
import { useShellStore, shellStore } from './store/useShellStore';
import type { AgentRepairWorkflow } from './store/shellStore';
import type { SelectedFeatureId } from './types';

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

interface GenerationReviewSnapshot {
    readonly fromCode: string;
    readonly promptText: string;
    readonly selectedFeatureId: SelectedFeatureId;
    readonly repairWorkflow: AgentRepairWorkflow | null;
}

type PendingReferenceImage = Pick<NonNullable<GenerateRequest['referenceImage']>, 'dataUrl' | 'fileName' | 'mimeType'>;

function photoReferenceFrom(
    pending: PendingReferenceImage | null,
    dimensionLabel: string,
    dimensionMmText: string,
): GenerateRequest['referenceImage'] | null {
    const valueMm = Number(dimensionMmText);
    const label = dimensionLabel.trim();
    if (pending == null || !label || !Number.isFinite(valueMm) || valueMm <= 0) return null;
    return {
        ...pending,
        knownDimension: { label, valueMm },
    };
}

const StudioGenerateInner: React.FC = () => {
    const { phase, events, submit } = useGeneration();
    const { code } = useCode();
    const currentCode = code ?? '';
    const { selectedFeatureId } = useFeatureSelection();
    const { agentDraftPrompt, agentDraftPromptVersion, agentRepairWorkflow, stagedEdit } = useShellStore();
    const [editedPrompt, setEditedPrompt] = useState('');
    const [acknowledgedDraftVersion, setAcknowledgedDraftVersion] = useState(-1);
    // The generationId we've already staged/rejected — gates the review panel
    // so a resolved proposal doesn't reappear.
    const [resolution, setResolution] = useState<{ generationId: string; action: 'staged' | 'discarded' } | null>(null);
    // The editor source captured at submit time — the "before" side of the diff
    // (so the diff is stable even though `code` changes once we apply).
    const [baseline, setBaseline] = useState('');
    const [reviewSnapshot, setReviewSnapshot] = useState<GenerationReviewSnapshot | null>(null);
    const [pendingReferenceImage, setPendingReferenceImage] = useState<PendingReferenceImage | null>(null);
    const [knownDimensionLabel, setKnownDimensionLabel] = useState('');
    const [knownDimensionMm, setKnownDimensionMm] = useState('');
    const [referenceImageError, setReferenceImageError] = useState<string | null>(null);
    const [readingReferenceImage, setReadingReferenceImage] = useState(false);

    const prompt =
        agentDraftPrompt !== null && agentDraftPromptVersion !== acknowledgedDraftVersion
            ? agentDraftPrompt
            : editedPrompt;

    const setPrompt = (nextPrompt: string) => {
        setAcknowledgedDraftVersion(agentDraftPromptVersion);
        setEditedPrompt(nextPrompt);
    };

    // The single prompt box also drives the paid 3D concept preview.
    const preview = useTextTo3dPreview();
    // The prompt the last concept was generated from — Build-as-CAD uses what
    // the user actually previewed even if they edited the box afterwards.
    const [conceptPrompt, setConceptPrompt] = useState('');

    const agentBusy = phase.state === 'running';
    const conceptBusy = preview.phase.state === 'running';
    // One operation at a time: the rail is too narrow to narrate two runs.
    const busy = agentBusy || conceptBusy;
    // A finished, not-yet-resolved proposal → show the review (diff + accept/reject).
    const reviewing = phase.state === 'done' && resolution?.generationId !== phase.generationId;

    const steps = useMemo(() => events.map(stepLabel).filter(Boolean) as string[], [events]);
    const referenceImage = useMemo(
        () => photoReferenceFrom(pendingReferenceImage, knownDimensionLabel, knownDimensionMm),
        [knownDimensionLabel, knownDimensionMm, pendingReferenceImage],
    );
    const photoReferenceSelected = pendingReferenceImage != null;
    const referenceNeedsDimension = pendingReferenceImage != null && referenceImage == null;

    useEffect(() => {
        if (phase.state !== 'error' || agentRepairWorkflow?.state !== 'running') return;
        shellStore.setAgentRepairWorkflow({ ...agentRepairWorkflow, state: 'drafted' });
    }, [agentRepairWorkflow, phase.state]);

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

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = prompt.trim();
        if (!trimmed || busy || readingReferenceImage) return;
        if (referenceNeedsDimension) {
            setReferenceImageError('Add a visible measurement label and a positive millimetre value before generating from a photo.');
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
        }, referenceImage ?? undefined);
    };

    const onReferenceImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const mimeType = file.type;

        setReferenceImageError(null);
        // A scale anchor belongs to a specific photo. Never silently reuse a
        // measurement from the previous reference after the file changes.
        setKnownDimensionLabel('');
        setKnownDimensionMm('');
        if (!isReferenceImageMimeType(mimeType)) {
            setPendingReferenceImage(null);
            setReferenceImageError('Use a PNG, JPEG, or WebP image for the reference photo.');
            return;
        }
        if (file.size === 0) {
            setPendingReferenceImage(null);
            setReferenceImageError('Reference photo is empty. Choose an image with visible device details.');
            return;
        }
        if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
            setPendingReferenceImage(null);
            setReferenceImageError('Reference images must be 4 MiB or smaller.');
            return;
        }

        setPendingReferenceImage(null);
        setReadingReferenceImage(true);
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            if (typeof dataUrl !== 'string' || !dataUrl.startsWith(`data:${mimeType};base64,`)) {
                setReferenceImageError('Could not read that image as a safe data URL. Choose a PNG, JPEG, or WebP image.');
                setReadingReferenceImage(false);
                return;
            }
            setPendingReferenceImage({ dataUrl, fileName: file.name, mimeType });
            setReadingReferenceImage(false);
        };
        reader.onerror = () => {
            setReferenceImageError('Could not read that reference photo. Try another image.');
            setReadingReferenceImage(false);
        };
        reader.readAsDataURL(file);
    };

    const onConcept = () => {
        const trimmed = prompt.trim();
        if (!trimmed || busy || photoReferenceSelected) return;
        setConceptPrompt(trimmed);
        void preview.submit(trimmed);
    };

    const buildConceptAsCad = () => {
        if (!conceptPrompt || busy || readingReferenceImage) return;
        if (referenceNeedsDimension) {
            setReferenceImageError('Add a visible measurement label and a positive millimetre value before generating from a photo.');
            return;
        }
        // Fresh generation, never an edit: framing the concept prompt as an
        // edit of whatever happens to sit in the editor (often the untouched
        // starter sample) lets the model return that code unchanged. The
        // review diff still uses the current editor code as its baseline, so
        // nothing is overwritten without the user accepting.
        setBaseline(currentCode);
        setReviewSnapshot({
            fromCode: currentCode,
            promptText: conceptPrompt,
            selectedFeatureId,
            repairWorkflow: agentRepairWorkflow,
        });
        // Read the concept mesh directly from the live preview phase (no mirrored
        // state). A done preview with no Tripo render/fingerprint yields
        // {renderImageUrl:null, proportions:null} — intentional and distinct from
        // "no mesh" (undefined); the server's nullish schema accepts it.
        const mesh = referenceImage == null && preview.phase.state === 'done'
            ? { renderImageUrl: preview.phase.renderImageUrl, proportions: preview.phase.proportions }
            : undefined;
        if (referenceImage) {
            // A photo is its own evidence mode. A preview that completed before
            // the photo was selected must not make the request ambiguous.
            void submit(conceptPrompt, undefined, undefined, referenceImage);
        } else {
            void submit(conceptPrompt, undefined, mesh);
        }
    };

    const stageGeneratedEdit = () => {
        if (phase.state !== 'done') return;
        if (stagedEdit != null) return;
        const snapshot = reviewSnapshot ?? {
            fromCode: currentCode,
            promptText: prompt.trim(),
            selectedFeatureId,
            repairWorkflow: agentRepairWorkflow,
        };
        shellStore.proposeStagedEdit({
            id: `agent:${phase.generationId}`,
            intent: phase.artifact.title,
            fromCode: snapshot.fromCode,
            toCode: phase.artifact.code,
            source: { kind: 'agent', label: 'Studio Generate' },
            context: {
                promptText: snapshot.promptText,
                selectedFeatureId: snapshot.selectedFeatureId,
                repairWorkflow: snapshot.repairWorkflow,
                generationId: phase.generationId,
            },
        });
        setResolution({ generationId: phase.generationId, action: 'staged' });
    };
    const reject = () => {
        if (phase.state !== 'done') return;
        if (agentRepairWorkflow?.state === 'running') {
            shellStore.setAgentRepairWorkflow({ ...agentRepairWorkflow, state: 'drafted' });
        }
        setResolution({ generationId: phase.generationId, action: 'discarded' });
    };

    return (
        <div className="p-3 flex flex-col gap-2">
            <div className="uppercase tracking-wide text-[10px] text-gray-500">Agent</div>
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
                <div className="text-[10px] text-gray-500 truncate" data-testid="studio-generate-target">
                    Target: {selectedFeatureId ?? 'whole model'}
                </div>
                <div className="rounded border border-[#2a2e38] bg-[#151820] p-2 flex flex-col gap-1.5">
                    <div className="text-[10px] text-gray-300">Simple-device photo reference</div>
                    <div className="text-[10px] text-gray-500">A photo needs one visible real-world measurement; it does not determine hidden depth or internals.</div>
                    <label className="flex flex-col gap-1 text-[10px] text-gray-400">
                        Reference photo
                        <input
                            aria-label="Reference photo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={onReferenceImageSelect}
                            disabled={busy || readingReferenceImage}
                            className="block w-full text-[10px] text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-[#2a2e38] file:px-2 file:py-1 file:text-[10px] file:text-gray-200 hover:file:bg-[#343946] disabled:opacity-50"
                        />
                    </label>
                    {readingReferenceImage && <div className="text-[10px] text-gray-500">Reading reference photo…</div>}
                    {pendingReferenceImage != null && (
                        <div className="text-[10px] text-green-500 truncate" title={pendingReferenceImage.fileName}>
                            {pendingReferenceImage.fileName}
                        </div>
                    )}
                    <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-1.5">
                        <label className="flex flex-col gap-1 text-[10px] text-gray-400">
                            Known dimension label
                            <input
                                aria-label="Known dimension label"
                                type="text"
                                value={knownDimensionLabel}
                                onChange={(event) => setKnownDimensionLabel(event.target.value)}
                                disabled={pendingReferenceImage == null || busy}
                                placeholder="e.g. overall height"
                                className="w-full rounded bg-[#111] border border-[#2a2e38] text-gray-100 px-2 py-1 text-[10px] placeholder:text-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-[10px] text-gray-400">
                            Known dimension (mm)
                            <input
                                aria-label="Known dimension (mm)"
                                type="number"
                                min="0.01"
                                step="any"
                                inputMode="decimal"
                                value={knownDimensionMm}
                                onChange={(event) => setKnownDimensionMm(event.target.value)}
                                disabled={pendingReferenceImage == null || busy}
                                placeholder="mm"
                                className="w-full rounded bg-[#111] border border-[#2a2e38] text-gray-100 px-2 py-1 text-[10px] placeholder:text-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                            />
                        </label>
                    </div>
                    {referenceNeedsDimension && (
                        <div className="text-[10px] text-amber-300">Add a visible measurement label and positive millimetres to use this photo.</div>
                    )}
                    {referenceImageError != null && (
                        <div className="text-[10px] text-red-400" role="alert">{referenceImageError}</div>
                    )}
                </div>
                <textarea
                    aria-label="Generate prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    disabled={busy}
                    placeholder={currentCode.trim() ? 'Edit this model… e.g. add two 4mm mounting holes' : 'Describe a part… e.g. a 20mm cube'}
                    className="w-full rounded bg-[#111] border border-[#2a2e38] text-gray-100 p-2 text-[11px] placeholder:text-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50 resize-none font-sans"
                />
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={busy || readingReferenceImage || referenceNeedsDimension || !prompt.trim()}
                        className="flex-1 rounded bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {agentBusy ? 'Working…' : currentCode.trim() ? 'Edit with agent →' : 'Build →'}
                    </button>
                    {preview.phase.state !== 'unavailable' && (
                        <button
                            type="button"
                            onClick={onConcept}
                            disabled={busy || photoReferenceSelected || !prompt.trim()}
                            title={photoReferenceSelected
                                ? 'Remove the reference photo to use the mesh concept workflow'
                                : 'Quick visual 3D concept of this description (paid feature)'}
                            className="rounded bg-[#1a1d24] hover:bg-[#222630] text-gray-300 border border-[#2a2e38] px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                            {conceptBusy ? `Concept… ${preview.phase.state === 'running' ? preview.phase.progress : 0}%` : '3D concept'}
                        </button>
                    )}
                </div>
            </form>

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
