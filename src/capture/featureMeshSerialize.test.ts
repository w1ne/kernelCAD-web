// src/capture/featureMeshSerialize.test.ts
import { describe, it, expect } from 'vitest';
import { serializeForBridge, rehydrateFromBridge } from './featureMeshSerialize';
import type { FeatureMesh } from './featureMeshing';

describe('featureMeshSerialize', () => {
  it('round-trips a FeatureMesh through JSON', () => {
    const original: FeatureMesh = {
      featureId: 'box_1',
      featureKind: 'box',
      predecessors: [],
      faces: [{
        vertices: new Float32Array([1, 2, 3, 4, 5, 6]),
        indices: new Uint32Array([0, 1, 2]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1]),
        faceId: 0,
      }],
      volume: 1000,
      edges: new Float32Array([1, 0, 0, 0, 1, 0]),
    };
    const serialized = serializeForBridge(original);
    const json = JSON.parse(JSON.stringify(serialized));
    const restored = rehydrateFromBridge(json);
    expect(restored.featureId).toBe('box_1');
    expect(restored.faces[0].vertices).toBeInstanceOf(Float32Array);
    expect(Array.from(restored.faces[0].vertices)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(restored.faces[0].indices).toBeInstanceOf(Uint32Array);
    expect(Array.from(restored.faces[0].indices)).toEqual([0, 1, 2]);
    expect(restored.edges).toBeInstanceOf(Float32Array);
  });

  it('round-trips optional fields as undefined when absent', () => {
    const original: FeatureMesh = {
      featureId: 'cyl_1',
      featureKind: 'cylinder',
      predecessors: ['box_1'],
      faces: [{
        vertices: new Float32Array([0, 0, 0]),
        indices: new Uint32Array([0]),
        normals: new Float32Array([0, 1, 0]),
        faceId: 1,
      }],
      // volume and edges intentionally omitted
    };
    const restored = rehydrateFromBridge(JSON.parse(JSON.stringify(serializeForBridge(original))));
    expect(restored.volume).toBeUndefined();
    expect(restored.edges).toBeUndefined();
    expect(restored.op).toBeUndefined();
    expect(restored.featureKind).toBe('cylinder');
    expect(restored.predecessors).toEqual(['box_1']);
  });

  it('round-trips op field', () => {
    const original: FeatureMesh = {
      featureId: 'bool_1',
      featureKind: 'boolean',
      predecessors: ['box_1', 'cyl_1'],
      op: 'subtract',
      faces: [{
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        indices: new Uint32Array([0, 1, 2]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        faceId: 0,
      }],
      volume: 500,
    };
    const restored = rehydrateFromBridge(JSON.parse(JSON.stringify(serializeForBridge(original))));
    expect(restored.op).toBe('subtract');
    expect(restored.predecessors).toEqual(['box_1', 'cyl_1']);
    // predecessors must be a clone, not the same reference
    expect(restored.predecessors).not.toBe(original.predecessors);
  });

  it('round-trips plane and cylinder metadata on faces', () => {
    const original: FeatureMesh = {
      featureId: 'box_2',
      featureKind: 'box',
      predecessors: [],
      faces: [{
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        indices: new Uint32Array([0, 1, 2]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        faceId: 2,
        plane: {
          origin: [0, 0, 5],
          normal: [0, 0, 1],
          xDir: [1, 0, 0],
          yDir: [0, 1, 0],
        },
      }, {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0]),
        indices: new Uint32Array([0, 1]),
        normals: new Float32Array([1, 0, 0, 1, 0, 0]),
        faceId: 3,
        cylinder: {
          origin: [0, 0, 0],
          axis: [0, 0, 1],
          radius: 5,
        },
      }],
    };
    const restored = rehydrateFromBridge(JSON.parse(JSON.stringify(serializeForBridge(original))));
    const planeFace = restored.faces[0];
    expect(planeFace.plane?.origin).toEqual([0, 0, 5]);
    expect(planeFace.plane?.normal).toEqual([0, 0, 1]);
    expect(planeFace.plane?.xDir).toEqual([1, 0, 0]);
    expect(planeFace.plane?.yDir).toEqual([0, 1, 0]);
    const cylFace = restored.faces[1];
    expect(cylFace.cylinder?.origin).toEqual([0, 0, 0]);
    expect(cylFace.cylinder?.axis).toEqual([0, 0, 1]);
    expect(cylFace.cylinder?.radius).toBe(5);
    // TypedArrays still intact
    expect(planeFace.vertices).toBeInstanceOf(Float32Array);
    expect(cylFace.indices).toBeInstanceOf(Uint32Array);
  });
});
