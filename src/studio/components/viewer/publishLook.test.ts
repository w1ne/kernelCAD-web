// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { FaceGeometry } from '../../../shared/worker/geometryEngine';
import {
    LIVE_CONTACT_SHADOW_LAYERS,
    PUBLISH_EDGE_SHADE,
    PUBLISH_LIGHTS,
    cameraAzimuthDeg,
    featureEdgePositions,
    publishEdgeColor,
} from './publishLook';
import { CONTACT_SHADOW_LAYERS } from '../demoPlayer/contactShadow';

function face(faceId: number, vertices: number[], normal: [number, number, number]): FaceGeometry {
    const normals: number[] = [];
    for (let i = 0; i < vertices.length / 3; i++) normals.push(...normal);
    return {
        faceId,
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        indices: new Uint32Array([0, 1, 2]),
    };
}

describe('publish look rig', () => {
    it('measures the camera azimuth in the publish-preset convention', () => {
        const target = { x: 0, y: 0, z: 0 };
        expect(cameraAzimuthDeg({ x: 0, y: -10, z: 5 }, target)).toBeCloseTo(0);
        expect(cameraAzimuthDeg({ x: 10, y: 0, z: 5 }, target)).toBeCloseTo(90);
        expect(cameraAzimuthDeg({ x: 0, y: 10, z: 5 }, target)).toBeCloseTo(180);
        expect(cameraAzimuthDeg({ x: 0, y: 0, z: 5 }, target)).toBe(0);
    });

    it('keys from above the camera side with a weaker fill and a rim from behind', () => {
        const [key, fill, rim] = PUBLISH_LIGHTS;
        expect(key!.elDeg).toBeGreaterThan(30);
        expect(Math.abs(key!.azOffsetDeg)).toBeLessThan(90);
        expect(fill!.intensity).toBeLessThan(key!.intensity);
        expect(Math.abs(rim!.azOffsetDeg)).toBeGreaterThan(120);
    });

    it('bakes the live contact shadow at a quarter of the capture texture area', () => {
        LIVE_CONTACT_SHADOW_LAYERS.forEach((layer, i) => {
            expect(layer.textureSize).toBe(CONTACT_SHADOW_LAYERS[i]!.textureSize / 2);
            expect(layer.textureSize).toBeLessThanOrEqual(512);
        });
    });

    it('draws edges in a darker shade of the body colour', () => {
        const c = publishEdgeColor(0x808080);
        const base = new THREE.Color(0x808080);
        expect(c.r).toBeCloseTo(base.r * PUBLISH_EDGE_SHADE);
    });
});

describe('featureEdgePositions', () => {
    // Two faces sharing the edge (0,0,0)-(1,0,0).
    const edge = [0, 0, 0, 1, 0, 0];
    const top = (n: [number, number, number]) => face(1, [0, 0, 0, 1, 0, 0, 0, 1, 0], n);
    const side = (n: [number, number, number]) => face(2, [0, 0, 0, 1, 0, 0, 0, 0, -1], n);

    it('keeps a crease between faces at a right angle', () => {
        const out = featureEdgePositions([top([0, 0, 1]), side([0, -1, 0])], new Float32Array(edge), [0, 2]);
        expect(Array.from(out)).toEqual(edge);
    });

    it('drops a tangent edge (the normals agree across it)', () => {
        const out = featureEdgePositions([top([0, 0, 1]), side([0, 0.05, 0.9987])], new Float32Array(edge), [0, 2]);
        expect(out).toHaveLength(0);
    });

    it('drops the seam of a periodic face (the face meets itself)', () => {
        // One face, its seam vertices duplicated (u = 0 and u = 2π).
        const seamFace: FaceGeometry = {
            faceId: 7,
            vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0]),
            normals: new Float32Array([0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]),
            indices: new Uint32Array([0, 1, 2, 1, 2, 3]),
        };
        const out = featureEdgePositions([seamFace], new Float32Array(edge), [0, 2]);
        expect(out).toHaveLength(0);
    });

    it('keeps a free boundary of an open sheet', () => {
        const out = featureEdgePositions([top([0, 0, 1])], new Float32Array(edge), [0, 2]);
        expect(Array.from(out)).toEqual(edge);
    });

    it('keeps an edge it cannot match to faces, and every edge without ranges', () => {
        const stray = [5, 5, 5, 6, 6, 6];
        expect(Array.from(featureEdgePositions([top([0, 0, 1])], new Float32Array(stray), [0, 2]))).toEqual(stray);
        expect(Array.from(featureEdgePositions([top([0, 0, 1])], new Float32Array(edge), undefined))).toEqual(edge);
    });
});
