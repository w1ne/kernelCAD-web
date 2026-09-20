// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import type { PreviewPhase } from '../../funnel/hooks/useTextTo3dPreview';
import type { GenerateRequest } from '../../funnel/lib/generateClient';
import type { SelectedFeatureId } from '../types';
import { AgentComposer } from '../AgentComposer';

export function GenerateForm({
    selectedFeatureId,
    prompt,
    onPromptChange,
    busy,
    conceptBusy,
    previewPhase,
    onSubmit,
    onConcept,
}: {
    selectedFeatureId: SelectedFeatureId;
    prompt: string;
    onPromptChange: (value: string) => void;
    busy: boolean;
    conceptBusy: boolean;
    previewPhase: PreviewPhase;
    onSubmit: (message: string, referenceImage?: GenerateRequest['referenceImage']) => void;
    onConcept: () => void;
}) {
    const [photoAttached, setPhotoAttached] = useState(false);
    return (
        <div className="flex flex-col gap-2">
            <div className="text-[10px] text-gray-500 truncate" data-testid="studio-generate-target">
                Target: {selectedFeatureId ?? 'whole model'}
            </div>
            <AgentComposer value={prompt} onChange={onPromptChange} onSubmit={onSubmit}
                disabled={busy} submitLabel="Build" onPhotoChange={setPhotoAttached} />
            {previewPhase.state !== 'unavailable' && (
                <button
                    type="button"
                    onClick={onConcept}
                    disabled={busy || photoAttached || !prompt.trim()}
                    title={photoAttached
                        ? 'Remove the attached photo to use the mesh concept workflow'
                        : 'Quick visual 3D concept of this description (paid feature)'}
                    className="rounded bg-[#1a1d24] hover:bg-[#222630] text-gray-300 border border-[#2a2e38] px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                    {conceptBusy ? `Concept… ${previewPhase.state === 'running' ? previewPhase.progress : 0}%` : '3D concept'}
                </button>
            )}
        </div>
    );
}
