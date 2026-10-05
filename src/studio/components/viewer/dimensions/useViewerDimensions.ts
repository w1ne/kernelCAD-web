// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useMemo } from 'react';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { resolveViewerDimensions, type MeshDimensionsInfo } from './boundsDimensions';
import { useDimensionsToggle } from './useDimensionsToggle';

function locationSearch(): string {
    return typeof window === 'undefined' ? '' : window.location.search;
}

/** Everything the viewer needs for the dimensions overlay: what to draw,
 *  whether it is a bounding-box fallback, and the toggle. */
export function useViewerDimensions(info: MeshDimensionsInfo | null | undefined): {
    dimensions: ViewerDimension[];
    legacy: boolean;
    on: boolean;
    toggle(): void;
} {
    const { dimensions, legacy } = useMemo(() => resolveViewerDimensions(info), [info]);
    const { on, toggle } = useDimensionsToggle(info ? dimensions : undefined, locationSearch());
    return { dimensions, legacy, on, toggle };
}
