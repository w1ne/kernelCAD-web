// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { exportMeshPly, plyPartRgb } from './plyFormat';
import { parsePly, plyBbox } from '../../../tests/helpers/plyParse';

const triangle = { vertices: [0, 0, 0, 10, 0, 0, 0, 10, 0], triangles: [0, 1, 2] };

/** Unit cube with 8 welded corners and 12 triangles, outward winding. */
const cube = {
  vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
  triangles: [
    0, 2, 1, 0, 3, 2, // -z
    4, 5, 6, 4, 6, 7, // +z
    0, 1, 5, 0, 5, 4, // -y
    2, 3, 7, 2, 7, 6, // +y
    1, 2, 6, 1, 6, 5, // +x
    0, 4, 7, 0, 7, 3, // -x
  ],
};

function headerOf(bytes: Uint8Array): string {
  const text = new TextDecoder('latin1').decode(bytes);
  return text.slice(0, text.indexOf('end_header\n') + 'end_header\n'.length);
}

describe('PLY writer', () => {
  it('writes a binary little-endian header with normals, vertex colours and a uchar/int face list', () => {
    const bytes = exportMeshPly([{ name: 'Plate', mesh: triangle, rgb: [255, 0, 0] }]);
    expect(headerOf(bytes)).toBe([
      'ply',
      'format binary_little_endian 1.0',
      'comment kernelCAD PLY mesh export; units mm; Z up',
      'comment part 0 Plate',
      'element vertex 3',
      'property float x', 'property float y', 'property float z',
      'property float nx', 'property float ny', 'property float nz',
      'property uchar red', 'property uchar green', 'property uchar blue',
      'element face 1',
      'property list uchar int vertex_indices',
      'end_header',
      '',
    ].join('\n'));
  });

  it('lays out binary records exactly: 27-byte vertices then 13-byte faces', () => {
    const bytes = exportMeshPly([{ name: 'Plate', mesh: triangle, rgb: [10, 20, 30] }]);
    const h = headerOf(bytes).length;
    expect(bytes.length).toBe(h + 3 * 27 + 1 * 13);
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    // second vertex: (10, 0, 0), normal +Z, colour (10, 20, 30)
    const v1 = h + 27;
    expect([view.getFloat32(v1, true), view.getFloat32(v1 + 4, true), view.getFloat32(v1 + 8, true)]).toEqual([10, 0, 0]);
    expect([view.getFloat32(v1 + 12, true), view.getFloat32(v1 + 16, true), view.getFloat32(v1 + 20, true)]).toEqual([0, 0, 1]);
    expect([bytes[v1 + 24], bytes[v1 + 25], bytes[v1 + 26]]).toEqual([10, 20, 30]);
    const f = h + 3 * 27;
    expect(view.getUint8(f)).toBe(3);
    expect([view.getInt32(f + 1, true), view.getInt32(f + 5, true), view.getInt32(f + 9, true)]).toEqual([0, 1, 2]);
  });

  it('writes the ASCII variant with the same element counts', () => {
    const text = new TextDecoder().decode(exportMeshPly([{ name: 'Plate', mesh: triangle, rgb: [1, 2, 3] }], { encoding: 'ascii' }));
    expect(text).toContain('format ascii 1.0\n');
    const body = text.slice(text.indexOf('end_header\n') + 11).trim().split('\n');
    expect(body).toEqual(['0 0 0 0 0 1 1 2 3', '10 0 0 0 0 1 1 2 3', '0 10 0 0 0 1 1 2 3', '3 0 1 2']);
  });

  it('puts colours on faces for colors: face and drops them for colors: none', () => {
    const face = parsePly(exportMeshPly([{ name: 'p', mesh: triangle, rgb: [9, 8, 7] }], { colors: 'face' }));
    expect(face.elements[0]!.properties.map(p => p.name)).toEqual(['x', 'y', 'z', 'nx', 'ny', 'nz']);
    expect(face.data.face![0]).toEqual({ vertex_indices: [0, 1, 2], red: 9, green: 8, blue: 7 });
    const none = parsePly(exportMeshPly([{ name: 'p', mesh: triangle }], { colors: 'none', normals: false }));
    expect(none.elements[0]!.properties.map(p => p.name)).toEqual(['x', 'y', 'z']);
    expect(none.elements[1]!.properties.map(p => p.name)).toEqual(['vertex_indices']);
  });

  it('splits normals at sharp edges so a cube keeps flat faces (24 vertices, axis normals)', () => {
    const ply = parsePly(exportMeshPly([{ name: 'cube', mesh: cube }]));
    expect(ply.data.vertex).toHaveLength(24);
    expect(ply.data.face).toHaveLength(12);
    for (const v of ply.data.vertex!) {
      const n = [v.nx, v.ny, v.nz] as number[];
      expect(n.filter(c => Math.abs(c) === 1)).toHaveLength(1);
      expect(n.filter(c => c === 0)).toHaveLength(2);
    }
    // every face's three corners carry the same normal and it points outward
    for (const f of ply.data.face!) {
      const [a, b, c] = (f.vertex_indices as number[]).map(i => ply.data.vertex![i]!);
      expect([a!.nx, a!.ny, a!.nz]).toEqual([b!.nx, b!.ny, b!.nz]);
      expect([a!.nx, a!.ny, a!.nz]).toEqual([c!.nx, c!.ny, c!.nz]);
      const centre = ((a!.x as number) + (b!.x as number) + (c!.x as number)) / 3 - 0.5;
      if (a!.nx !== 0) expect(Math.sign(centre)).toBe(a!.nx);
    }
  });

  it('keeps welded vertices when normals are off and preserves the bbox', () => {
    const ply = parsePly(exportMeshPly([{ name: 'cube', mesh: cube }], { normals: false }));
    expect(ply.data.vertex).toHaveLength(8);
    expect(plyBbox(ply)).toEqual({ min: [0, 0, 0], max: [1, 1, 1] });
  });

  it('merges parts into one vertex/face list with offset indices and per-part colours', () => {
    const shifted = { vertices: triangle.vertices.map((v, i) => (i % 3 === 0 ? v + 20 : v)), triangles: triangle.triangles };
    const ply = parsePly(exportMeshPly([
      { name: 'left', mesh: triangle, rgb: [255, 0, 0] },
      { name: 'right', mesh: shifted, rgb: [0, 0, 255] },
    ], { encoding: 'ascii' }));
    expect(ply.comments).toContain('part 0 left');
    expect(ply.comments).toContain('part 1 right');
    expect(ply.data.face!.map(f => f.vertex_indices)).toEqual([[0, 1, 2], [3, 4, 5]]);
    expect(ply.data.vertex!.slice(0, 3).every(v => v.red === 255 && v.blue === 0)).toBe(true);
    expect(ply.data.vertex!.slice(3).every(v => v.blue === 255 && v.red === 0)).toBe(true);
    expect(plyBbox(ply).max[0]).toBe(30);
  });

  it('round-trips float32 coordinates through ASCII exactly', () => {
    const odd = { vertices: [0.1, 1 / 3, -2.5e-7, 123.456, 0, 0, 0, 7.77, 0], triangles: [0, 1, 2] };
    const ascii = parsePly(exportMeshPly([{ name: 'p', mesh: odd }], { encoding: 'ascii' }));
    const binary = parsePly(exportMeshPly([{ name: 'p', mesh: odd }]));
    expect(ascii.data.vertex!.map(v => [v.x, v.y, v.z].map(c => Math.fround(c as number)))).toEqual(binary.data.vertex!.map(v => [v.x, v.y, v.z]));
  });

  it('rejects empty input and out-of-range indices', () => {
    expect(() => exportMeshPly([])).toThrow(/at least one mesh/);
    expect(() => exportMeshPly([{ name: 'bad', mesh: { vertices: [0, 0, 0], triangles: [0, 1, 2] } }])).toThrow(/out-of-range/);
  });

  it('resolves colours like the GLB/3MF writers: finish base colour over color token, default grey otherwise', () => {
    expect(plyPartRgb('#ff8000', undefined)).toEqual([255, 128, 0]);
    expect(plyPartRgb('tool', undefined)).toEqual([0xd4, 0x68, 0x3a]);
    expect(plyPartRgb('#ff0000', '#1a1c1e')).toEqual([0x1a, 0x1c, 0x1e]);
    expect(plyPartRgb(undefined, undefined)).toEqual([0xbf, 0xc4, 0xc8]);
    expect(plyPartRgb('#0f0', undefined)).toEqual([0, 255, 0]);
  });
});
