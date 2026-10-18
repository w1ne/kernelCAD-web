// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshBinary.ts
//
// bin1: little-endian binary container for feature meshes — raw typed arrays + zero-padded
// JSON metadata replace the number[]-heavy JSON bridge payload, plus a 64-bit per-feature
// fingerprint (two FNV-1a lanes, hex16) for changed-only patches. Browser-safe: type-only
// imports, no node builtins.
//
// Layout: header { magic u32, version u16, flags u16, count u32 } | table count x { metaLen u32,
// metaOffset u32, firstBuffer u32, bufferCount u32 } | meta JSON (padded to 4) | per record
// buffers `{ len u32, bytes, pad to 4 }` in order: vertices f32, normals f32, [uv f32], indices
// u32, [mesh positions f32, mesh normals f32, mesh indices u32], [edges f32]; each region holds
// all faces concatenated and meta face ranges are element offsets into it. A trailer rides in
// the FIRST record's meta as `{ meta, trailer }` with flags bit0 set; a `containerMeta` (the
// bridge payload minus features) rides in the same envelope as a reserved `containerMeta` key.

import type { FeatureMesh } from './featureMeshing';
import type { FeatureMeshSerialized } from './featureMeshSerialize';
import type { FaceGeometry } from '../../shared/worker/workerTypes';

export const MESH_BIN_MAGIC = 0x3142434b; // "KCB1" little-endian
export const MESH_BIN_VERSION = 1;
export const MESH_BIN_FLAG_PARTIAL = 0x1;
export type NumericBuffer = Float32Array | Uint32Array | number[];

export interface FaceGeometryInput {
  vertices: NumericBuffer; normals: NumericBuffer; uv?: NumericBuffer;
  indices: NumericBuffer; faceId: number;
  plane?: FaceGeometry['plane']; cylinder?: FaceGeometry['cylinder'];
}
export interface FeatureMeshSerializedInput
  extends Omit<FeatureMeshSerialized, 'faces' | 'mesh' | 'edges'> {
  faces: FaceGeometryInput[];
  mesh?: { positions: NumericBuffer; normals: NumericBuffer; indices: NumericBuffer };
  edges?: NumericBuffer;
  /** hex16; present on decoded features. */
  fingerprint?: string;
}
export interface MeshBinaryTrailer { unchangedIds: string[]; removedIds: string[] }
export interface FeatureFingerprintInput {
  faceIds: number[]; vertices: NumericBuffer; normals: NumericBuffer;
  uvs?: NumericBuffer; indices: NumericBuffer;
  meshPositions?: NumericBuffer; meshNormals?: NumericBuffer; meshIndices?: NumericBuffer;
  edges?: NumericBuffer;
}

type Plane = NonNullable<FaceGeometry['plane']>;
type Cylinder = NonNullable<FaceGeometry['cylinder']>;
/** One byte region of a record: concatenated typed-array parts of known size. */
interface Chunk { byteLength: number; parts: ArrayBufferView[] }

function chunkOf(parts: ArrayBufferView[]): Chunk {
  return { byteLength: parts.reduce((n, part) => n + part.byteLength, 0), parts };
}
function pad4(byteLength: number): number { return (byteLength + 3) & ~3; }
function hex8(value: number): string { return value.toString(16).padStart(8, '0'); }

// Two independent FNV-1a lanes: a single 32-bit hash is too collision-prone to silently
// paint stale geometry when two fingerprints compare equal.
const FNV_A_BASIS = 0x811c9dc5;
const FNV_A_PRIME = 0x01000193;
const FNV_B_BASIS = 0x9747b28c;
const FNV_B_PRIME = 0x85ebca6b;

function hashSources(faceIds: readonly number[], sources: readonly Chunk[]): string {
  let laneA = FNV_A_BASIS, laneB = FNV_B_BASIS;
  const mix = (byte: number): void => {
    laneA = Math.imul(laneA ^ byte, FNV_A_PRIME) >>> 0;
    laneB = Math.imul(laneB ^ byte, FNV_B_PRIME) >>> 0;
  };
  const mixU32 = (value: number): void => {
    for (let shift = 0; shift < 32; shift += 8) mix((value >>> shift) & 0xff);
  };
  for (const faceId of faceIds) mixU32(faceId);
  for (const source of sources) {
    mixU32(source.byteLength);
    for (const part of source.parts) {
      const bytes = new Uint8Array(part.buffer, part.byteOffset, part.byteLength);
      for (let i = 0; i < bytes.length; i += 1) mix(bytes[i]);
    }
  }
  return hex8(laneA) + hex8(laneB);
}

/** `number[]` is treated as f32 (all `number[]` inputs in practice are f32 or u32 geometry;
 *  typed arrays are hashed as their raw bytes). Pass a Uint32Array for u32 `number[]` indices
 *  to get byte parity with encoder-recorded fingerprints. */
function sourceOf(buffer: NumericBuffer): Chunk {
  const typed = buffer instanceof Float32Array || buffer instanceof Uint32Array
    ? buffer
    : new Float32Array(buffer);
  return { byteLength: typed.byteLength, parts: [new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength)] };
}

export function fingerprintBuffers(input: FeatureFingerprintInput): string {
  const sources: Chunk[] = [];
  const add = (buffer: NumericBuffer | undefined): void => {
    if (buffer !== undefined) sources.push(sourceOf(buffer));
  };
  add(input.vertices); add(input.normals); add(input.uvs); add(input.indices);
  add(input.meshPositions); add(input.meshNormals); add(input.meshIndices); add(input.edges);
  return hashSources(input.faceIds, sources);
}

function asF32(buffer: NumericBuffer): Float32Array {
  return buffer instanceof Float32Array ? buffer : new Float32Array(buffer);
}
function asU32(buffer: NumericBuffer): Uint32Array {
  return buffer instanceof Uint32Array ? buffer : new Uint32Array(buffer);
}

interface NormalizedFace {
  faceId: number; plane?: Plane; cylinder?: Cylinder;
  vertices: Float32Array; normals: Float32Array; uv?: Float32Array; indices: Uint32Array;
}
interface FaceMeta {
  faceId: number; plane?: Plane; cylinder?: Cylinder;
  vertexOffset: number; vertexCount: number; indexOffset: number; indexCount: number;
}
interface NormalizedRecord { metaJson: Uint8Array; metaPaddedLength: number; chunks: Chunk[] }

function normalizeFace(face: FaceGeometryInput | FaceGeometry): NormalizedFace {
  const uv = face.uv !== undefined ? asF32(face.uv) : undefined;
  return {
    faceId: face.faceId, vertices: asF32(face.vertices), normals: asF32(face.normals),
    indices: asU32(face.indices),
    ...(uv !== undefined ? { uv } : {}),
    ...(face.plane !== undefined ? { plane: face.plane } : {}),
    ...(face.cylinder !== undefined ? { cylinder: face.cylinder } : {}),
  };
}

function normalizeRecord(
  input: FeatureMeshSerializedInput | FeatureMesh,
  trailer?: MeshBinaryTrailer,
  containerMeta?: Record<string, unknown>,
): NormalizedRecord {
  const { faces: rawFaces, mesh: rawMesh, edges: rawEdges, ...feature } = input;
  // Re-encoding a decoded feature carries its old fingerprint; the hash below is recomputed
  // from the geometry, so keep the stale copy out of the meta — one authoritative hash.
  delete (feature as { fingerprint?: string }).fingerprint;
  const faces = (rawFaces as Array<FaceGeometryInput | FaceGeometry>).map(normalizeFace);
  const uvFaces = faces.filter(
    (face): face is NormalizedFace & { uv: Float32Array } => face.uv !== undefined,
  );
  if (uvFaces.length > 0 && uvFaces.length !== faces.length) {
    throw new Error(`featureMeshBinary: feature '${feature.featureId}' has uv on only ${uvFaces.length} of ${faces.length} faces — uv present but hasUv false; uv must be on all faces or none`);
  }
  const hasUv = faces.length > 0 && uvFaces.length === faces.length;
  if (hasUv) {
    for (const face of uvFaces) {
      // uv holds exactly one (u,v) pair per xyz vertex; the container derives the uv
      // range back from the xyz range, so both must be whole xyz triples.
      if (face.vertices.length % 3 !== 0 || face.uv.length !== (face.vertices.length / 3) * 2) {
        throw new Error(`featureMeshBinary: feature '${feature.featureId}' face ${face.faceId} uv holds ${face.uv.length} floats but ${face.vertices.length} vertex floats require ${(face.vertices.length / 3) * 2}`);
      }
    }
  }

  const mesh = rawMesh !== undefined
    ? { positions: asF32(rawMesh.positions), normals: asF32(rawMesh.normals), indices: asU32(rawMesh.indices) }
    : undefined;
  const edges = rawEdges !== undefined ? asF32(rawEdges) : undefined;
  const chunks: Chunk[] = [
    chunkOf(faces.map((face) => face.vertices)),
    chunkOf(faces.map((face) => face.normals)),
    ...(hasUv ? [chunkOf(uvFaces.map((face) => face.uv))] : []),
    chunkOf(faces.map((face) => face.indices)),
  ];
  if (mesh !== undefined) chunks.push(chunkOf([mesh.positions]), chunkOf([mesh.normals]), chunkOf([mesh.indices]));
  if (edges !== undefined) chunks.push(chunkOf([edges]));
  const fingerprint = hashSources(faces.map((face) => face.faceId), chunks);

  let vertexOffset = 0;
  let indexOffset = 0;
  const faceMetas = faces.map((face): FaceMeta => {
    const meta: FaceMeta = {
      faceId: face.faceId,
      ...(face.plane !== undefined ? { plane: face.plane } : {}),
      ...(face.cylinder !== undefined ? { cylinder: face.cylinder } : {}),
      vertexOffset, vertexCount: face.vertices.length,
      indexOffset, indexCount: face.indices.length,
    };
    vertexOffset += face.vertices.length;
    indexOffset += face.indices.length;
    return meta;
  });
  const meta = {
    feature, faces: faceMetas,
    hasUv, hasMesh: mesh !== undefined, hasEdges: edges !== undefined,
    fingerprint,
  };
  // A containerMeta (bridge metadata: params, review, records, bounds, …) rides in the first
  // record's envelope. The reserved `__partial` marker mirrors the header's flags bit: whenever
  // a trailer is encoded, both are set — containerMeta is independent of them.
  const json = JSON.stringify({
    meta,
    ...(trailer !== undefined ? { trailer, __partial: true } : {}),
    ...(containerMeta !== undefined ? { containerMeta } : {}),
  });
  const metaJson = new TextEncoder().encode(json);
  return { metaJson, metaPaddedLength: pad4(metaJson.byteLength), chunks };
}

export function encodeMeshBinary(
  features: Array<FeatureMeshSerializedInput | FeatureMesh>,
  trailer?: MeshBinaryTrailer,
  containerMeta?: Record<string, unknown>,
): Uint8Array {
  if (trailer !== undefined && features.length === 0) {
    throw new Error("featureMeshBinary: a trailer needs at least one feature — it rides in the first record's meta");
  }
  if (containerMeta !== undefined && features.length === 0) {
    throw new Error("featureMeshBinary: containerMeta needs at least one feature — it rides in the first record's meta");
  }
  const records = features.map((feature, index) =>
    normalizeRecord(feature, index === 0 ? trailer : undefined, index === 0 ? containerMeta : undefined),
  );
  const count = records.length;
  let byteLength = 12 + count * 16;
  for (const record of records) byteLength += record.metaPaddedLength;
  for (const record of records) {
    for (const chunk of record.chunks) byteLength += 4 + pad4(chunk.byteLength);
  }

  const bytes = new Uint8Array(byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, MESH_BIN_MAGIC, true);
  view.setUint16(4, MESH_BIN_VERSION, true);
  view.setUint16(6, trailer !== undefined ? MESH_BIN_FLAG_PARTIAL : 0, true);
  view.setUint32(8, count, true);

  // `firstBuffer` is the record's first buffer index in the container-wide buffer sequence.
  let offset = 12 + count * 16;
  let firstBuffer = 0;
  records.forEach((record, index) => {
    const entry = 12 + index * 16;
    view.setUint32(entry, record.metaPaddedLength, true);
    view.setUint32(entry + 4, offset, true);
    view.setUint32(entry + 8, firstBuffer, true);
    view.setUint32(entry + 12, record.chunks.length, true);
    bytes.set(record.metaJson, offset);
    offset += record.metaPaddedLength;
    firstBuffer += record.chunks.length;
  });
  for (const record of records) {
    for (const chunk of record.chunks) {
      view.setUint32(offset, chunk.byteLength, true);
      let dataOffset = offset + 4;
      for (const part of chunk.parts) {
        bytes.set(new Uint8Array(part.buffer, part.byteOffset, part.byteLength), dataOffset);
        dataOffset += part.byteLength;
      }
      offset += 4 + pad4(chunk.byteLength);
    }
  }
  return bytes;
}

interface DecodedMeta {
  feature: Omit<FeatureMeshSerializedInput, 'faces' | 'mesh' | 'edges' | 'fingerprint'>;
  faces: FaceMeta[]; hasUv: boolean; hasMesh: boolean; hasEdges: boolean; fingerprint?: string;
}
interface BufferSlice { offset: number; byteLength: number }

function f32View(bytes: Uint8Array, byteOffset: number, elements: number): Float32Array {
  return new Float32Array(bytes.buffer, bytes.byteOffset + byteOffset, elements);
}
function u32View(bytes: Uint8Array, byteOffset: number, elements: number): Uint32Array {
  return new Uint32Array(bytes.buffer, bytes.byteOffset + byteOffset, elements);
}
function assertElementRange(offset: number, count: number, stride: number, byteLength: number, label: string): void {
  if (!(offset >= 0) || !(count >= 0) || (offset + count) * stride > byteLength) {
    throw new Error(`featureMeshBinary: ${label} range ${offset}+${count} overflows its ${byteLength / stride}-element buffer`);
  }
}

function rebuildFeature(bytes: Uint8Array, meta: DecodedMeta, slices: BufferSlice[], index: number): FeatureMeshSerializedInput {
  if (!Array.isArray(meta.faces)) {
    throw new Error(`featureMeshBinary: record ${index} metadata is missing its faces array`);
  }
  const hasUv = meta.hasUv === true, hasMesh = meta.hasMesh === true, hasEdges = meta.hasEdges === true;
  const indexSlice = 2 + (hasUv ? 1 : 0);
  const expected = indexSlice + 1 + (hasMesh ? 3 : 0) + (hasEdges ? 1 : 0);
  if (slices.length !== expected) {
    throw new Error(`featureMeshBinary: record ${index} has ${slices.length} buffers but its metadata requires ${expected}`);
  }

  const faces = meta.faces.map((face, faceIndex): FaceGeometryInput => {
    assertElementRange(face.vertexOffset, face.vertexCount, 4, slices[0].byteLength, `record ${index} face ${faceIndex} vertices`);
    assertElementRange(face.vertexOffset, face.vertexCount, 4, slices[1].byteLength, `record ${index} face ${faceIndex} normals`);
    assertElementRange(face.indexOffset, face.indexCount, 4, slices[indexSlice].byteLength, `record ${index} face ${faceIndex} indices`);
    let uv: Float32Array | undefined;
    if (hasUv) {
      if (face.vertexOffset % 3 !== 0 || face.vertexCount % 3 !== 0) {
        throw new Error(`featureMeshBinary: record ${index} face ${faceIndex} vertex range ${face.vertexOffset}+${face.vertexCount} is not a whole number of xyz triples, so it has no uv mapping`);
      }
      const uvOffset = (face.vertexOffset / 3) * 2;
      const uvCount = (face.vertexCount / 3) * 2;
      assertElementRange(uvOffset, uvCount, 4, slices[2].byteLength, `record ${index} face ${faceIndex} uv`);
      uv = f32View(bytes, slices[2].offset + uvOffset * 4, uvCount);
    }
    return {
      vertices: f32View(bytes, slices[0].offset + face.vertexOffset * 4, face.vertexCount),
      normals: f32View(bytes, slices[1].offset + face.vertexOffset * 4, face.vertexCount),
      indices: u32View(bytes, slices[indexSlice].offset + face.indexOffset * 4, face.indexCount),
      faceId: face.faceId,
      ...(face.plane !== undefined ? { plane: face.plane } : {}),
      ...(face.cylinder !== undefined ? { cylinder: face.cylinder } : {}),
      ...(uv !== undefined ? { uv } : {}),
    };
  });

  const meshSlice = indexSlice + 1;
  const edgesSlice = meshSlice + (hasMesh ? 3 : 0);
  const mesh = hasMesh ? {
    positions: f32View(bytes, slices[meshSlice].offset, slices[meshSlice].byteLength / 4),
    normals: f32View(bytes, slices[meshSlice + 1].offset, slices[meshSlice + 1].byteLength / 4),
    indices: u32View(bytes, slices[meshSlice + 2].offset, slices[meshSlice + 2].byteLength / 4),
  } : undefined;
  const edges = hasEdges ? f32View(bytes, slices[edgesSlice].offset, slices[edgesSlice].byteLength / 4) : undefined;
  return {
    ...meta.feature, faces,
    ...(mesh !== undefined ? { mesh } : {}),
    ...(edges !== undefined ? { edges } : {}),
    ...(meta.fingerprint !== undefined ? { fingerprint: meta.fingerprint } : {}),
  };
}

/** Decodes a bin1 container. `bytes` must start at a 4-byte-aligned byteOffset
 *  (`byteOffset % 4 === 0`): decoded geometry comes back as zero-copy typed-array views over
 *  `bytes.buffer`, which cannot start at a misaligned offset. Copy (`.slice()`) a misaligned
 *  region before decoding it. */
export function decodeMeshBinary(bytes: Uint8Array): {
  features: FeatureMeshSerializedInput[];
  trailer?: MeshBinaryTrailer;
  containerMeta?: Record<string, unknown>;
} {
  if (bytes.byteOffset % 4 !== 0) {
    throw new Error(`featureMeshBinary: byteOffset must be 4-byte aligned (got ${bytes.byteOffset})`);
  }
  if (bytes.byteLength < 12) throw new Error('featureMeshBinary: truncated container header');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== MESH_BIN_MAGIC) {
    throw new Error('featureMeshBinary: bad magic (expected "KCB1")');
  }
  const version = view.getUint16(4, true);
  if (version !== MESH_BIN_VERSION) {
    throw new Error(`featureMeshBinary: unsupported container version ${version}`);
  }
  const flags = view.getUint16(6, true);
  const count = view.getUint32(8, true);
  const tableEnd = 12 + count * 16;
  if (tableEnd > bytes.byteLength) throw new Error('featureMeshBinary: truncated record table');
  if (count === 0 && (flags & MESH_BIN_FLAG_PARTIAL) !== 0) {
    throw new Error('featureMeshBinary: partial flag set but the container has no records to carry the trailer');
  }

  const entries: Array<{ metaOffset: number; metaLength: number; bufferCount: number }> = [];
  let bufferStart = tableEnd;
  let bufferTotal = 0;
  for (let i = 0; i < count; i += 1) {
    const entry = 12 + i * 16;
    const metaLength = view.getUint32(entry, true);
    const metaOffset = view.getUint32(entry + 4, true);
    const firstBuffer = view.getUint32(entry + 8, true);
    const bufferCount = view.getUint32(entry + 12, true);
    if (metaOffset < tableEnd || metaOffset + metaLength > bytes.byteLength) {
      throw new Error(`featureMeshBinary: record ${i} metadata overflows the container`);
    }
    if (firstBuffer !== bufferTotal) {
      throw new Error(`featureMeshBinary: record ${i} firstBuffer ${firstBuffer} breaks the sequential buffer layout (${bufferTotal})`);
    }
    bufferTotal += bufferCount;
    bufferStart = Math.max(bufferStart, metaOffset + metaLength);
    entries.push({ metaOffset, metaLength, bufferCount });
  }

  const decoder = new TextDecoder();
  const features: FeatureMeshSerializedInput[] = [];
  let trailer: MeshBinaryTrailer | undefined;
  let containerMeta: Record<string, unknown> | undefined;
  let cursor = bufferStart;
  for (let i = 0; i < count; i += 1) {
    const entry = entries[i];
    const raw = decoder.decode(bytes.subarray(entry.metaOffset, entry.metaOffset + entry.metaLength));
    const nul = raw.indexOf('\u0000');
    let parsed: unknown;
    try {
      parsed = JSON.parse(nul === -1 ? raw : raw.slice(0, nul));
    } catch {
      throw new Error(`featureMeshBinary: record ${i} metadata is not valid JSON`);
    }
    // flags bit0 gates the trailer: a stray `trailer` key without the flag stays ignored.
    const envelope = parsed as { meta?: DecodedMeta; trailer?: MeshBinaryTrailer; containerMeta?: unknown };
    if (i === 0) {
      if ((flags & MESH_BIN_FLAG_PARTIAL) !== 0) {
        if (envelope.trailer === undefined) {
          throw new Error('featureMeshBinary: partial flag is set but record 0 metadata carries no trailer');
        }
        trailer = envelope.trailer;
      }
      if (envelope.containerMeta !== undefined) {
        const candidate = envelope.containerMeta;
        if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
          const got = candidate === null ? 'null' : Array.isArray(candidate) ? 'array' : typeof candidate;
          throw new Error(`featureMeshBinary: record 0 containerMeta is not an object (got ${got})`);
        }
        containerMeta = candidate as Record<string, unknown>;
      }
    }
    const meta = envelope.meta !== undefined ? envelope.meta : (parsed as DecodedMeta);

    const slices: BufferSlice[] = [];
    for (let b = 0; b < entry.bufferCount; b += 1) {
      if (cursor + 4 > bytes.byteLength) {
        throw new Error(`featureMeshBinary: record ${i} buffer ${b} is truncated (missing length prefix)`);
      }
      const byteLength = view.getUint32(cursor, true);
      const dataOffset = cursor + 4;
      if (dataOffset + byteLength > bytes.byteLength) {
        throw new Error(`featureMeshBinary: record ${i} buffer ${b} is truncated (declares ${byteLength} bytes at offset ${dataOffset})`);
      }
      slices.push({ offset: dataOffset, byteLength });
      cursor = dataOffset + pad4(byteLength);
      if (cursor > bytes.byteLength) {
        throw new Error(`featureMeshBinary: record ${i} buffer ${b} padding overflows the container`);
      }
    }
    features.push(rebuildFeature(bytes, meta, slices, i));
  }
  return {
    features,
    ...(trailer !== undefined ? { trailer } : {}),
    ...(containerMeta !== undefined ? { containerMeta } : {}),
  };
}
