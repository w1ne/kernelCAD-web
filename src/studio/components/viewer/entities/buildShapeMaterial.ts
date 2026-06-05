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
 *  - `'shaded'`           — smooth shading, no wireframe, no edge overlay
 *  - `'wireframe'`        — `material.wireframe = true`, surfaces drawn as lines
 *  - `'shadedWithEdges'`  — flat shading + black edge overlay rendered separately
 */
export function buildShapeMaterial(
    pbr: GeometryResult['material'],
    isSelected: boolean,
    color: number | string,
    viewMode3D: ViewMode3D,
    clippingPlanes: THREE.Plane[] = [],
): THREE.Material {
    const isWireframe = viewMode3D === 'wireframe';
    const flatShading = viewMode3D === 'shadedWithEdges';
    const applyClip = (m: THREE.Material): THREE.Material => {
        // Empty array ⇒ no clipping (three.js no-ops). Non-empty ⇒ GPU clip;
        // clipShadows keeps cast shadows consistent with the cut.
        m.clippingPlanes = clippingPlanes;
        m.clipShadows = true;
        return m;
    };
    if (pbr && !isSelected) {
        const pbrMaterial = buildMaterialFromPBR(pbr) as THREE.MeshPhysicalMaterial;
        pbrMaterial.flatShading = flatShading;
        pbrMaterial.wireframe = isWireframe;
        pbrMaterial.side = THREE.DoubleSide;
        pbrMaterial.depthWrite = (pbr.opacity ?? 1) >= 1;
        return applyClip(pbrMaterial);
    }
    return applyClip(new THREE.MeshLambertMaterial({
        color,
        flatShading,
        wireframe: isWireframe,
    }));
}
