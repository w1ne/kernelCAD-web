// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import type { FaceGeometry } from "../../../../shared/worker/geometryEngine";

/** One BufferGeometry for many faces, so a whole-part highlight is one draw. */
export function mergeFaces(faces: readonly FaceGeometry[]): THREE.BufferGeometry {
    let vertexCount = 0;
    let indexCount = 0;
    for (const f of faces) {
        vertexCount += f.vertices.length;
        indexCount += f.indices.length;
    }
    const positions = new Float32Array(vertexCount);
    const normals = new Float32Array(vertexCount);
    const indices = new Uint32Array(indexCount);
    let vOffset = 0;
    let iOffset = 0;
    for (const f of faces) {
        positions.set(f.vertices, vOffset);
        normals.set(f.normals, vOffset);
        const base = vOffset / 3;
        for (let k = 0; k < f.indices.length; k++) indices[iOffset + k] = f.indices[k]! + base;
        vOffset += f.vertices.length;
        iOffset += f.indices.length;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    return geometry;
}
