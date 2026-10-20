// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

const EDGE_PICK_RADIUS_PX = 7;

/** Keep the Three.js line raycast tolerance close to a fixed CSS-pixel radius. */
export function edgeRaycastThreshold(camera: THREE.Camera, viewportHeight: number, distanceFromTarget = camera.position.length()): number {
    if (viewportHeight <= 0) return 0.01;
    if (camera instanceof THREE.PerspectiveCamera) {
        return (2 * Math.max(distanceFromTarget, camera.near) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
            / viewportHeight) * EDGE_PICK_RADIUS_PX;
    }
    if (camera instanceof THREE.OrthographicCamera) {
        return ((camera.top - camera.bottom) / viewportHeight) * EDGE_PICK_RADIUS_PX;
    }
    return 0.01;
}
