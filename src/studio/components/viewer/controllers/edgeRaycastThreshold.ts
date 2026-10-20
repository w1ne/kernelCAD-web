// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

const EDGE_PICK_RADIUS_PX = 7;

/** Center of the displayed BREP edge targets in world space. */
export function edgePickingTarget(scene: THREE.Scene, camera: THREE.Camera): THREE.Vector3 {
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    scene.traverse((object) => {
        if (object.userData.type !== 'EDGE' || !(object instanceof THREE.LineSegments)) return;
        const geometry = object.geometry;
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        if (geometry.boundingBox) bounds.union(geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
    });

    if (!bounds.isEmpty()) return bounds.getCenter(new THREE.Vector3());

    const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
    return cameraPosition.add(camera.getWorldDirection(new THREE.Vector3()));
}

/** Keep the Three.js line raycast tolerance close to a fixed CSS-pixel radius. */
export function edgeRaycastThreshold(camera: THREE.Camera, viewportHeight: number, target?: THREE.Vector3): number {
    if (viewportHeight <= 0) return 0.01;
    if (camera instanceof THREE.PerspectiveCamera) {
        const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
        const fallbackTarget = cameraPosition.clone().add(
            camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(Math.max(camera.near, 1)),
        );
        const distanceFromTarget = Math.max(camera.near, cameraPosition.distanceTo(target ?? fallbackTarget));
        return (2 * Math.max(distanceFromTarget, camera.near) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
            / viewportHeight) * EDGE_PICK_RADIUS_PX;
    }
    if (camera instanceof THREE.OrthographicCamera) {
        return ((camera.top - camera.bottom) / viewportHeight) * EDGE_PICK_RADIUS_PX;
    }
    return 0.01;
}
