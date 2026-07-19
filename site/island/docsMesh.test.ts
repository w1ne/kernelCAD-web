// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The format is the whole reason the docs bundle got 26.5 KB smaller: no glTF
// parser, this repo reads its own file. That is only safe if the decoder is the
// exact inverse of the encoder, on every shape the prebake can produce —
// including the 16-bit/32-bit index split, which is where a byte-offset format
// like this one usually breaks.

import { describe, it, expect } from 'vitest';
import { encodeDocsMesh, decodeDocsMesh, DOCS_MESH_MAGIC, type DocsMeshData } from './docsMesh';

function feature(vertexCount: number, indexCount: number, withTransform: boolean): DocsMeshData {
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  for (let i = 0; i < positions.length; i++) {
    positions[i] = Math.sin(i) * 100; // arbitrary but reproducible non-integers
    normals[i] = Math.cos(i);
  }
  const wide = vertexCount > 0xffff;
  const indices = wide ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  for (let i = 0; i < indexCount; i++) indices[i] = (i * 7) % vertexCount;
  const transform = withTransform
    ? Float32Array.from({ length: 16 }, (_, i) => i + 0.5)
    : null;
  return { positions, normals, indices, transform };
}

function expectFeatureEqual(got: DocsMeshData, want: DocsMeshData): void {
  expect(Array.from(got.positions)).toEqual(Array.from(want.positions));
  expect(Array.from(got.normals)).toEqual(Array.from(want.normals));
  expect(Array.from(got.indices)).toEqual(Array.from(want.indices));
  if (want.transform === null) expect(got.transform).toBeNull();
  else expect(Array.from(got.transform!)).toEqual(Array.from(want.transform));
}

describe('docs mesh format', () => {
  it('round-trips a mix of features, transforms and index widths', () => {
    const features = [
      feature(3, 3, false),
      feature(24, 36, true), // a box: transform present, 16-bit indices
      feature(5, 9, false), // odd index count exercises the 4-byte padding
    ];
    const decoded = decodeDocsMesh(bufferOf(encodeDocsMesh(features)));
    expect(decoded).toHaveLength(features.length);
    decoded.forEach((d, i) => expectFeatureEqual(d, features[i]));
  });

  it('keeps indices 16-bit under 65536 vertices and 32-bit above', () => {
    const narrow = bufferOf(encodeDocsMesh([feature(100, 12, false)]));
    const wide = bufferOf(encodeDocsMesh([feature(70_000, 12, false)]));
    // The wide file carries the same 12 indices at 4 bytes each rather than 2,
    // plus 3x the vertices — the point is the decoder reads each back as the
    // width it was written.
    expect(decodeDocsMesh(narrow)[0].indices).toBeInstanceOf(Uint16Array);
    expect(decodeDocsMesh(wide)[0].indices).toBeInstanceOf(Uint32Array);
  });

  it('preserves exact values across the 65535/65536 boundary', () => {
    for (const count of [0xffff, 0x1_0000]) {
      const f = feature(count, 30, true);
      expectFeatureEqual(decodeDocsMesh(bufferOf(encodeDocsMesh([f])))[0], f);
    }
  });

  it('rejects a file with the wrong magic', () => {
    const buffer = new ArrayBuffer(16);
    new Uint32Array(buffer)[0] = 0xdeadbeef;
    expect(() => decodeDocsMesh(buffer)).toThrow(/bad magic/);
    expect(DOCS_MESH_MAGIC).not.toBe(0xdeadbeef);
  });

  it('rejects a truncated file rather than reading past the end', () => {
    const full = bufferOf(encodeDocsMesh([feature(24, 36, true)]));
    expect(() => decodeDocsMesh(full.slice(0, full.byteLength - 8))).toThrow();
  });
});

/** encode returns a Uint8Array view; the decoder wants a standalone buffer. */
function bufferOf(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}
