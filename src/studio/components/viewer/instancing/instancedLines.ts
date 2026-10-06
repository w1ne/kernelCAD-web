// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// BREP edges of an instance group as ONE draw call: an InstancedBufferGeometry
// with a per-instance `instanceMatrix` attribute, drawn by LineBasicMaterial
// with USE_INSTANCING defined (three's project_vertex chunk then applies
// instanceMatrix). three's LineSegments.raycast ignores instancing, so the
// object's raycast is replaced by a per-instance loop.
import * as THREE from 'three';

export function buildInstancedEdgeGeometry(
    edges: Float32Array,
    matrices: readonly THREE.Matrix4[],
): THREE.InstancedBufferGeometry {
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(edges, 3));
    const data = new Float32Array(matrices.length * 16);
    matrices.forEach((m, i) => m.toArray(data, i * 16));
    geo.setAttribute('instanceMatrix', new THREE.InstancedBufferAttribute(data, 16));
    geo.instanceCount = matrices.length;
    geo.computeBoundingSphere();
    return geo;
}

export function makeInstancedLineMaterial(
    color: THREE.ColorRepresentation,
    clippingPlanes: THREE.Plane[],
    clipIntersection: boolean,
): THREE.LineBasicMaterial {
    const material = new THREE.LineBasicMaterial({ color, clippingPlanes, clipIntersection });
    material.defines = { ...(material.defines ?? {}), USE_INSTANCING: '' };
    return material;
}

const probe = new THREE.LineSegments();

export function raycastInstancedLines(
    lines: THREE.LineSegments,
    matrices: readonly THREE.Matrix4[],
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[],
): void {
    probe.geometry = lines.geometry;
    probe.material = lines.material;
    const found: THREE.Intersection[] = [];
    for (let i = 0; i < matrices.length; i++) {
        probe.matrixWorld.multiplyMatrices(lines.matrixWorld, matrices[i]);
        found.length = 0;
        THREE.LineSegments.prototype.raycast.call(probe, raycaster, found);
        for (const hit of found) intersects.push({ ...hit, object: lines, instanceId: i });
    }
}
