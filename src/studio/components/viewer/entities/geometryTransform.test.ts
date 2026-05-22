import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyGeometryTransform, matrixFromGeometryTransform } from './geometryTransform';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';

describe('geometryTransform', () => {
    it('builds a column-major Matrix4 from GeometryResult transform metadata', () => {
        const geometry = {
            faces: [],
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 12, 0, 34, 1],
        } satisfies GeometryResult;

        const matrix = matrixFromGeometryTransform(geometry);

        expect(matrix).toBeInstanceOf(THREE.Matrix4);
        expect(new THREE.Vector3(1, 2, 3).applyMatrix4(matrix!).toArray()).toEqual([13, 2, 37]);
    });

    it('applies no transform when metadata is absent', () => {
        const point = new THREE.Vector3(1, 2, 3);
        const transformed = applyGeometryTransform(point, { faces: [] });

        expect(transformed.toArray()).toEqual([1, 2, 3]);
    });
});
