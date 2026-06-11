// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { computeGeometryBounds } from './cameraBounds';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';

function geom(vertices: number[]): GeometryResult {
    return {
        faces: [
            {
                vertices: new Float32Array(vertices),
                indices: new Uint32Array(),
                normals: new Float32Array(vertices.length),
                faceId: 0,
            },
        ],
    };
}

describe('computeGeometryBounds', () => {
    it('computes the center and radius across rendered geometry vertices', () => {
        const result = computeGeometryBounds([
            geom([0, 0, 0, 60, 40, 5]),
            geom([-10, 10, 2, 10, 20, 8]),
        ]);

        expect(result?.center.toArray()).toEqual([25, 20, 4]);
        expect(result?.radius).toBeGreaterThan(40);
        expect(result?.radius).toBeLessThan(41);
    });

    it('returns null when no finite vertices are available', () => {
        expect(computeGeometryBounds([])).toBeNull();
        expect(computeGeometryBounds([geom([Number.NaN, 0, 0])])).toBeNull();
    });
});
