// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Line } from '@react-three/drei/core/Line';
import { useMemo } from 'react';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { DimensionGraphic } from '../overlays/DimensionGraphic';
import { dimensionColor, dimensionFrame, placeDimensions, type PlacedDimension } from './placement';
import { useViewOctant } from './useViewOctant';
import { useVisibleDimensions } from './useVisibleDimensions';

function PlacedDimensionGraphic({ d, color }: { d: PlacedDimension; color: string }) {
    return (
        <group>
            {d.extension?.map(([from, to], i) => (
                <Line key={i} points={[from, to]} color={color} lineWidth={1} depthTest={false} transparent opacity={0.6} renderOrder={2999} />
            ))}
            <DimensionGraphic a={d.a} b={d.b} label={d.label} sublabel={d.sublabel} kind={d.kind} color={color} labelAt={d.labelAt} />
        </group>
    );
}

/** Declared and automatic dimensions drawn in the scene (inside the Canvas).
 *  Labels that would cover a more important one are hidden each frame. */
export function DimensionsOverlay({ dimensions }: { dimensions: readonly ViewerDimension[] }) {
    const centre = useMemo(() => dimensionFrame(dimensions).centre, [dimensions]);
    const eye = useViewOctant(centre);
    const placed = useMemo(() => placeDimensions(dimensions, eye), [dimensions, eye]);
    const visible = useVisibleDimensions(placed);
    return (
        <group name="viewer-dimensions">
            {placed.filter((d) => visible.has(d.id)).map((d) => (
                <PlacedDimensionGraphic key={d.id} d={d} color={dimensionColor(d.source)} />
            ))}
        </group>
    );
}
