// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { V3, ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { formatMm } from '../../../../kernel/backends/occt/viewerDimensions/format';

export interface DimensionBounds {
    min: readonly [number, number, number];
    max: readonly [number, number, number];
}

/** What a mesh payload or stored artifact says about dimensions. A payload
 *  written before dimensions existed has no `dimensions` field. */
export interface MeshDimensionsInfo {
    dimensions?: ViewerDimension[];
    bounds?: DimensionBounds;
}

/** Client fallback for payloads without `dimensions`: the three overall
 *  extents along the bounding-box edges (same edges the kernel uses). */
export function boundsDimensions(bounds: DimensionBounds): ViewerDimension[] {
    const [x0, y0, z0] = bounds.min;
    const [x1, y1, z1] = bounds.max;
    const edges: Array<[V3, V3, number]> = [
        [[x0, y0, z0], [x1, y0, z0], x1 - x0],
        [[x1, y0, z0], [x1, y1, z0], y1 - y0],
        [[x1, y0, z0], [x1, y0, z1], z1 - z0],
    ];
    return edges
        .filter(([, , length]) => length > 1e-6)
        .map(([a, b, length], i) => ({
            id: `auto:bounds:root:${i}`,
            kind: 'linear',
            a,
            b,
            text: formatMm(length),
            source: 'auto',
        }));
}

/** Dimensions to draw for a payload, and whether it predates dimensions
 *  (then only the bounding box is known and the viewer says so). An empty
 *  `dimensions` list also falls back to the bounding box, without the hint. */
export function resolveViewerDimensions(info: MeshDimensionsInfo | null | undefined): {
    dimensions: ViewerDimension[];
    legacy: boolean;
} {
    if (info?.dimensions && info.dimensions.length > 0) return { dimensions: info.dimensions, legacy: false };
    // No field: the payload predates dimensions (hint to republish). An empty
    // list: the kernel ran out of budget or failed, so show the box, no hint.
    if (info?.bounds) return { dimensions: boundsDimensions(info.bounds), legacy: info.dimensions === undefined };
    return { dimensions: [], legacy: false };
}

/** The dimension fields of a mesh payload, as the viewer stores them. */
export function meshDimensionsOf(payload: MeshDimensionsInfo): MeshDimensionsInfo {
    return { dimensions: payload.dimensions, bounds: payload.bounds };
}
