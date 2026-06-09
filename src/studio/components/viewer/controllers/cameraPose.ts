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

export function buildFitCameraPose(center: THREE.Vector3, distance: number): CameraPose {
    const direction = new THREE.Vector3(1, 1, 0.75).normalize();
    return {
        position: center.clone().add(direction.multiplyScalar(distance)),
        lookAt: center.clone(),
        up: new THREE.Vector3(0, 0, 1),
    };
}
