// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { HoverManager, type InteractionType } from './HoverManager';
import * as THREE from 'three';

// Mock function to create a fake intersection
function createMockIntersection(distance: number, type: InteractionType | undefined): THREE.Intersection {
    const object = new THREE.Object3D();
    if (type) {
        object.userData = { type };
    }
    return {
        distance,
        point: new THREE.Vector3(),
        object: object,
        uv: undefined,
        face: null,
        faceIndex: undefined
    };
}

describe('HoverManager', () => {
    it('should return null for empty intersections', () => {
        expect(HoverManager.getBestHover([])).toBeNull();
    });

    it('should return null if no valid userData found', () => {
        const hits = [createMockIntersection(10, undefined)];
        expect(HoverManager.getBestHover(hits)).toBeNull();
    });

    it('should pick the closest object if types are same', () => {
        const hits = [
            createMockIntersection(10, 'FACE'),
            createMockIntersection(5, 'FACE')
        ];
        const res = HoverManager.getBestHover(hits);
        expect(res).toBeDefined();
        expect(res?.distance).toBeUndefined(); // Result is HoverResult not Intersection
        expect(res?.object).toBe(hits[1].object);
    });

    it('should prioritize VERTEX over EDGE even if VERTEX is slightly further (within tolerance)', () => {
        // Vertex at 10.1, Edge at 10.0
        // Tolerance is 0.2
        // Diff is 0.1 <= 0.2, so they are "same depth"
        // Priority: Vertex (3) > Edge (2)

        const edge = createMockIntersection(10.0, 'EDGE');
        const vertex = createMockIntersection(10.1, 'VERTEX');

        const hits = [edge, vertex]; // Sorted by distance usually

        const res = HoverManager.getBestHover(hits);
        expect(res?.type).toBe('VERTEX');
    });

    it('should NOT prioritize VERTEX if it is too far behind', () => {
        // Vertex at 10.5, Edge at 10.0
        // Tolerance is 0.2
        // Diff 0.5 > 0.2. Vertex is not a candidate.

        const edge = createMockIntersection(10.0, 'EDGE');
        const vertex = createMockIntersection(10.5, 'VERTEX');

        const hits = [edge, vertex];

        const res = HoverManager.getBestHover(hits);
        expect(res?.type).toBe('EDGE');
    });

    it('should prioritize EDGE over FACE', () => {
        const face = createMockIntersection(10.0, 'FACE');
        const edge = createMockIntersection(10.05, 'EDGE');

        const hits = [face, edge];
        const res = HoverManager.getBestHover(hits);
        expect(res?.type).toBe('EDGE');
    });
});
