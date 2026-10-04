// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import { useEffect, useMemo } from "react";

interface EdgeRangeLinesProps {
    /** Flat xyz line-segment positions of the whole BREP edge set. */
    positions: Float32Array;
    /** Flat `[start, count]` vertex ranges, one pair per edge. */
    edgeRanges: readonly number[];
    edgeIndex: number;
    /** World matrix of the edge set (omit inside an already-posed group). */
    matrix?: THREE.Matrix4;
    color: string;
}

/**
 * Draws ONE BREP edge out of a shape's merged edge set, on top of the model
 * (hover pre-selection and the clicked edge of the selection ↔ code link).
 */
export function EdgeRangeLines({ positions, edgeRanges, edgeIndex, matrix, color }: EdgeRangeLinesProps) {
    const geometry = useMemo(() => {
        const start = edgeRanges[edgeIndex * 2];
        const count = edgeRanges[edgeIndex * 2 + 1];
        if (start === undefined || count === undefined || count < 2) return null;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
            'position',
            new THREE.BufferAttribute(positions.slice(start * 3, (start + count) * 3), 3),
        );
        return geo;
    }, [positions, edgeRanges, edgeIndex]);

    useEffect(() => () => { geometry?.dispose(); }, [geometry]);

    if (!geometry) return null;
    return (
        <lineSegments
            geometry={geometry}
            {...(matrix ? { matrix, matrixAutoUpdate: false } : {})}
            renderOrder={1003}
        >
            <lineBasicMaterial color={color} linewidth={3} depthTest={false} />
        </lineSegments>
    );
}
