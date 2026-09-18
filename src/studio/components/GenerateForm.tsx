// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ChangeEvent } from 'react';
import type { PreviewPhase } from '../../funnel/hooks/useTextTo3dPreview';
import type { SelectedFeatureId } from '../types';
import type { PendingReferenceImage } from '../hooks/useReferencePhoto';
import { ReferencePhotoPanel } from './ReferencePhotoPanel';
import { AgentComposer } from '../AgentComposer';

export function GenerateForm({
    selectedFeatureId,
    prompt,
    onPromptChange,
    busy,
    conceptBusy,
    previewPhase,
    photoReferenceSelected,
    referenceNeedsDimension,
    readingReferenceImage,
    pendingReferenceImage,
    knownDimensionLabel,
    onKnownDimensionLabelChange,
    knownDimensionMm,
    onKnownDimensionMmChange,
    referenceImageError,
    onReferenceImageSelect,
    onSubmit,
    onConcept,
}: {
    selectedFeatureId: SelectedFeatureId;
    prompt: string;
    onPromptChange: (value: string) => void;
    busy: boolean;
    conceptBusy: boolean;
    previewPhase: PreviewPhase;
    photoReferenceSelected: boolean;
    referenceNeedsDimension: boolean;
    readingReferenceImage: boolean;
    pendingReferenceImage: PendingReferenceImage | null;
    knownDimensionLabel: string;
    onKnownDimensionLabelChange: (value: string) => void;
    knownDimensionMm: string;
    onKnownDimensionMmChange: (value: string) => void;
    referenceImageError: string | null;
    onReferenceImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (message: string) => void;
    onConcept: () => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="text-[10px] text-gray-500 truncate" data-testid="studio-generate-target">
                Target: {selectedFeatureId ?? 'whole model'}
            </div>
            <ReferencePhotoPanel
                pendingReferenceImage={pendingReferenceImage}
                knownDimensionLabel={knownDimensionLabel}
                onKnownDimensionLabelChange={onKnownDimensionLabelChange}
                knownDimensionMm={knownDimensionMm}
                onKnownDimensionMmChange={onKnownDimensionMmChange}
                referenceImageError={referenceImageError}
                readingReferenceImage={readingReferenceImage}
                referenceNeedsDimension={referenceNeedsDimension}
                busy={busy}
                onReferenceImageSelect={onReferenceImageSelect}
            />
            <AgentComposer value={prompt} onChange={onPromptChange} onSubmit={onSubmit}
                disabled={busy || readingReferenceImage || referenceNeedsDimension} submitLabel="Build" />
            {previewPhase.state !== 'unavailable' && (
                <button
                    type="button"
                    onClick={onConcept}
                    disabled={busy || photoReferenceSelected || !prompt.trim()}
                    title={photoReferenceSelected
                        ? 'Remove the reference photo to use the mesh concept workflow'
                        : 'Quick visual 3D concept of this description (paid feature)'}
                    className="rounded bg-[#1a1d24] hover:bg-[#222630] text-gray-300 border border-[#2a2e38] px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                    {conceptBusy ? `Concept… ${previewPhase.state === 'running' ? previewPhase.progress : 0}%` : '3D concept'}
                </button>
            )}
        </div>
    );
}
