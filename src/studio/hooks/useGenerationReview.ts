// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import type { GenerationPhase } from '../../funnel/hooks/useGeneration';
import { shellStore } from '../store/useShellStore';
import type { AgentRepairWorkflow, StagedEdit } from '../store/shellStore';
import type { SelectedFeatureId } from '../types';
import type { GenerationReviewSnapshot } from './useAgentGeneration';

export type GenerationResolution = { generationId: string; action: 'staged' | 'discarded' };

interface UseGenerationReviewArgs {
    readonly phase: GenerationPhase;
    readonly stagedEdit: StagedEdit | null;
    readonly currentCode: string;
    readonly prompt: string;
    readonly selectedFeatureId: SelectedFeatureId;
    readonly agentRepairWorkflow: AgentRepairWorkflow | null;
    readonly reviewSnapshot: GenerationReviewSnapshot | null;
}

/**
 * Gates the review panel (diff + accept/reject) for a finished generation and
 * stages or discards the proposal. Proposals are never auto-applied.
 */
export function useGenerationReview({
    phase,
    stagedEdit,
    currentCode,
    prompt,
    selectedFeatureId,
    agentRepairWorkflow,
    reviewSnapshot,
}: UseGenerationReviewArgs) {
    // The generationId we've already staged/rejected — gates the review panel
    // so a resolved proposal doesn't reappear.
    const [resolution, setResolution] = useState<GenerationResolution | null>(null);

    // A finished, not-yet-resolved proposal → show the review (diff + accept/reject).
    const reviewing = phase.state === 'done' && resolution?.generationId !== phase.generationId;

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

    return { resolution, reviewing, stageGeneratedEdit, reject };
}
