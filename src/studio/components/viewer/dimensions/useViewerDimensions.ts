// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useContext, useMemo } from 'react';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { ProjectContext } from '../../../context/ProjectContext';
import { readStudioScriptParam } from '../../../context/geometry/types';
import { resolveViewerDimensions, type MeshDimensionsInfo } from './boundsDimensions';
import { dimsForced, useDimensionsToggle } from './useDimensionsToggle';

function locationSearch(): string {
    return typeof window === 'undefined' ? '' : window.location.search;
}

/** Everything the viewer needs for the dimensions overlay: what to draw,
 *  whether it is a bounding-box fallback for an old payload, whether there
 *  is anything to offer at all (no payload and no `?dims=1`: no button),
 *  and the toggle. */
export function useViewerDimensions(info: MeshDimensionsInfo | null | undefined): {
    dimensions: ViewerDimension[];
    legacy: boolean;
    available: boolean;
    on: boolean;
    toggle(): void;
} {
    const search = locationSearch();
    const projectId = useContext(ProjectContext)?.activeProjectId ?? '';
    const modelKey = `${readStudioScriptParam() ?? ''}|${projectId}`;
    const { dimensions, legacy } = useMemo(() => resolveViewerDimensions(info), [info]);
    const { on, toggle } = useDimensionsToggle(info ? dimensions : undefined, search, modelKey);
    return { dimensions, legacy, available: Boolean(info) || dimsForced(search), on, toggle };
}
