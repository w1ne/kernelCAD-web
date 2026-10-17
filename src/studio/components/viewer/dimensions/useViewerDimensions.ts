// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useContext, useMemo } from 'react';
import type { V3, ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { ProjectContext } from '../../../context/ProjectContext';
import { readStudioScriptParam } from '../../../context/geometry/types';
import { resolveViewerDimensions, type DimensionBounds, type MeshDimensionsInfo } from './boundsDimensions';
import { dimsForced, useDimensionsToggle } from './useDimensionsToggle';
import { placeDimensions } from './placement';

function locationSearch(): string {
    return typeof window === 'undefined' ? '' : window.location.search;
}

/** Everything the viewer needs for the dimensions overlay: what to draw,
 *  whether it is a bounding-box fallback for an old payload, whether there
 *  is anything to offer at all (no payload and no `?dims=1`: no button),
 *  and the toggle. */
export function useViewerDimensions(info: MeshDimensionsInfo | null | undefined): {
    dimensions: ViewerDimension[];
    /** The payload's body bounds, which frame the overlay layout. */
    bounds: DimensionBounds | null;
    legacy: boolean;
    available: boolean;
    on: boolean;
    toggle(): void;
    /** Where the dimensions are drawn from the default (fit) view: their
     *  ends and label anchors, for the phone camera fit. */
    fitPoints: readonly V3[];
} {
    const search = locationSearch();
    const projectId = useContext(ProjectContext)?.activeProjectId ?? '';
    const modelKey = `${readStudioScriptParam() ?? ''}|${projectId}`;
    const { dimensions, legacy } = useMemo(() => resolveViewerDimensions(info), [info]);
    const { on, toggle } = useDimensionsToggle(info ? dimensions : undefined, search, modelKey);
    const bounds = info?.bounds ?? null;
    // The fit looks from the +x +y +z octant, where placement puts them.
    const fitPoints = useMemo(
        () => placeDimensions(dimensions, [1, 1, 1], bounds).flatMap((d) => [d.a, d.b, ...(d.labelAt ? [d.labelAt] : [])]),
        [dimensions, bounds],
    );
    return { dimensions, bounds, legacy, available: Boolean(info) || dimsForced(search), on, toggle, fitPoints };
}
