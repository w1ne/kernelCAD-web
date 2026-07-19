// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The wire format for a prebaked docs model: the triangles, and nothing else.
//
// This replaced GLB, which cost 26.5 KB gzipped in GLTFLoader — 17% of the
// island bundle — to parse a file this pipeline both writes and reads. Nothing
// in glTF was being used. Materials are resolved from manifest tokens by
// `docsMaterial`, not read from the file (that is deliberate: it is what stops a
// prebaked body and a re-run body coming out different shades). The scene graph
// is one flat list. Cameras, animation, skins, textures, PBR: all absent, all
// still parsed for.
//
// So the format is the arrays the worker already produces, written down in
// order. The decoder below is the whole reader.
//
// Encoder and decoder live in the same file on purpose. They are one contract,
// and the previous arrangement — write with GLTFExporter here, read with
// GLTFLoader there — is exactly the shape that lets two halves drift apart.
// Rollup drops `encodeDocsMesh` from the browser bundle; it is only reachable
// from the build script.
//
// LAYOUT — little-endian, every field a 4-byte unit, so every typed-array view
// below is naturally aligned and can be taken over the buffer without copying:
//
//   u32   magic (KCM1)
//   u32   featureCount
//   u32[3] per feature: vertexCount, indexCount, flags
//   then, per feature, in order:
//     f32[16]        transform, only when FLAG_TRANSFORM
//     f32[3*vcount]  positions
//     f32[3*vcount]  normals
//     u16|u32[icount] indices, 16-bit unless FLAG_WIDE_INDICES, padded to 4
//
// Indices narrow to 16 bits below 65536 vertices, which is every example here
// and most of the reason this format is not larger than the GLB it replaced —
// glTF does the same thing, and dropping it cost 36 KB across the corpus before
// anyone noticed.

/** 'KCM1' read little-endian. A wrong file fails here rather than mid-parse. */
export const DOCS_MESH_MAGIC = 0x314d434b;

/** One drawn feature: welded triangles, plus where the assembly solver put it. */
export interface DocsMeshData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  /** Column-major 4x4, three's own layout. Null when the feature sits at origin. */
  readonly transform: Float32Array | null;
  readonly indices: Uint16Array | Uint32Array;
}

const HEADER_U32 = 2;
const DESCRIPTOR_U32 = 3;
const FLAG_TRANSFORM = 1;
const FLAG_WIDE_INDICES = 2;

/** Bytes an index block occupies, rounded up so the next feature stays 4-aligned. */
function indexBytes(count: number, wide: boolean): number {
  return wide ? count * 4 : Math.ceil((count * 2) / 4) * 4;
}

export function encodeDocsMesh(features: readonly DocsMeshData[]): Uint8Array {
  const wide = features.map((f) => f.positions.length / 3 > 0xffff);

  let bytes = (HEADER_U32 + features.length * DESCRIPTOR_U32) * 4;
  features.forEach((f, i) => {
    bytes += (f.transform ? 64 : 0) + f.positions.byteLength + f.normals.byteLength;
    bytes += indexBytes(f.indices.length, wide[i]);
  });

  const buffer = new ArrayBuffer(bytes);
  const header = new Uint32Array(buffer, 0, HEADER_U32 + features.length * DESCRIPTOR_U32);
  header[0] = DOCS_MESH_MAGIC;
  header[1] = features.length;

  let offset = (HEADER_U32 + features.length * DESCRIPTOR_U32) * 4;
  features.forEach((f, i) => {
    const d = HEADER_U32 + i * DESCRIPTOR_U32;
    header[d] = f.positions.length / 3;
    header[d + 1] = f.indices.length;
    header[d + 2] = (f.transform ? FLAG_TRANSFORM : 0) | (wide[i] ? FLAG_WIDE_INDICES : 0);

    if (f.transform) {
      new Float32Array(buffer, offset, 16).set(f.transform);
      offset += 64;
    }
    new Float32Array(buffer, offset, f.positions.length).set(f.positions);
    offset += f.positions.byteLength;
    new Float32Array(buffer, offset, f.normals.length).set(f.normals);
    offset += f.normals.byteLength;
    if (wide[i]) new Uint32Array(buffer, offset, f.indices.length).set(f.indices);
    else new Uint16Array(buffer, offset, f.indices.length).set(f.indices);
    offset += indexBytes(f.indices.length, wide[i]);
  });

  return new Uint8Array(buffer);
}

/**
 * Read a prebaked model. The returned arrays are views onto `buffer`, not
 * copies — they go straight into `BufferAttribute`, which is what three would
 * have uploaded anyway.
 */
export function decodeDocsMesh(buffer: ArrayBuffer): DocsMeshData[] {
  if (buffer.byteLength < HEADER_U32 * 4) throw new Error('docs mesh: file is truncated');
  const header = new Uint32Array(buffer, 0, HEADER_U32);
  if (header[0] !== DOCS_MESH_MAGIC) {
    throw new Error(`docs mesh: bad magic 0x${header[0].toString(16)}`);
  }

  const count = header[1];
  const descriptors = new Uint32Array(buffer, HEADER_U32 * 4, count * DESCRIPTOR_U32);
  const features: DocsMeshData[] = [];
  let offset = (HEADER_U32 + count * DESCRIPTOR_U32) * 4;

  for (let i = 0; i < count; i++) {
    const vertexCount = descriptors[i * DESCRIPTOR_U32];
    const indexCount = descriptors[i * DESCRIPTOR_U32 + 1];
    const flags = descriptors[i * DESCRIPTOR_U32 + 2];
    const wide = (flags & FLAG_WIDE_INDICES) !== 0;

    let transform: Float32Array | null = null;
    if ((flags & FLAG_TRANSFORM) !== 0) {
      transform = new Float32Array(buffer, offset, 16);
      offset += 64;
    }
    const positions = new Float32Array(buffer, offset, vertexCount * 3);
    offset += vertexCount * 12;
    const normals = new Float32Array(buffer, offset, vertexCount * 3);
    offset += vertexCount * 12;
    const indices = wide
      ? new Uint32Array(buffer, offset, indexCount)
      : new Uint16Array(buffer, offset, indexCount);
    offset += indexBytes(indexCount, wide);

    features.push({ positions, normals, transform, indices });
  }

  if (offset !== buffer.byteLength) {
    throw new Error(`docs mesh: read ${offset} of ${buffer.byteLength} bytes`);
  }
  return features;
}
