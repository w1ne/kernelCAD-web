// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState } from 'react';
import { GeometryEngine, type GeometryResult } from '../../../shared/worker/geometryEngine';
import { parseCode } from '../../../shared/codeGeneration/ast';

/**
 * Owns the live-preview execution loop: a debounced re-run of `code` plus a
 * pending `previewCode` snippet, used while a feature is being composed
 * in-canvas before it is committed.
 */
export function usePreviewExecution(
    code: string,
    isReady: boolean,
    engine: GeometryEngine,
    studioScript: string | null,
) {
    const [previewCode, setPreviewCode] = useState<string | null>(null);
    const [previewGeometries, setPreviewGeometries] = useState<GeometryResult[]>([]);
    const [stalePreviewResponsesDropped, setStalePreviewResponsesDropped] = useState(0);
    const previewRevisionRef = useRef(0);

    // Reset `previewGeometries` the instant preview becomes ineligible
    // (studio-script mode, engine not ready, or no pending preview code).
    // Done during render — not inside the effect below — so this doesn't
    // trip the "no setState synchronously in an effect" rule; React commits
    // this update before paint, same as the effect-based reset it replaces.
    const previewEligible = !studioScript && isReady && Boolean(previewCode);
    const [wasPreviewEligible, setWasPreviewEligible] = useState(previewEligible);
    if (previewEligible !== wasPreviewEligible) {
        setWasPreviewEligible(previewEligible);
        if (!previewEligible) setPreviewGeometries([]);
    }

    // Preview Execution Loop
    useEffect(() => {
        if (!previewEligible) return;

        const runPreview = async () => {
            const revision = ++previewRevisionRef.current;
            try {
                parseCode(code);
                parseCode(`${code}\n${previewCode}`);
                // Combine current code (as library) with preview code
                // Or just run the preview code if it's independent
                // For live modeling, it's usually current code + the new operation
                const result = await engine.executeCode(`${code}\n${previewCode}`);
                if (revision !== previewRevisionRef.current) {
                    setStalePreviewResponsesDropped((prev) => prev + 1);
                    return;
                }
                setPreviewGeometries(result.geometries);
            } catch (err) {
                if (revision !== previewRevisionRef.current) {
                    setStalePreviewResponsesDropped((prev) => prev + 1);
                    return;
                }
                // Silently ignore preview errors to avoid flickering red screens
                console.warn('Live Preview Error:', err);
            }
        };

        const timer = setTimeout(runPreview, 150); // Aggressive debounce for preview
        return () => clearTimeout(timer);
    }, [code, previewCode, isReady, engine, studioScript, previewEligible]);

    return { previewCode, setPreviewCode, previewGeometries, setPreviewGeometries, stalePreviewResponsesDropped };
}
