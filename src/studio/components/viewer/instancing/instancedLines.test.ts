// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildInstancedEdgeGeometry, makeInstancedLineMaterial, raycastInstancedLines } from './instancedLines';

const EDGE = new Float32Array([0, 0, 0, 10, 0, 0]); // one segment along +X
const matrices = [new THREE.Matrix4(), new THREE.Matrix4().makeTranslation(0, 100, 0)];

describe('instanced edge lines', () => {
    it('builds one instanceMatrix attribute with a row per instance', () => {
        const geo = buildInstancedEdgeGeometry(EDGE, matrices);
        const attr = geo.getAttribute('instanceMatrix') as THREE.InstancedBufferAttribute;
        expect(attr.itemSize).toBe(16);
        expect(attr.count).toBe(2);
        expect(geo.instanceCount).toBe(2);
        // column-major: translation of instance 1 lives at offsets 12..14 of its 16-float row
        expect(Array.from(attr.array.slice(16 + 12, 16 + 15))).toEqual([0, 100, 0]);
    });

    it('enables the instancing shader path on a line material', () => {
        const m = makeInstancedLineMaterial(0x000000, [], false);
        expect(m.defines).toMatchObject({ USE_INSTANCING: '' });
    });

    it('raycasts each instance and reports its instanceId', () => {
        const geo = buildInstancedEdgeGeometry(EDGE, matrices);
        const lines = new THREE.LineSegments(geo, makeInstancedLineMaterial(0x000000, [], false));
        lines.updateMatrixWorld(true);
        const raycaster = new THREE.Raycaster(new THREE.Vector3(5, 100, 10), new THREE.Vector3(0, 0, -1));
        raycaster.params.Line = { threshold: 0.5 };
        const hits: THREE.Intersection[] = [];
        raycastInstancedLines(lines, matrices, raycaster, hits);
        expect(hits).toHaveLength(1);
        expect(hits[0].instanceId).toBe(1);
        expect(hits[0].object).toBe(lines);
    });
});
