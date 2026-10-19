// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import type { GeometryResult } from "../../../../shared/worker/geometryEngine";
import { applyGeometryTransform } from "../entities/geometryTransform";

export function computeGeometryBounds(
    geometries: GeometryResult[],
): { center: THREE.Vector3; radius: number; min: THREE.Vector3; max: THREE.Vector3 } | null {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    let sawVertex = false;

    for (const geometry of geometries) {
        for (const face of geometry.faces) {
            const vertices = face.vertices;
            for (let i = 0; i < vertices.length; i += 3) {
                const x = vertices[i];
                const y = vertices[i + 1];
                const z = vertices[i + 2];
                if (
                    x === undefined ||
                    y === undefined ||
                    z === undefined ||
                    !Number.isFinite(x) ||
                    !Number.isFinite(y) ||
                    !Number.isFinite(z)
                ) {
                    continue;
                }
                sawVertex = true;
                const point = applyGeometryTransform(new THREE.Vector3(x, y, z), geometry);
                min.min(point);
                max.max(point);
            }
        }
    }

    if (!sawVertex) return null;

    const center = min.clone().add(max).multiplyScalar(0.5);
    const radius = Math.max(min.distanceTo(max) / 2, 1);
    return { center, radius, min, max };
}

/**
 * Up to `max` world-space vertices spread evenly over the model. The phone
 * fit frames these rather than the bounding box: an assembly's box corners
 * sit far outside its silhouette (a tall arm on a wide base), so a box fit
 * leaves the model small.
 */
export function sampleGeometryPoints(geometries: GeometryResult[], max = 3000): THREE.Vector3[] {
    let total = 0;
    for (const geometry of geometries) for (const face of geometry.faces) total += Math.floor(face.vertices.length / 3);
    if (total === 0) return [];
    const stride = Math.max(1, Math.ceil(total / max));
    const out: THREE.Vector3[] = [];
    let index = 0;
    for (const geometry of geometries) {
        for (const face of geometry.faces) {
            const vertices = face.vertices;
            for (let i = 0; i + 2 < vertices.length; i += 3, index++) {
                if (index % stride !== 0) continue;
                const x = vertices[i];
                const y = vertices[i + 1];
                const z = vertices[i + 2];
                if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
                out.push(applyGeometryTransform(new THREE.Vector3(x, y, z), geometry));
            }
        }
    }
    return out;
}
