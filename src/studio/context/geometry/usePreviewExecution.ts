// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState } from 'react';
import { GeometryEngine, type GeometryResult } from '../../../shared/worker/geometryEngine';
import { parseCode } from '../../../shared/codeGeneration/ast';

/** Stable empty list for previews that are ineligible this render. */
const EMPTY_GEOMETRIES: GeometryResult[] = [];

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
    const [previewCode, setPreviewCodeState] = useState<string | null>(null);
    const [previewGeometries, setPreviewGeometries] = useState<GeometryResult[]>([]);
    const [stalePreviewResponsesDropped, setStalePreviewResponsesDropped] = useState(0);
    const previewRevisionRef = useRef(0);

    // Dropping the preview (a falsy `previewCode`) is a caller event, so the
    // reset happens here instead of inside the effect body. It leaves the
    // same empty preview list the effect-based reset did, and it also runs
    // before the effect can schedule anything for the new value.
    const setPreviewCode = useCallback((next: string | null) => {
        if (!next) setPreviewGeometries([]);
        setPreviewCodeState(next);
    }, []);

    // Preview Execution Loop
    useEffect(() => {
        if (studioScript || !isReady || !previewCode) return;

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
    }, [code, previewCode, isReady, engine, studioScript]);

    // `studioScript` / `!isReady` make previews ineligible without going
    // through `setPreviewCode`, so mask any stored list at render time. In
    // the reachable flows the stored list is already empty there (no preview
    // can have run while ineligible), so this only replaces the effect's
    // reset with a derived value.
    const visiblePreviewGeometries = studioScript || !isReady ? EMPTY_GEOMETRIES : previewGeometries;

    return {
        setPreviewCode,
        previewGeometries: visiblePreviewGeometries,
        setPreviewGeometries,
        stalePreviewResponsesDropped,
    };
}
