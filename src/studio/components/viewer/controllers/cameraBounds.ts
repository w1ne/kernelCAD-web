import * as THREE from "three";
import type { GeometryResult } from "../../../../shared/worker/geometryEngine";

export function computeGeometryBounds(
    geometries: GeometryResult[],
): { center: THREE.Vector3; radius: number } | null {
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
                min.min(new THREE.Vector3(x, y, z));
                max.max(new THREE.Vector3(x, y, z));
            }
        }
    }

    if (!sawVertex) return null;

    const center = min.clone().add(max).multiplyScalar(0.5);
    const radius = Math.max(min.distanceTo(max) / 2, 1);
    return { center, radius };
}
