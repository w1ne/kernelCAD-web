// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

export interface SerializedEdgeMesh {
    volume?: number;
    edges?: number[];
    edgeRanges?: number[];
    edgeStableIds?: string[];
    transform?: number[];
}

export interface CameraProbeState {
    viewMatrix: number[];
    projectionMatrix: number[];
}

export interface ProjectedEdge {
    stableId: string;
    point: { x: number; y: number };
}

/** Find the arc-length midpoint of each tessellated BREP edge in model space. */
export function edgeMidpoints(feature: SerializedEdgeMesh): Array<{ stableId: string; point: THREE.Vector3 }> {
    const edges = feature.edges;
    const ranges = feature.edgeRanges;
    const stableIds = feature.edgeStableIds;
    if (!edges || !ranges || !stableIds) return [];
    const transform = feature.transform ? new THREE.Matrix4().fromArray(feature.transform) : null;
    const midpoints: Array<{ stableId: string; point: THREE.Vector3 }> = [];
    stableIds.forEach((stableId, edgeIndex) => {
        const start = ranges[edgeIndex * 2];
        const count = ranges[edgeIndex * 2 + 1];
        if (start === undefined || count === undefined || count < 2) return;
        const points: THREE.Vector3[] = [];
        for (let vertex = start; vertex < start + count; vertex += 1) {
            const x = edges[vertex * 3];
            const y = edges[vertex * 3 + 1];
            const z = edges[vertex * 3 + 2];
            if (x === undefined || y === undefined || z === undefined) return;
            points.push(new THREE.Vector3(x, y, z));
        }
        const lengths = points.slice(1).map((point, index) => point.distanceTo(points[index]!));
        const halfLength = lengths.reduce((sum, length) => sum + length, 0) / 2;
        let traversed = 0;
        let midpoint = points[0]!.clone();
        for (let segment = 0; segment < lengths.length; segment += 1) {
            const length = lengths[segment]!;
            if (traversed + length >= halfLength) {
                midpoint = points[segment]!.clone().lerp(points[segment + 1]!, length > 0 ? (halfLength - traversed) / length : 0);
                break;
            }
            traversed += length;
        }
        if (transform) midpoint.applyMatrix4(transform);
        midpoints.push({ stableId, point: midpoint });
    });
    return midpoints;
}

/** Project those model-space points through the viewer camera and canvas. */
export function projectEdgesToCanvas(
    edges: Array<{ stableId: string; point: THREE.Vector3 }>,
    camera: CameraProbeState,
    rect: { x: number; y: number; width: number; height: number },
): ProjectedEdge[] {
    const viewProjection = new THREE.Matrix4().fromArray(camera.projectionMatrix)
        .multiply(new THREE.Matrix4().fromArray(camera.viewMatrix));
    return edges.flatMap(({ stableId, point }) => {
        const clip = new THREE.Vector4(point.x, point.y, point.z, 1).applyMatrix4(viewProjection);
        if (clip.w <= 0) return [];
        const ndcZ = clip.z / clip.w;
        if (ndcZ < -1 || ndcZ > 1) return [];
        const x = rect.x + ((clip.x / clip.w + 1) / 2) * rect.width;
        const y = rect.y + ((1 - clip.y / clip.w) / 2) * rect.height;
        if (x < rect.x + 24 || x > rect.x + rect.width - 24 || y < rect.y + 52 || y > rect.y + rect.height - 52) return [];
        return [{ stableId, point: { x, y } }];
    }).sort((left, right) => {
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        return Math.hypot(left.point.x - centerX, left.point.y - centerY)
            - Math.hypot(right.point.x - centerX, right.point.y - centerY);
    });
}
