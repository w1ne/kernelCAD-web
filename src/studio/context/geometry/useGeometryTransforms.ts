// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useRef, useState } from 'react';

/**
 * Owns the per-part transform override map (the #709 direct-edit-drag /
 * animation-playback / pose-only-relower write surface) and the viewport
 * driver lock that arbitrates between them. The derived `displayGeometries`
 * (overrides layered onto the base geometry list) is computed by the caller,
 * since the base geometry list comes from `useScriptExecution`, which itself
 * takes this hook's setter/ref as input.
 */
export function useGeometryTransforms() {
    const [geometryTransformOverrides, setGeometryTransformOverrides] = useState<Record<string, number[]>>({});
    // While true, animation playback owns the override map; the SSE pose-only
    // fast path must not replace it (see `setViewportDriverLock`). A ref, not
    // state, so reads inside the long-lived SSE handler always see the current
    // value without re-subscribing the EventSource.
    const viewportDriverLockRef = useRef(false);

    const setGeometryTransformOverride = useCallback((partName: string, transform: number[]) => {
        if (transform.length !== 16) return;
        setGeometryTransformOverrides((prev) => ({ ...prev, [partName]: [...transform] }));
    }, []);

    const clearGeometryTransformOverrides = useCallback(() => {
        setGeometryTransformOverrides({});
    }, []);

    const setViewportDriverLock = useCallback((locked: boolean) => {
        viewportDriverLockRef.current = locked;
    }, []);

    return {
        geometryTransformOverrides,
        setGeometryTransformOverrides,
        viewportDriverLockRef,
        setGeometryTransformOverride,
        clearGeometryTransformOverrides,
        setViewportDriverLock,
    };
}
