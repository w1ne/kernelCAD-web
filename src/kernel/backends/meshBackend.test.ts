// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { decodeStlMesh, MeshBackend } from './meshBackend';

function binaryStl(count: number): Uint8Array {
  const bytes = new Uint8Array(84 + count * 50);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, count, true);
  for (let i = 0; i < count; i++) {
    const o = 84 + i * 50;
    const x = (i % 1000) * 2;
    for (const [j, v] of [x, 0, 0, x + 1, 0, 0, x, 1, 0].entries()) view.setFloat32(o + 12 + j * 4, v, true);
  }
  return bytes;
}

describe('display mesh backend', () => {
  it('decodes a million binary STL triangles in a bounded time without losing facets', () => {
    const bytes = binaryStl(1_000_000);
    const start = performance.now();
    const mesh = decodeStlMesh(bytes);
    expect(performance.now() - start).toBeLessThan(60_000);
    expect(mesh.indices.length / 3).toBe(1_000_000);
    expect(mesh.positions.length).toBeGreaterThan(0);
  });

  it('supports transforms and bounds while rejecting topology operations clearly', () => {
    const mesh = decodeStlMesh(binaryStl(1));
    const body = new MeshBackend(mesh.positions, mesh.indices).translate(4, 5, 6).rotate([0, 0, 1], 90);
    expect(body.boundingBox().min[0]).toBeCloseTo(-6);
    expect(body.boundingBox().min[1]).toBeCloseTo(4);
    expect(body.getMesh().indices).toHaveLength(3);
    expect(() => body.union(body)).toThrow(/display mesh bodies do not support booleans/i);
  });

  it('parses ASCII STL', () => {
    const bytes = new TextEncoder().encode('solid s\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid s');
    expect(decodeStlMesh(bytes).indices).toHaveLength(3);
  });

  it('accepts binary trailing bytes and zero-facet files', () => {
    const withTail = new Uint8Array(binaryStl(1).length + 7);
    withTail.set(binaryStl(1));
    expect(decodeStlMesh(withTail).indices).toHaveLength(3);
    expect(decodeStlMesh(binaryStl(0)).indices).toHaveLength(0);
  });

  it('rejects malformed data with an explicit format error', () => {
    expect(() => decodeStlMesh(new TextEncoder().encode('not an STL')))
      .toThrow(/Malformed STL/i);
  });
});
