// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { Crosshair, X } from 'lucide-react';
import type { PreviewPhase } from '../../funnel/hooks/useTextTo3dPreview';
import type { GenerateRequest } from '../../funnel/lib/generateClient';
import type { SelectedFeatureId } from '../types';
import { AgentComposer } from '../AgentComposer';
import { buttonClass } from '../../ui/buttonStyles';
import { cx } from '../../ui/cx';

/** What the agent will see with the prompt: the selected feature, or the whole model. */
function SelectionChip({ selectedFeatureId, onClear }: {
    selectedFeatureId: SelectedFeatureId;
    onClear?: () => void;
}) {
    const targeted = selectedFeatureId !== null;
    return (
        <span
            className={cx(
                'inline-flex h-6 max-w-full items-center gap-1 rounded-full pl-2 text-2xs font-medium',
                targeted ? 'bg-agent-soft text-agent-fg' : 'bg-surface-3 pr-2 text-fg-2',
            )}
            title={targeted
                ? 'The agent edits only this feature'
                : 'Select a feature on the model or in the code to target it'}
        >
            <Crosshair className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate" data-testid="studio-generate-target">
                Target: {selectedFeatureId ?? 'whole model'}
            </span>
            {targeted && onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    aria-label={`Target the whole model instead of ${selectedFeatureId}`}
                    className="focus-ring inline-flex size-6 items-center justify-center rounded-full hover:bg-agent/20"
                >
                    <X className="size-3" strokeWidth={2} aria-hidden="true" />
                </button>
            )}
        </span>
    );
}

export function GenerateForm({
    selectedFeatureId,
    prompt,
    onPromptChange,
    busy,
    conceptBusy,
    previewPhase,
    onSubmit,
    onConcept,
    agentBusy = false,
    onClearTarget,
}: {
    selectedFeatureId: SelectedFeatureId;
    prompt: string;
    onPromptChange: (value: string) => void;
    busy: boolean;
    conceptBusy: boolean;
    previewPhase: PreviewPhase;
    onSubmit: (message: string, referenceImage?: GenerateRequest['referenceImage']) => void;
    onConcept: () => void;
    /** A run is going: the composer stays open and queues follow-ups. */
    agentBusy?: boolean;
    onClearTarget?: () => void;
}) {
    const [photoAttached, setPhotoAttached] = useState(false);
    return (
        <div className="flex flex-col gap-2">
            <AgentComposer value={prompt} onChange={onPromptChange} onSubmit={onSubmit}
                disabled={conceptBusy} submitLabel={agentBusy ? 'Queue follow-up' : 'Build'} onPhotoChange={setPhotoAttached}
                clearOnSubmit rows={3}
                placeholder={agentBusy ? 'Add a follow-up; it runs after this change…' : 'Describe a part or a change…'}
                context={<SelectionChip selectedFeatureId={selectedFeatureId} onClear={onClearTarget} />} />
            {previewPhase.state !== 'unavailable' && (
                <button
                    type="button"
                    onClick={onConcept}
                    disabled={busy || photoAttached || !prompt.trim()}
                    title={photoAttached
                        ? 'Remove the attached photo to use the mesh concept workflow'
                        : 'Quick visual 3D concept of this description (paid feature)'}
                    className={cx(buttonClass('ghost', 'sm'), 'self-start')}
                >
                    {conceptBusy ? `Concept… ${previewPhase.state === 'running' ? previewPhase.progress : 0}%` : '3D concept'}
                </button>
            )}
        </div>
    );
}
