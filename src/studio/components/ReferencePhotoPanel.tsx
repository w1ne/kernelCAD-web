// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ChangeEvent } from 'react';
import type { PendingReferenceImage } from '../hooks/useReferencePhoto';

export function ReferencePhotoPanel({
    pendingReferenceImage,
    knownDimensionLabel,
    onKnownDimensionLabelChange,
    knownDimensionMm,
    onKnownDimensionMmChange,
    referenceImageError,
    readingReferenceImage,
    referenceNeedsDimension,
    busy,
    onReferenceImageSelect,
}: {
    pendingReferenceImage: PendingReferenceImage | null;
    knownDimensionLabel: string;
    onKnownDimensionLabelChange: (value: string) => void;
    knownDimensionMm: string;
    onKnownDimensionMmChange: (value: string) => void;
    referenceImageError: string | null;
    readingReferenceImage: boolean;
    referenceNeedsDimension: boolean;
    busy: boolean;
    onReferenceImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
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
                        onChange={(event) => onKnownDimensionLabelChange(event.target.value)}
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
                        onChange={(event) => onKnownDimensionMmChange(event.target.value)}
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
    );
}
