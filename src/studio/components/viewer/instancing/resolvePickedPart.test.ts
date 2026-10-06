// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { resolvePickedPart } from './resolvePickedPart';

describe('resolvePickedPart', () => {
    it('reads shapeIndex / ownerId from a plain consolidated mesh', () => {
        const mesh = new THREE.Mesh();
        mesh.userData = { type: 'FACE', shapeIndex: 4, ownerId: 'bracket' };
        expect(resolvePickedPart({ object: mesh })).toEqual({ shapeIndex: 4, ownerId: 'bracket' });
    });

    it('maps an instanced hit to the instance\'s part', () => {
        const mesh = new THREE.Mesh();
        mesh.userData = { type: 'FACE', instanceShapeIndices: [7, 9, 12], instanceParts: ['rack-0', 'rack-1', 'rack-2'] };
        expect(resolvePickedPart({ object: mesh, instanceId: 1 })).toEqual({ shapeIndex: 9, ownerId: 'rack-1' });
    });

    it('returns nothing for an instanced hit without an instance id', () => {
        const mesh = new THREE.Mesh();
        mesh.userData = { instanceShapeIndices: [7], instanceParts: ['rack-0'] };
        expect(resolvePickedPart({ object: mesh })).toEqual({});
    });

    it('gives two instances of one instanced object distinct parts', () => {
        const lines = new THREE.LineSegments();
        lines.userData = { type: 'EDGE', edgeRanges: [0, 2], instanceShapeIndices: [2, 5], instanceParts: ['left', undefined] };
        expect(resolvePickedPart({ object: lines, instanceId: 0 })).toEqual({ shapeIndex: 2, ownerId: 'left' });
        expect(resolvePickedPart({ object: lines, instanceId: 1 })).toEqual({ shapeIndex: 5 });
    });
});
