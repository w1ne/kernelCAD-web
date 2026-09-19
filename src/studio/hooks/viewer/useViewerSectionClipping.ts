// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { cutawayPlanesFromState } from "../../components/viewer/sectionPlane";

// Stable empty array so keep-whole shapes never re-memo their materials.
export const NO_PLANES: THREE.Plane[] = [];

/**
 * Owns the three stable clipping-plane instances the section tool mutates in
 * place, and returns the slice currently applied to the scene.
 */
export function useViewerSectionClipping(
    sectionMode: boolean,
    sectionAxesEnabled: Readonly<Record<'x' | 'y' | 'z', boolean>>,
    sectionSides: Readonly<Record<'x' | 'y' | 'z', boolean>>,
    sectionOffsets: Readonly<Record<'x' | 'y' | 'z', number>>,
) {
    // Three stable plane instances, mutated in place so slider/side changes
    // never rebuild materials (only mode/axis-count switches do — see ShapeGeometry).
    const sectionPlaneRefs = useMemo(
        () => [
            new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
        ],
        [],
    );
    useEffect(() => {
        cutawayPlanesFromState(sectionAxesEnabled, sectionSides, sectionOffsets)
            .forEach((p, i) => sectionPlaneRefs[i].copy(p));
    }, [sectionPlaneRefs, sectionAxesEnabled, sectionSides, sectionOffsets]);
    return useMemo(() => {
        if (!sectionMode) return NO_PLANES;
        const count = (['x', 'y', 'z'] as const).filter((a) => sectionAxesEnabled[a]).length;
        return count === 0 ? NO_PLANES : sectionPlaneRefs.slice(0, count);
    }, [sectionMode, sectionAxesEnabled, sectionPlaneRefs]);
}
