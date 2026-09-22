// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { geometriesFromArtifact, parseMeshArtifact } from './meshArtifact';

const artifact = {
  revision: 2,
  bounds: { min: [0, 0, 0], max: [10, 10, 10] },
  features: [{
    featureId: 'panel',
    featureKind: 'solid',
    predecessors: [],
    faces: [{
      vertices: [0, 0, 0, 10, 0, 0, 0, 10, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 1,
    }],
    material: { baseColor: '#111111', roughness: 0.4 },
  }],
};

describe('parseMeshArtifact', () => {
  it('keeps revision, materials, and camera bounds', () => {
    const parsed = parseMeshArtifact(artifact, 2);
    expect(parsed.revision).toBe(2);
    expect(parsed.bounds).toEqual({ min: [0, 0, 0], max: [10, 10, 10] });
    expect(parsed.features[0]?.material).toMatchObject({ baseColor: '#111111' });
    const geometries = geometriesFromArtifact(parsed);
    expect(geometries[0]?.faces[0]?.indices.length).toBeGreaterThanOrEqual(3);
    expect(geometries[0]?.material?.baseColor).toBe('#111111');
  });

  it('rejects a mesh whose revision does not match the embed', () => {
    expect(() => parseMeshArtifact(artifact, 3)).toThrow(/does not match/);
  });
});
