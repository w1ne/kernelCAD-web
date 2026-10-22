// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { packMeshPayload } from './meshPayloadTransfer';

const VERTICES = [0, 0, 0, 1, 0, 0, 0, 1, 0];
const NORMALS = [0, 0, 1, 0, 0, 1, 0, 0, 1];
const UV = [0, 0, 1, 0, 1];
const INDICES = [0, 1, 2];
const TRANSFORM = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function samplePayload() {
  return {
    features: [
      {
        featureId: 'box',
        featureKind: 'box',
        transform: [...TRANSFORM],
        faceOwners: ['box'],
        edgeRanges: [0, 3],
        edgeOwners: ['box'],
        faces: [
          {
            vertices: [...VERTICES],
            normals: [...NORMALS],
            uv: [...UV],
            indices: [...INDICES],
            faceId: 1,
          },
        ],
        mesh: {
          positions: [...VERTICES],
          normals: [...NORMALS],
          indices: [...INDICES],
        },
        edges: [0, 0, 0, 1, 1, 1],
      },
    ],
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
  };
}

/** The packed feature of a result, for the assertions below. */
function featureOf(payload: unknown): any {
  return (payload as { features: any[] }).features[0];
}

describe('packMeshPayload', () => {
  it('converts every numeric mesh array to the typed array the renderer expects', () => {
    const { payload } = packMeshPayload(samplePayload());
    const feature = featureOf(payload);
    expect(feature.faces[0].vertices).toBeInstanceOf(Float32Array);
    expect(feature.faces[0].normals).toBeInstanceOf(Float32Array);
    expect(feature.faces[0].uv).toBeInstanceOf(Float32Array);
    expect(feature.faces[0].indices).toBeInstanceOf(Uint32Array);
    expect(feature.mesh.positions).toBeInstanceOf(Float32Array);
    expect(feature.mesh.normals).toBeInstanceOf(Float32Array);
    expect(feature.mesh.indices).toBeInstanceOf(Uint32Array);
    expect(feature.edges).toBeInstanceOf(Float32Array);
  });

  it('keeps the converted values identical to the bridge rehydration', () => {
    const { payload } = packMeshPayload(samplePayload());
    const feature = featureOf(payload);
    const face = feature.faces[0];
    expect(Array.from(face.vertices)).toEqual(Array.from(new Float32Array(VERTICES)));
    expect(Array.from(face.normals)).toEqual(Array.from(new Float32Array(NORMALS)));
    expect(Array.from(face.uv)).toEqual(Array.from(new Float32Array(UV)));
    expect(Array.from(face.indices)).toEqual(Array.from(new Uint32Array(INDICES)));
    expect(Array.from(feature.mesh.positions)).toEqual(Array.from(new Float32Array(VERTICES)));
    expect(Array.from(feature.mesh.normals)).toEqual(Array.from(new Float32Array(NORMALS)));
    expect(Array.from(feature.mesh.indices)).toEqual(Array.from(new Uint32Array(INDICES)));
    expect(Array.from(feature.edges)).toEqual(Array.from(new Float32Array([0, 0, 0, 1, 1, 1])));
  });

  it('leaves the plain fields exactly as they were', () => {
    const { payload } = packMeshPayload(samplePayload());
    const feature = featureOf(payload);
    expect(feature.featureId).toBe('box');
    expect(feature.featureKind).toBe('box');
    expect(feature.transform).toEqual(TRANSFORM);
    expect(Array.isArray(feature.transform)).toBe(true);
    expect(feature.faceOwners).toEqual(['box']);
    expect(feature.edgeRanges).toEqual([0, 3]);
    expect(feature.edgeOwners).toEqual(['box']);
    expect(feature.faces[0].faceId).toBe(1);
  });

  it('packs in place and hands the same payload back', () => {
    const payload = samplePayload();
    const result = packMeshPayload(payload);
    expect(result.payload).toBe(payload);
    expect(featureOf(payload).faces[0].vertices).toBeInstanceOf(Float32Array);
  });

  it('keeps an already typed array by identity instead of copying it', () => {
    const vertices = new Float32Array(VERTICES);
    const indices = new Uint32Array(INDICES);
    const payload = { features: [{ featureId: 'a', faces: [{ vertices, indices }] }] };
    const result = packMeshPayload(payload);
    const face = featureOf(result.payload).faces[0];
    expect(face.vertices).toBe(vertices);
    expect(face.indices).toBe(indices);
    expect(result.transfer).toContain(vertices.buffer);
    expect(result.transfer).toContain(indices.buffer);
  });

  it('lists every buffer exactly once', () => {
    const result = packMeshPayload(samplePayload());
    const feature = featureOf(result.payload);
    const buffers = [
      feature.faces[0].vertices.buffer,
      feature.faces[0].normals.buffer,
      feature.faces[0].uv.buffer,
      feature.faces[0].indices.buffer,
      feature.mesh.positions.buffer,
      feature.mesh.normals.buffer,
      feature.mesh.indices.buffer,
      feature.edges.buffer,
    ];
    expect(result.transfer).toHaveLength(buffers.length);
    expect(new Set(result.transfer).size).toBe(result.transfer.length);
    buffers.forEach((buffer) => expect(result.transfer).toContain(buffer));
  });

  it('skips features that are not objects and leaves missing fields missing', () => {
    const payload = { features: [null, 'nope', 42, { featureId: 'a' }] };
    const result = packMeshPayload(payload);
    expect(result.payload).toBe(payload);
    expect(result.transfer).toEqual([]);
    const feature = (result.payload as { features: any[] }).features[3];
    expect(feature.featureId).toBe('a');
    expect(feature.faces).toBeUndefined();
    expect(feature.mesh).toBeUndefined();
    expect(feature.edges).toBeUndefined();
  });

  it('passes a non-payload through untouched with an empty transfer list', () => {
    const notAPayload = { hello: 'world' };
    const result = packMeshPayload(notAPayload);
    expect(result.payload).toBe(notAPayload);
    expect(result.transfer).toEqual([]);
    expect(packMeshPayload(null).payload).toBeNull();
    expect(packMeshPayload(null).transfer).toEqual([]);
    expect(packMeshPayload('nope').payload).toBe('nope');
    expect(packMeshPayload('nope').transfer).toEqual([]);
    expect(packMeshPayload({ features: 'nope' }).transfer).toEqual([]);
  });
});
