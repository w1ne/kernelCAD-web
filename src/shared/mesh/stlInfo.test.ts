// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { countStlTriangles, inspectStl } from './stlInfo';

type Tri = [number, number, number][];

function binaryStl(tris: Tri[], header = 'solid binary header'): Uint8Array {
    const bytes = new Uint8Array(84 + tris.length * 50);
    bytes.set(new TextEncoder().encode(header).slice(0, 80));
    const view = new DataView(bytes.buffer);
    view.setUint32(80, tris.length, true);
    tris.forEach((tri, i) => {
        tri.forEach((v, j) => v.forEach((c, k) => view.setFloat32(84 + i * 50 + 12 + j * 12 + k * 4, c, true)));
    });
    return bytes;
}

function asciiStl(tris: Tri[]): Uint8Array {
    const facets = tris.map(tri => `facet normal 0 0 1\n outer loop\n${tri.map(v => `  vertex ${v.join(' ')}`).join('\n')}\n endloop\nendfacet`);
    return new TextEncoder().encode(`solid part\n${facets.join('\n')}\nendsolid part\n`);
}

const tris: Tri[] = [
    [[0, 0, 0], [40, 0, 0], [0, 20, 0]],
    [[0, 0, 10], [40, 20, 10], [-5, 0, 2.5]],
];

describe('inspectStl', () => {
    it('measures a binary STL whose header starts with "solid"', () => {
        const info = inspectStl(binaryStl(tris));
        expect(info).toEqual({ binary: true, triangleCount: 2, bounds: { min: [-5, 0, 0], max: [40, 20, 10] } });
        expect(countStlTriangles(binaryStl(tris))).toEqual({ count: 2, binary: true });
    });
    it('measures an ASCII STL, including exponent notation', () => {
        const bytes = asciiStl([...tris, [[1e1, 0, 0], [0, 2.5e1, 0], [0, 0, -1.5E+1]]]);
        expect(inspectStl(bytes)).toEqual({ binary: false, triangleCount: 3, bounds: { min: [-5, 0, -15], max: [40, 25, 10] } });
    });
    it('reads a subarray view at a non-zero offset', () => {
        const inner = binaryStl(tris);
        const outer = new Uint8Array(inner.length + 7);
        outer.set(inner, 7);
        expect(inspectStl(outer.subarray(7)).bounds).toEqual({ min: [-5, 0, 0], max: [40, 20, 10] });
    });
    it('reports no triangles and no bounds for non-STL bytes', () => {
        expect(inspectStl(new TextEncoder().encode('hello world'))).toEqual({ binary: false, triangleCount: 0, bounds: null });
    });
});
