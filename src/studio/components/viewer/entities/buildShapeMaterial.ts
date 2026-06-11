// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import type { ViewMode3D } from '../../../../shared/types/viewMode';
import { buildMaterialFromPBR } from '../../demoPlayer/buildMaterialFromPBR';

/**
 * Build the THREE material for a shape given the geometry record, selection
 * state, resolved fallback color, and the active 3D view mode.
 *
 * Lives in its own module so the (viewMode3D → material flags) mapping can be
 * unit-tested without mounting an R3F Canvas, and so ShapeGeometry.tsx stays
 * a pure component module (Fast Refresh requires component files not to
 * export non-component values).
 *
 * Three view modes:
 *  - `'shaded'`           — smooth shading, no edge overlay
 *  - `'wireframe'`        — faces ghosted to a barely-visible depth-tested film;
 *                           the BREP edge polylines (rendered by ShapeGeometry)
 *                           carry the visual. The triangulation is never shown.
 *  - `'shadedWithEdges'`  — flat shading + black edge overlay rendered separately
 */

/** Face opacity used by the wireframe-mode ghost film. */
export const WIREFRAME_GHOST_OPACITY = 0.08;

export function buildShapeMaterial(
    pbr: GeometryResult['material'],
    isSelected: boolean,
    color: number | string,
    viewMode3D: ViewMode3D,
    clippingPlanes: THREE.Plane[] = [],
    clipIntersection = false,
): THREE.Material {
    const flatShading = viewMode3D === 'shadedWithEdges';
    const applyClip = (m: THREE.Material): THREE.Material => {
        // Empty array ⇒ no clipping (three.js no-ops). Non-empty ⇒ GPU clip;
        // clipShadows keeps cast shadows consistent with the cut.
        // clipIntersection=true (cutaway) drops fragments only where behind
        // ALL planes — the corner wedge — instead of the union of half-spaces.
        m.clippingPlanes = clippingPlanes;
        m.clipShadows = true;
        m.clipIntersection = clipIntersection;
        // A clipped solid must render its interior walls, or the cut reads
        // as an empty shell from outside.
        if (clippingPlanes.length > 0) m.side = THREE.DoubleSide;
        return m;
    };
    if (viewMode3D === 'wireframe') {
        // Wireframe mode never shows the triangulation. Faces become a faint
        // depth-tested ghost so orientation still reads, while the BREP edge
        // curves (drawn as line segments in ShapeGeometry) define the shape.
        // depthWrite stays off so the ghost never occludes edge lines.
        return applyClip(new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: WIREFRAME_GHOST_OPACITY,
            depthWrite: false,
            side: THREE.DoubleSide,
        }));
    }
    if (pbr && !isSelected) {
        const pbrMaterial = buildMaterialFromPBR(pbr) as THREE.MeshPhysicalMaterial;
        pbrMaterial.flatShading = flatShading;
        pbrMaterial.side = THREE.DoubleSide;
        pbrMaterial.depthWrite = (pbr.opacity ?? 1) >= 1;
        return applyClip(pbrMaterial);
    }
    return applyClip(new THREE.MeshLambertMaterial({
        color,
        flatShading,
    }));
}
