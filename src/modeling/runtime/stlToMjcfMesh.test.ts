// src/modeling/runtime/stlToMjcfMesh.test.ts
//
// Unit tests for the binary-STL → MJCF vertex-string formatter. Round-
// trips known geometry: two-triangle quad → exact vertex string;
// cube STL (12 triangles) → 8 unique vertices.
//
// Spec:  docs/specs/2026-06-03-physics-loop-P11-collision-aware-mujoco.md
// Plan:  docs/plans/2026-06-03-physics-loop-P11-slice-1-collision-geom-emission.md

import { describe, expect, it } from 'vitest';
import { encodeBinaryStl } from '../../kernel/backends/occt/exportStlBinary';
import { stlToMjcfMesh } from './stlToMjcfMesh';

describe('stlToMjcfMesh', () => {
    it('parses two known triangles into the expected vertex string', () => {
        // Two triangles sharing an edge — forms a unit square on z=0.
        //   v0 = (0,0,0)  v1 = (1,0,0)  v2 = (0,1,0)  v3 = (1,1,0)
        // Triangles: (v0,v1,v2), (v1,v3,v2). Shared verts after dedup: 4.
        const vertices = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0];
        const triangles = [0, 1, 2, 1, 3, 2];
        const stl = encodeBinaryStl({ vertices, triangles });
        const { vertex, triangleCount, vertexCount } = stlToMjcfMesh(
            Uint8Array.from(stl),
        );
        expect(triangleCount).toBe(2);
        expect(vertexCount).toBe(4);
        // The 4 unique vertices, in first-seen order from the triangle stream:
        //   (0,0,0), (1,0,0), (0,1,0), (1,1,0).
        expect(vertex).toBe(
            '0.0000 0.0000 0.0000 1.0000 0.0000 0.0000 0.0000 1.0000 0.0000 1.0000 1.0000 0.0000',
        );
    });

    it('dedups a cube STL (12 triangles, 36 raw verts) to 8 unique vertices', () => {
        // Hand-built unit cube vertex / index list (size 2 along each axis,
        // centred at origin so coordinates are ±1).
        const cubeVertices = [
            -1, -1, -1, // 0
             1, -1, -1, // 1
             1,  1, -1, // 2
            -1,  1, -1, // 3
            -1, -1,  1, // 4
             1, -1,  1, // 5
             1,  1,  1, // 6
            -1,  1,  1, // 7
        ];
        // 12 triangles, 2 per face.
        const cubeTriangles = [
            // -Z bottom
            0, 2, 1,  0, 3, 2,
            // +Z top
            4, 5, 6,  4, 6, 7,
            // -Y front
            0, 1, 5,  0, 5, 4,
            // +Y back
            2, 3, 7,  2, 7, 6,
            // -X left
            0, 4, 7,  0, 7, 3,
            // +X right
            1, 2, 6,  1, 6, 5,
        ];
        const stl = encodeBinaryStl({
            vertices: cubeVertices,
            triangles: cubeTriangles,
        });
        const { triangleCount, vertexCount } = stlToMjcfMesh(Uint8Array.from(stl));
        expect(triangleCount).toBe(12);
        expect(vertexCount).toBe(8); // cube has exactly 8 unique corners
    });

    it('throws on zero-triangle STL (a part with no collision geometry can\'t contact)', () => {
        const empty = encodeBinaryStl({ vertices: [], triangles: [] });
        expect(() => stlToMjcfMesh(Uint8Array.from(empty))).toThrow(/zero triangles/);
    });

    it('throws on truncated input (below the 84-byte header threshold)', () => {
        const tiny = new Uint8Array(40);
        expect(() => stlToMjcfMesh(tiny)).toThrow(/too short/);
    });

    it('throws when declared triangle count would overrun the buffer', () => {
        const buf = new Uint8Array(HEADER_PLUS_COUNT);
        // Write triangleCount = 1000 but provide no triangle records.
        new DataView(buf.buffer).setUint32(80, 1000, true);
        expect(() => stlToMjcfMesh(buf)).toThrow(/would require/);
    });
});

const HEADER_PLUS_COUNT = 84;
