// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { useGeneration } from '../../funnel/hooks/useGeneration';
import type { useTextTo3dPreview } from '../../funnel/hooks/useTextTo3dPreview';
import type { GenerateRequest } from '../../funnel/lib/generateClient';
import type { AgentRepairWorkflow } from '../store/shellStore';
import type { SelectedFeatureId } from '../types';
import type { GenerationReviewSnapshot } from './useAgentGeneration';

interface UseConceptWorkflowArgs {
    readonly prompt: string;
    readonly busy: boolean;
    readonly photoReferenceSelected: boolean;
    readonly referenceNeedsDimension: boolean;
    readonly setReferenceImageError: (message: string | null) => void;
    readonly readingReferenceImage: boolean;
    readonly referenceImage: GenerateRequest['referenceImage'] | null;
    readonly currentCode: string;
    readonly selectedFeatureId: SelectedFeatureId;
    readonly agentRepairWorkflow: AgentRepairWorkflow | null;
    readonly submit: ReturnType<typeof useGeneration>['submit'];
    readonly preview: ReturnType<typeof useTextTo3dPreview>;
    readonly setBaseline: (value: string) => void;
    readonly setReviewSnapshot: (snapshot: GenerationReviewSnapshot | null) => void;
}

/**
 * The paid text-to-3D concept preview driven by the same prompt box, plus the
 * Build-as-CAD handoff that feeds the previewed prompt into a fresh agent run.
 */
export function useConceptWorkflow({
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
}: UseConceptWorkflowArgs) {
    // The prompt the last concept was generated from — Build-as-CAD uses what
    // the user actually previewed even if they edited the box afterwards.
    const [conceptPrompt, setConceptPrompt] = useState('');

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

    return { onConcept, buildConceptAsCad };
}
