// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

export type ViewTarget = 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'fit';

export interface CameraPose {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    up: THREE.Vector3;
}

const DIRECTIONS: Record<Exclude<ViewTarget, 'fit'>, [number, number, number]> = {
    x: [1, 0, 0],
    y: [0, 1, 0],
    z: [0, 0, 1],
    xy: [0, 0, 1],
    xz: [0, -1, 0],
    yz: [1, 0, 0],
};

export function buildCameraPose(
    target: Exclude<ViewTarget, 'fit'>,
    center: THREE.Vector3,
    distance: number,
): CameraPose {
    const direction = new THREE.Vector3(...DIRECTIONS[target]).normalize();
    const up = Math.abs(direction.z) > 0.95
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);

    return {
        position: center.clone().add(direction.multiplyScalar(distance)),
        lookAt: center.clone(),
        up,
    };
}

/**
 * Distance at which a bounding sphere of `radius` sits fully inside a
 * perspective frustum.
 *
 * The constant this replaces (`radius * 2.8`) was wrong on two counts.
 *
 * 1. It under-shoots even the vertical limit. Framing a *sphere* needs
 *    `radius / sin(fov/2)`; only a flat disc facing the camera needs
 *    `radius / tan(fov/2)`. At the viewer's 40° fov that is 2.924 vs 2.747 —
 *    2.8 sits between them, so the model always overflowed slightly.
 * 2. It ignores the aspect ratio. `camera.fov` is the VERTICAL angle, so the
 *    horizontal one is narrower on any viewport taller than it is wide, and
 *    the narrow axis is the one that crops. A 420x780 embed needs 5.2 * radius;
 *    2.8 put the camera less than half far enough away.
 *
 * `margin` leaves a little air around the model instead of framing it
 * edge-to-edge.
 */
export function fitDistance(
    radius: number,
    fovDegrees: number,
    aspect: number,
    margin = 1.08,
): number {
    const safeFov = Number.isFinite(fovDegrees) && fovDegrees > 0 && fovDegrees < 180
        ? fovDegrees
        : 40;
    // Aspect is 0/NaN until the canvas has been measured once; a square
    // viewport is the neutral assumption (it never under-shoots a wide one).
    const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    const halfVertical = (safeFov * Math.PI) / 360;
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * safeAspect);
    return (radius * margin) / Math.sin(Math.min(halfVertical, halfHorizontal));
}

/** Same, reading the fov/aspect off a camera that may not be perspective. */
export function fitDistanceForCamera(radius: number, camera: THREE.Camera): number {
    const perspective = camera as THREE.PerspectiveCamera;
    return fitDistance(radius, perspective.fov, perspective.aspect);
}

export function buildFitCameraPose(center: THREE.Vector3, distance: number): CameraPose {
    const direction = new THREE.Vector3(1, 1, 0.75).normalize();
    return {
        position: center.clone().add(direction.multiplyScalar(distance)),
        lookAt: center.clone(),
        up: new THREE.Vector3(0, 0, 1),
    };
}
