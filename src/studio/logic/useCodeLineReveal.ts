// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, type RefObject } from 'react';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { EditorLike } from '../../shared/types/editor';
import { codeLineRevealRequests } from '../hooks/studioNavigation';
import { scriptLineForId } from './featureLine';

/** Scroll the open Code editor to a feature line. Never focuses it. */
export function useCodeLineReveal(
    editorRef: RefObject<EditorLike | null>,
    features: readonly FeatureRecord[],
): void {
    const featuresRef = useRef(features);

    useEffect(() => {
        featuresRef.current = features;
    }, [features]);

    useEffect(() => {
        return codeLineRevealRequests.subscribe((request) => {
            const editor = editorRef.current;
            if (!editor) return;
            const line = scriptLineForId(featuresRef.current, request.featureId);
            if (line == null) return;
            editor.revealLineInCenter(line);
        });
    }, [editorRef]);
}
