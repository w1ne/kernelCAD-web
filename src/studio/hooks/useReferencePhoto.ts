// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useMemo, useState, type ChangeEvent } from 'react';
import {
    isReferenceImageMimeType,
    MAX_REFERENCE_IMAGE_BYTES,
    type GenerateRequest,
} from '../../funnel/lib/generateClient';

export type PendingReferenceImage = Pick<NonNullable<GenerateRequest['referenceImage']>, 'dataUrl' | 'fileName' | 'mimeType'>;

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

/**
 * Owns the simple-device reference photo state: the staged file, the
 * user-supplied scale anchor, and the read-error/read-in-flight flags. The
 * ready-to-send `referenceImage` is derived (and stays null until the anchor
 * is a valid positive millimetre value).
 */
export function useReferencePhoto() {
    const [pendingReferenceImage, setPendingReferenceImage] = useState<PendingReferenceImage | null>(null);
    const [knownDimensionLabel, setKnownDimensionLabel] = useState('');
    const [knownDimensionMm, setKnownDimensionMm] = useState('');
    const [referenceImageError, setReferenceImageError] = useState<string | null>(null);
    const [readingReferenceImage, setReadingReferenceImage] = useState(false);

    const referenceImage = useMemo(
        () => photoReferenceFrom(pendingReferenceImage, knownDimensionLabel, knownDimensionMm),
        [knownDimensionLabel, knownDimensionMm, pendingReferenceImage],
    );

    const photoReferenceSelected = pendingReferenceImage != null;
    const referenceNeedsDimension = pendingReferenceImage != null && referenceImage == null;

    const onReferenceImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
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

    return {
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
    };
}
