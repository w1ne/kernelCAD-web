// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_TRIANGLES } from '../../kernel/backends/occt/importStl';
import {
    isStlFileName,
    MAX_STL_ATTACHMENT_BYTES,
    MAX_STL_ATTACHMENT_TRIANGLES,
    meshAttachmentPromptNote,
    stlAttachmentFromBytes,
} from './meshAttachment';

function binaryStl(count: number, vertex: (i: number) => [number, number, number] = () => [0, 0, 0]): Uint8Array {
    const bytes = new Uint8Array(84 + count * 50);
    const view = new DataView(bytes.buffer);
    view.setUint32(80, count, true);
    for (let i = 0; i < count; i++) {
        for (let j = 0; j < 3; j++) {
            const v = vertex(i * 3 + j);
            v.forEach((c, k) => view.setFloat32(84 + i * 50 + 12 + j * 12 + k * 4, c, true));
        }
    }
    return bytes;
}

describe('stlAttachmentFromBytes', () => {
    it('encodes and measures a binary STL', () => {
        const corners: [number, number, number][] = [[0, 0, 0], [80, 0, 0], [0, 30, 12.5]];
        const att = stlAttachmentFromBytes('bracket.stl', binaryStl(1, j => corners[j]));
        expect(att).toMatchObject({
            format: 'stl', fileName: 'bracket.stl', encoding: 'binary', triangleCount: 1,
            bounds: { min: [0, 0, 0], max: [80, 30, 12.5] },
        });
        expect(att.dataUrl.startsWith('data:model/stl;base64,')).toBe(true);
        const decoded = atob(att.dataUrl.slice('data:model/stl;base64,'.length));
        expect(decoded.length).toBe(84 + 50);
    });
    it('accepts an ASCII STL', () => {
        const ascii = 'solid s\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 2 3\nendloop\nendfacet\nendsolid s\n';
        const att = stlAttachmentFromBytes('a.stl', new TextEncoder().encode(ascii));
        expect(att).toMatchObject({ encoding: 'ascii', triangleCount: 1, bounds: { min: [0, 0, 0], max: [1, 2, 3] } });
    });
    it('refuses empty, unreadable and oversized files with a clear message', () => {
        expect(() => stlAttachmentFromBytes('e.stl', new Uint8Array())).toThrow('e.stl is empty.');
        expect(() => stlAttachmentFromBytes('x.stl', new TextEncoder().encode('not a mesh'))).toThrow('not a readable STL');
        expect(() => stlAttachmentFromBytes('big.stl', new Uint8Array(MAX_STL_ATTACHMENT_BYTES + 1))).toThrow('10 MiB or smaller');
    });
    it('refuses a mesh above the lib.fromSTL triangle budget before sending it', () => {
        const over = binaryStl(MAX_STL_ATTACHMENT_TRIANGLES + 1);
        expect(over.byteLength).toBeLessThanOrEqual(MAX_STL_ATTACHMENT_BYTES);
        expect(() => stlAttachmentFromBytes('dense.stl', over)).toThrow('200,001 triangles; the limit is 200,000');
        expect(() => stlAttachmentFromBytes('ok.stl', binaryStl(MAX_STL_ATTACHMENT_TRIANGLES))).not.toThrow();
    });
    it('keeps the budget equal to the importer default', () => {
        expect(MAX_STL_ATTACHMENT_TRIANGLES).toBe(DEFAULT_MAX_TRIANGLES);
    });
    it('recognises .stl names case-insensitively', () => {
        expect(isStlFileName('Part.STL')).toBe(true);
        expect(isStlFileName('part.step')).toBe(false);
    });
});

describe('meshAttachmentPromptNote', () => {
    it('states the triangle count, bounds and size for the agent', () => {
        const att = stlAttachmentFromBytes('cup.stl', binaryStl(1, j => [[-10, -10, 0], [10, 10, 0], [0, 0, 95.25]][j] as [number, number, number]));
        expect(meshAttachmentPromptNote(att)).toBe(
            'Attached mesh: cup.stl (binary STL, 1 triangle). Bounding box in file units (mm): ' +
            'X -10 to 10, Y -10 to 10, Z 0 to 95.25; size 20 x 20 x 95.25.',
        );
    });
});
