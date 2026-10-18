// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshSerialize.binary.test.ts
import { describe, expect, it } from 'vitest';
import { rehydrateFromBridge } from './featureMeshSerialize';
import { decodeMeshBinary, encodeMeshBinary, type FeatureMeshSerializedInput } from './featureMeshBinary';

describe('rehydrateFromBridge accepts bin1-decoded features', () => {
  it('produces the same FeatureMesh as the JSON path', () => {
    const input: FeatureMeshSerializedInput = {
      featureId: 'shape#1', featureKind: 'box', predecessors: [],
      faces: [{
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]), faceId: 3,
      }],
      edges: new Float32Array([0, 1]),
    };
    const { features } = decodeMeshBinary(encodeMeshBinary([input]));
    const mesh = rehydrateFromBridge(features[0]!);
    expect(mesh.faces[0]!.vertices).toBeInstanceOf(Float32Array);
    expect(Array.from(mesh.faces[0]!.vertices)).toEqual(Array.from(input.faces[0]!.vertices));
    expect(Array.from(mesh.faces[0]!.indices)).toEqual([0, 1, 2]);
    expect(Array.from(mesh.edges as Float32Array)).toEqual([0, 1]);
  });

  it('still accepts the JSON number[] shape unchanged', () => {
    const mesh = rehydrateFromBridge({
      featureId: 'shape#2', featureKind: 'box', predecessors: [],
      faces: [{ vertices: [0, 0, 0], normals: [0, 0, 1], indices: [0], faceId: 1 }],
    });
    expect(Array.from(mesh.faces[0]!.vertices)).toEqual([0, 0, 0]);
  });
});
