// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { useGeneration } from '../../funnel/hooks/useGeneration';
import type { useTextTo3dPreview } from '../../funnel/hooks/useTextTo3dPreview';
import type { AgentRepairWorkflow } from '../store/shellStore';
import type { SelectedFeatureId } from '../types';
import type { GenerationReviewSnapshot } from './useAgentGeneration';

interface UseConceptWorkflowArgs {
    readonly prompt: string;
    readonly busy: boolean;
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
        if (!trimmed || busy) return;
        setConceptPrompt(trimmed);
        void preview.submit(trimmed);
    };

    const buildConceptAsCad = () => {
        if (!conceptPrompt || busy) return;
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
        const mesh = preview.phase.state === 'done'
            ? { renderImageUrl: preview.phase.renderImageUrl, proportions: preview.phase.proportions }
            : undefined;
        void submit(conceptPrompt, undefined, mesh);
    };

    return { onConcept, buildConceptAsCad };
}
