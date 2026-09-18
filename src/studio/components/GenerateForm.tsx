// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ChangeEvent, FormEvent } from 'react';
import type { PreviewPhase } from '../../funnel/hooks/useTextTo3dPreview';
import type { SelectedFeatureId } from '../types';
import type { PendingReferenceImage } from '../hooks/useReferencePhoto';
import { ReferencePhotoPanel } from './ReferencePhotoPanel';

export function GenerateForm({
    selectedFeatureId,
    prompt,
    onPromptChange,
    currentCode,
    busy,
    agentBusy,
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
    currentCode: string;
    busy: boolean;
    agentBusy: boolean;
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
    onSubmit: (event: FormEvent) => void;
    onConcept: () => void;
}) {
    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
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
            <textarea
                aria-label="Generate prompt"
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
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
        </form>
    );
}
