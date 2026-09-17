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

    // Preview Execution Loop
    useEffect(() => {
        if (studioScript) {
            // Synchronous setState, matching the original inline effect
            // byte-for-byte (zero-behavior-change outranks the lint rule
            // here — this file is only linted as a "hook" because it's
            // named `use*`; the identical code was invisible to
            // react-hooks/set-state-in-effect inside the original
            // GeometryProvider). The no-previewCode branch is pinned by
            // `GeometryContext.test.tsx` ("clears previewGeometries when
            // preview becomes ineligible (previewCode cleared)").
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreviewGeometries([]);
            return;
        }
        if (!isReady || !previewCode) {
            setPreviewGeometries([]);
            return;
        }

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

    return { setPreviewCode, previewGeometries, setPreviewGeometries, stalePreviewResponsesDropped };
}
