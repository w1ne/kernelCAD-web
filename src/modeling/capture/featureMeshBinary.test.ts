// src/modeling/capture/featureMeshBinary.test.ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  decodeMeshBinary, encodeMeshBinary, fingerprintBuffers,
  MESH_BIN_MAGIC, MESH_BIN_FLAG_PARTIAL, MESH_BIN_VERSION,
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

  it('round-trips the full feature metadata surface (kitchen sink)', () => {
    const faceMaterial = { baseColor: '#204060', metalness: 0.8, roughness: 0.2 };
    const sink = feature({
      op: 'subtract',
      predecessors: ['sketch#1', 'shape#0'],
      displayName: 'Body',
      filterNames: ['body', 'Box 1'],
      sourceMetadataName: 'Box',
      assemblyFeatureId: 'asm#2',
      assemblyPartName: 'Base Plate',
      faceOwners: ['shape#0'],
      edgeRanges: [0, 2],
      edgeOwners: ['shape#0'],
      material: {
        baseColor: '#3366aa', metalness: 0.35, roughness: 0.4, clearcoat: 0.1,
        ior: 1.45, transmission: 0.2, opacity: 0.95, thickness: 1.2,
        attenuationColor: '#88aaff', anisotropy: 0.3, anisotropyRotation: 45,
      },
      materialByFaceId: { 7: faceMaterial },
    });
    const env: FeatureMeshSerializedInput = {
      featureId: 'env#1', featureKind: 'renderEnvironment', predecessors: [], faces: [], virtual: true,
      renderEnvironment: { preset: 'warehouse', intensity: 1.4, rotation: 45, virtual: true },
    };
    const ref: FeatureMeshSerializedInput = {
      featureId: 'ref#1', featureKind: 'referenceImage', predecessors: [], faces: [], virtual: true,
      referenceImage: {
        path: '/tmp/ref.png', plane: 'xy', anchor: 'origin', scale: 'fit-bbox',
        opacity: 0.5, flipU: false, flipV: true, pixelWidth: 640, pixelHeight: 480, virtual: true,
      },
    };
    const { features } = decodeMeshBinary(encodeMeshBinary([sink, env, ref]));
    const [sinkOut, envOut, refOut] = features.map(({ fingerprint, ...rest }) => {
      expect(fingerprint).toMatch(/^[0-9a-f]{16}$/);
      return rest;
    });
    expect(sinkOut).toEqual(sink);
    expect(envOut).toEqual(env);
    expect(refOut).toEqual(ref);
  });

  it('drops a stale caller fingerprint and embeds exactly the recomputed one', () => {
    const bytes = encodeMeshBinary([feature({ fingerprint: 'deadbeefdeadbeef' })]);
    const text = new TextDecoder().decode(bytes);
    expect(text).not.toContain('deadbeefdeadbeef');
    expect(text.split('"fingerprint"')).toHaveLength(2);
    const decoded = decodeMeshBinary(bytes).features[0]!;
    expect(decoded.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(decoded.fingerprint).not.toBe('deadbeefdeadbeef');
    // A decoded feature carries its fingerprint, so re-encoding one is the common stale-copy path.
    const reencoded = decodeMeshBinary(encodeMeshBinary([decoded])).features[0]!;
    expect(reencoded.fingerprint).toBe(decoded.fingerprint);
  });
});

describe('decode corruption guard rails', () => {
  const valid = (): Uint8Array => encodeMeshBinary([
    feature(),
    feature({ featureId: 'shape#2', featureKind: 'cylinder', displayName: 'Boss' }),
  ]);

  function viewOf(bytes: Uint8Array): DataView {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  function metaOffsetOf(bytes: Uint8Array, index = 0): number {
    return viewOf(bytes).getUint32(12 + index * 16 + 4, true);
  }
  function bufferRegionStart(bytes: Uint8Array): number {
    const view = viewOf(bytes);
    const count = view.getUint32(8, true);
    let start = 12 + count * 16;
    for (let i = 0; i < count; i += 1) {
      start = Math.max(start, view.getUint32(12 + i * 16 + 4, true) + view.getUint32(12 + i * 16, true));
    }
    return start;
  }
  function f32Bytes(values: number[]): Uint8Array {
    return new Uint8Array(new Float32Array(values).buffer);
  }
  function u32Bytes(values: number[]): Uint8Array {
    return new Uint8Array(new Uint32Array(values).buffer);
  }
  /** Deterministic hand-built single-record container: meta is padded to 4 and buffers follow. */
  function craftContainer(meta: unknown, buffers: Uint8Array[]): Uint8Array {
    const metaJson = new TextEncoder().encode(JSON.stringify(meta));
    const metaPadded = (metaJson.byteLength + 3) & ~3;
    const tableEnd = 12 + 16;
    let byteLength = tableEnd + metaPadded;
    for (const buffer of buffers) byteLength += 4 + ((buffer.byteLength + 3) & ~3);
    const bytes = new Uint8Array(byteLength);
    const view = viewOf(bytes);
    view.setUint32(0, MESH_BIN_MAGIC, true);
    view.setUint16(4, MESH_BIN_VERSION, true);
    view.setUint16(6, 0, true);
    view.setUint32(8, 1, true);
    view.setUint32(12, metaPadded, true);
    view.setUint32(16, tableEnd, true);
    view.setUint32(20, 0, true);
    view.setUint32(24, buffers.length, true);
    bytes.set(metaJson, tableEnd);
    let offset = tableEnd + metaPadded;
    for (const buffer of buffers) {
      view.setUint32(offset, buffer.byteLength, true);
      bytes.set(buffer, offset + 4);
      offset += 4 + ((buffer.byteLength + 3) & ~3);
    }
    return bytes;
  }

  const cases: Array<{ name: string; mutate: (bytes: Uint8Array) => Uint8Array; message: RegExp }> = [
    {
      name: 'a truncated header',
      mutate: (bytes) => bytes.slice(0, 8),
      message: /truncated container header/,
    },
    {
      name: 'a truncated record table',
      mutate: (bytes) => bytes.slice(0, 40),
      message: /truncated record table/,
    },
    {
      name: 'a truncated meta region',
      mutate: (bytes) => bytes.slice(0, metaOffsetOf(bytes) + 8),
      message: /record 0 metadata overflows the container/,
    },
    {
      name: 'a truncated buffer length prefix',
      mutate: (bytes) => bytes.slice(0, bufferRegionStart(bytes) + 2),
      message: /record 0 buffer 0 is truncated \(missing length prefix\)/,
    },
    {
      name: 'a truncated buffer body',
      mutate: (bytes) => bytes.slice(0, bufferRegionStart(bytes) + 6),
      message: /record 0 buffer 0 is truncated \(declares 36 bytes/,
    },
    {
      name: 'a bad magic word',
      mutate: (bytes) => {
        const copy = bytes.slice();
        copy[0] ^= 0xff;
        return copy;
      },
      message: /bad magic \(expected "KCB1"\)/,
    },
    {
      name: 'an unsupported version',
      mutate: (bytes) => {
        const copy = bytes.slice();
        viewOf(copy).setUint16(4, MESH_BIN_VERSION + 1, true);
        return copy;
      },
      message: /unsupported container version 2/,
    },
    {
      name: 'a count inflated by one into the meta region',
      mutate: (bytes) => {
        const copy = bytes.slice();
        const view = viewOf(copy);
        view.setUint32(8, view.getUint32(8, true) + 1, true);
        return copy;
      },
      message: /record 0 metadata overflows the container/,
    },
    {
      name: 'a desynchronized firstBuffer',
      mutate: (bytes) => {
        const copy = bytes.slice();
        const view = viewOf(copy);
        view.setUint32(12 + 16 + 8, view.getUint32(12 + 16 + 8, true) ^ 1, true);
        return copy;
      },
      message: /record 1 firstBuffer .* breaks the sequential buffer layout/,
    },
    {
      name: 'invalid meta JSON',
      mutate: (bytes) => {
        const copy = bytes.slice();
        copy[metaOffsetOf(copy)] = 0xff;
        return copy;
      },
      message: /record 0 metadata is not valid JSON/,
    },
    {
      name: 'a misaligned byteOffset',
      mutate: (bytes) => bytes.subarray(2),
      message: /byteOffset must be 4-byte aligned/,
    },
    {
      name: 'a uv range overflowing its short buffer',
      mutate: () => craftContainer(
        {
          feature: { featureId: 'uv-mismatch#1', featureKind: 'box', predecessors: [] },
          faces: [{ faceId: 1, vertexOffset: 0, vertexCount: 6, indexOffset: 0, indexCount: 3 }],
          hasUv: true, hasMesh: false, hasEdges: false,
        },
        [
          f32Bytes([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1]),
          f32Bytes([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
          f32Bytes([0.25]),
          u32Bytes([0, 1, 2]),
        ],
      ),
      message: /record 0 face 0 uv range 0\+4 overflows its 1-element buffer/,
    },
    {
      name: 'a partial flag with zero records',
      mutate: () => {
        const bytes = new Uint8Array(12);
        const view = viewOf(bytes);
        view.setUint32(0, MESH_BIN_MAGIC, true);
        view.setUint16(4, MESH_BIN_VERSION, true);
        view.setUint16(6, MESH_BIN_FLAG_PARTIAL, true);
        view.setUint32(8, 0, true);
        return bytes;
      },
      message: /partial flag set but the container has no records/,
    },
  ];

  for (const corruptionCase of cases) {
    it(`rejects ${corruptionCase.name}`, () => {
      expect(() => decodeMeshBinary(corruptionCase.mutate(valid()))).toThrow(corruptionCase.message);
    });
  }

  it('rejects mixed per-face uv at encode time, keeping that record unreachable', () => {
    expect(() => encodeMeshBinary([feature({
      faces: [
        {
          vertices: new Float32Array([0, 0, 0]), normals: new Float32Array([0, 0, 1]),
          uv: new Float32Array([0, 0]), indices: new Uint32Array([0]), faceId: 1,
        },
        {
          vertices: new Float32Array([0, 0, 0]), normals: new Float32Array([0, 0, 1]),
          indices: new Uint32Array([0]), faceId: 2,
        },
      ],
    })])).toThrow(/uv present but hasUv false; uv must be on all faces or none/);
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

  it('treats plain number[] as f32: typed arrays are required for byte parity', () => {
    const shared = {
      faceIds: [7],
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    };
    // 0/1/2 are exact in both formats, so the split is purely f32-vs-u32 byte encoding.
    expect(fingerprintBuffers({ ...shared, indices: [0, 1, 2] }))
      .not.toBe(fingerprintBuffers({ ...shared, indices: new Uint32Array([0, 1, 2]) }));
  });

  it('reproduces the encoder-embedded fingerprint from decoded typed arrays', () => {
    const decoded = decodeMeshBinary(encodeMeshBinary([feature()])).features[0]!;
    const face = decoded.faces[0]!;
    const recomputed = fingerprintBuffers({
      faceIds: [face.faceId],
      vertices: face.vertices,
      normals: face.normals,
      indices: face.indices,
      edges: decoded.edges!,
    });
    expect(recomputed).toBe(decoded.fingerprint);
    expect(fingerprintBuffers({
      faceIds: [face.faceId],
      vertices: face.vertices,
      normals: face.normals,
      indices: new Uint32Array([0, 1]),
      edges: decoded.edges!,
    })).not.toBe(decoded.fingerprint);
  });
});
