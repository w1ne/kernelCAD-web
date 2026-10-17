// src/modeling/capture/featureMeshBinary.test.ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  decodeMeshBinary, encodeMeshBinary, fingerprintBuffers,
  MESH_BIN_MAGIC, MESH_BIN_FLAG_PARTIAL,
  type FeatureMeshSerializedInput, type MeshBinaryTrailer,
} from './featureMeshBinary';
import type { FeatureMesh } from './featureMeshing';
import type { FeatureMeshSerialized } from './featureMeshSerialize';

function feature(overrides: Partial<FeatureMeshSerializedInput> = {}): FeatureMeshSerializedInput {
  return {
    featureId: 'shape#1', featureKind: 'box', predecessors: [],
    faces: [{
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2]),
      faceId: 7,
      plane: { normal: [0, 0, 1], origin: [0, 0, 0] },
    }],
    edges: new Float32Array([0, 1]),
    volume: 12.5,
    color: '#ff0000',
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    ...overrides,
  };
}

describe('encode/decode round-trip', () => {
  it('round-trips geometry, metadata and face ranges', () => {
    const bytes = encodeMeshBinary([feature(), feature({ featureId: 'shape#2', featureKind: 'cylinder', displayName: 'Boss' })]);
    expect(new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true)).toBe(MESH_BIN_MAGIC);
    const { features, trailer } = decodeMeshBinary(bytes);
    expect(trailer).toBeUndefined();
    expect(features).toHaveLength(2);
    const a = features[0]!;
    expect(a.featureId).toBe('shape#1');
    expect(Array.from(a.faces[0]!.vertices)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(Array.from(a.faces[0]!.indices)).toEqual([0, 1, 2]);
    expect(a.faces[0]!.faceId).toBe(7);
    expect(a.faces[0]!.plane).toEqual({ normal: [0, 0, 1], origin: [0, 0, 0] });
    expect(Array.from(a.edges as Float32Array)).toEqual([0, 1]);
    expect(a.volume).toBe(12.5);
    expect(a.color).toBe('#ff0000');
    expect(a.transform).toHaveLength(16);
    expect(features[1]!.displayName).toBe('Boss');
  });

  it('decodes zero-copy typed-array views', () => {
    const bytes = encodeMeshBinary([feature()]);
    const { features } = decodeMeshBinary(bytes);
    expect(features[0]!.faces[0]!.vertices.buffer).toBe(bytes.buffer);
  });

  it('round-trips uv, mesh, empty faces, virtual records and empty input', () => {
    const withExtras = feature({
      faces: [{
        vertices: new Float32Array([0, 0, 0]), normals: new Float32Array([0, 0, 1]),
        uv: new Float32Array([0.5, 0.5]), indices: new Uint32Array([0]), faceId: 1,
      }],
      mesh: {
        positions: new Float32Array([0, 0, 0, 1, 1, 1]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1]),
      },
    });
    const empty: FeatureMeshSerializedInput = {
      featureId: 'render#1', featureKind: 'renderEnvironment', predecessors: [], faces: [], virtual: true,
    };
    const { features } = decodeMeshBinary(encodeMeshBinary([withExtras, empty]));
    expect(features[1]!.virtual).toBe(true);
    expect(features[1]!.faces).toHaveLength(0);
    expect(Array.from(features[0]!.faces[0]!.uv as Float32Array)).toEqual([0.5, 0.5]);
    expect(Array.from(features[0]!.mesh!.positions)).toEqual([0, 0, 0, 1, 1, 1]);
    expect(decodeMeshBinary(encodeMeshBinary([])).features).toEqual([]);
  });

  it('carries a partial trailer and per-feature fingerprints', () => {
    const trailer: MeshBinaryTrailer = { unchangedIds: ['shape#9'], removedIds: ['shape#8'] };
    const bytes = encodeMeshBinary([feature()], trailer);
    expect(new DataView(bytes.buffer, bytes.byteOffset).getUint16(6, true) & MESH_BIN_FLAG_PARTIAL).toBe(1);
    const { features, trailer: got } = decodeMeshBinary(bytes);
    expect(got).toEqual(trailer);
    expect(features[0]!.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it('round-trips cylinder faces', () => {
    const cylinder = {
      origin: [0, 0, 0] as [number, number, number],
      axis: [0, 1, 0] as [number, number, number],
      radius: 2.5,
    };
    const withCylinder = feature({
      faces: [{
        vertices: new Float32Array([0, 0, 0]), normals: new Float32Array([0, 0, 1]),
        indices: new Uint32Array([0]), faceId: 3, cylinder,
      }],
    });
    const { features } = decodeMeshBinary(encodeMeshBinary([withCylinder]));
    expect(features[0]!.faces[0]!.cylinder).toEqual(cylinder);
  });

  it('accepts FeatureMesh and FeatureMeshSerialized inputs interchangeably', () => {
    const typed: FeatureMesh = {
      featureId: 'typed#1', featureKind: 'box', predecessors: [],
      faces: [{
        vertices: new Float32Array([1, 2, 3]), normals: new Float32Array([0, 0, 1]),
        indices: new Uint32Array([0]), faceId: 9,
      }],
      edges: new Float32Array([1.5]),
    };
    const json: FeatureMeshSerialized = {
      featureId: 'json#1', featureKind: 'box', predecessors: [],
      faces: [{ vertices: [0, 0, 0], normals: [0, 0, 1], indices: [0], faceId: 4 }],
      mesh: { positions: [0, 0, 0], normals: [0, 0, 1], indices: [0] },
      edges: [0.5],
    };
    const { features } = decodeMeshBinary(encodeMeshBinary([typed, json]));
    expect(Array.from(features[0]!.faces[0]!.vertices)).toEqual([1, 2, 3]);
    expect(features[0]!.faces[0]!.vertices).toBeInstanceOf(Float32Array);
    expect(Array.from(features[1]!.faces[0]!.indices)).toEqual([0]);
    expect(Array.from(features[1]!.mesh!.positions)).toEqual([0, 0, 0]);
    expect(Array.from(features[1]!.edges as Float32Array)).toEqual([0.5]);
  });

  it('rejects a trailer with no records and a partial flag with no trailer', () => {
    expect(() => encodeMeshBinary([], { unchangedIds: [], removedIds: ['shape#8'] })).toThrow(/trailer/);
    const bytes = encodeMeshBinary([feature()]);
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(6, MESH_BIN_FLAG_PARTIAL, true);
    expect(() => decodeMeshBinary(bytes)).toThrow(/trailer/);
  });
});

describe('fingerprintBuffers', () => {
  it('is stable across runs and sensitive to geometry, ids and lengths', () => {
    const buffers = {
      faceIds: [1, 2],
      vertices: new Float32Array([0, 0, 0, 1, 0, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2]),
    };
    const a = fingerprintBuffers(buffers);
    expect(a).toBe(fingerprintBuffers({ ...buffers, vertices: new Float32Array([0, 0, 0, 1, 0, 0]) }));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprintBuffers({ ...buffers, vertices: new Float32Array([0, 0, 0.001, 1, 0, 0]) })).not.toBe(a);
    expect(fingerprintBuffers({ ...buffers, faceIds: [1, 3] })).not.toBe(a);
    expect(fingerprintBuffers({ ...buffers, indices: new Uint32Array([0, 1]) })).not.toBe(a);
  });
});
