// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';

export function matrixFromGeometryTransform(geometry: GeometryResult): THREE.Matrix4 | undefined {
    if (!geometry.transform) return undefined;
    if (geometry.transform.length !== 16) return undefined;
    return new THREE.Matrix4().fromArray(geometry.transform);
}

export function applyGeometryTransform(point: THREE.Vector3, geometry: GeometryResult): THREE.Vector3 {
    const matrix = matrixFromGeometryTransform(geometry);
    return matrix ? point.applyMatrix4(matrix) : point;
}
