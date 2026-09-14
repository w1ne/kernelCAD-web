// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { detectMeshFormat, MeshParseError, parseMeshBytes, parseObj, parseStl } from '../../../src/agent/reconstruct/meshIO';

const TRI = [0, 0, 0, 1, 0, 0, 0, 1, 0];

function binaryStl(tris: number[][]): Uint8Array {
  const buf = new ArrayBuffer(84 + tris.length * 50);
  const view = new DataView(buf);
  // Deliberately start the header with "solid" — many binary writers do.
  new Uint8Array(buf).set(new TextEncoder().encode('solid binary header'), 0);
  view.setUint32(80, tris.length, true);
  tris.forEach((t, i) => t.forEach((v, k) => view.setFloat32(84 + i * 50 + 12 + k * 4, v, true)));
  return new Uint8Array(buf);
}

describe('meshIO', () => {
  it('reads binary STL by its exact size even when the header says "solid"', () => {
    const bytes = binaryStl([TRI, [0, 0, 1, 1, 0, 1, 0, 1, 1]]);
    expect(detectMeshFormat(undefined, bytes)).toBe('stl');
    const soup = parseStl(bytes);
    expect(soup.positions).toHaveLength(18);
    expect(Array.from(soup.positions.slice(9, 12))).toEqual([0, 0, 1]);
    expect(soup.unitDeclared).toBe(false);
  });

  it('reads ASCII STL facets', () => {
    const text = `solid t\nfacet normal 0 0 1\n outer loop\n  vertex 0 0 0\n  vertex 2 0 0\n  vertex 0 3 0\n endloop\nendfacet\nendsolid t\n`;
    const soup = parseMeshBytes(new TextEncoder().encode(text), 'stl');
    expect(Array.from(soup.positions)).toEqual([0, 0, 0, 2, 0, 0, 0, 3, 0]);
  });

  it('fan-triangulates OBJ polygons and resolves negative indices', () => {
    const soup = parseObj('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1/1 2/2 3/3 -1\n');
    expect(soup.positions).toHaveLength(18);
    expect(Array.from(soup.positions.slice(9))).toEqual([0, 0, 0, 1, 1, 0, 0, 1, 0]);
  });

  it('reads 3MF mesh triangles and converts the declared unit to mm', () => {
    const model = `<?xml version="1.0"?><model unit="centimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
      <resources><object id="1" type="model"><mesh>
        <vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="2" z="0"/></vertices>
        <triangles><triangle v1="0" v2="1" v3="2"/></triangles>
      </mesh></object></resources><build><item objectid="1"/></build></model>`;
    const bytes = zipSync({ '3D/3dmodel.model': strToU8(model), '[Content_Types].xml': strToU8('<Types/>') });
    expect(detectMeshFormat('part.3mf', bytes)).toBe('3mf');
    const soup = parseMeshBytes(bytes, '3mf');
    expect(Array.from(soup.positions)).toEqual([0, 0, 0, 10, 0, 0, 0, 20, 0]);
    expect(soup.unitDeclared).toBe(true);
    expect(soup.unit).toBe('centimeter');
  });

  it('refuses bytes that are no mesh at all', () => {
    const junk = new TextEncoder().encode('hello, this is not a mesh');
    expect(() => detectMeshFormat(undefined, junk)).toThrow(MeshParseError);
    expect(() => parseMeshBytes(junk, 'stl')).toThrow(MeshParseError);
    expect(() => parseObj('v 0 0 0\nf 1 2 3\n')).toThrow(MeshParseError);
  });
});
