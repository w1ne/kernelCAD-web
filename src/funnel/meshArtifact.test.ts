// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { clampDisplayedArtifactMaterial, geometriesFromArtifact, parseMeshArtifact } from './meshArtifact';

const solidFeature = {
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
};

const cameraTargetFeature = {
  featureId: 'cameraTarget_1',
  featureKind: 'cameraTarget',
  predecessors: [],
  faces: [] as unknown[],
  virtual: true,
  cameraTarget: { target: [5, 5, 5], distance: 20 },
};

const artifact = {
  revision: 2,
  bounds: { min: [0, 0, 0], max: [10, 10, 10] },
  features: [solidFeature],
};

describe('clampDisplayedArtifactMaterial', () => {
  it('caps metalness, lifts roughness, and drops anisotropy without a map', () => {
    const clamped = clampDisplayedArtifactMaterial({
      baseColor: '#b0b4b8',
      metalness: 1,
      roughness: 0.25,
      anisotropy: 0.8,
    });
    expect(clamped).toMatchObject({
      baseColor: '#b0b4b8',
      metalness: 0.6,
      roughness: 0.35,
      anisotropy: 0,
    });
  });

  it('leaves a mild dielectric unchanged', () => {
    const material = { baseColor: '#111111', roughness: 0.4 };
    expect(clampDisplayedArtifactMaterial(material)).toBe(material);
  });

  it('applies the clamp when a stored artifact is parsed', () => {
    const parsed = parseMeshArtifact({
      revision: 1,
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      features: [{
        ...solidFeature,
        material: { baseColor: '#888888', metalness: 1, roughness: 0.3, anisotropy: 0.8 },
      }],
    });
    expect(parsed.features[0]?.material).toMatchObject({ metalness: 0.6, roughness: 0.35, anisotropy: 0 });
  });
});

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

  it('skips cameraTarget (and other) features with empty faces while keeping solids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mixed = {
      ...artifact,
      features: [cameraTargetFeature, solidFeature, {
        featureId: 'ref_img',
        featureKind: 'referenceImage',
        predecessors: [],
        faces: [],
        virtual: true,
      }],
    };
    const parsed = parseMeshArtifact(mixed, 2);
    expect(parsed.features).toHaveLength(1);
    expect(parsed.features[0]?.featureId).toBe('panel');
    expect(parsed.features[0]?.faces.length).toBe(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('throws when every feature has empty faces', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const allEmpty = {
      ...artifact,
      features: [cameraTargetFeature, {
        featureId: 'ghost',
        featureKind: 'solid',
        predecessors: [],
        faces: [],
      }],
    };
    expect(() => parseMeshArtifact(allEmpty, 2)).toThrow(/no drawable features with faces/);
    warn.mockRestore();
  });

  it('throws when faces is missing entirely on every feature', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const missingFaces = {
      ...artifact,
      features: [{
        featureId: 'cameraTarget_1',
        featureKind: 'cameraTarget',
        predecessors: [],
        virtual: true,
      }],
    };
    expect(() => parseMeshArtifact(missingFaces, 2)).toThrow(/no drawable features with faces/);
    warn.mockRestore();
  });
});

describe('selectTerminalSerializedFeatures via parseMeshArtifact', () => {
  it('drops intermediate DAG nodes, keeping only the finished boolean', () => {
    const tri = {
      vertices: [0, 0, 0, 10, 0, 0, 0, 10, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 1,
    };
    const withHistory = {
      revision: 2,
      bounds: { min: [0, 0, 0], max: [60, 60, 14] },
      features: [
        { featureId: 'box_1', featureKind: 'box', predecessors: [], faces: [tri] },
        {
          featureId: 'boolean_1',
          featureKind: 'boolean',
          predecessors: ['box_1'],
          faces: [tri],
          material: { baseColor: '#2244aa', roughness: 0.4 },
        },
        {
          featureId: 'boolean_2',
          featureKind: 'boolean',
          predecessors: ['boolean_1'],
          faces: [tri],
          material: { baseColor: '#bfc4c8', roughness: 0.4 },
        },
      ],
    };
    const parsed = parseMeshArtifact(withHistory, 2);
    expect(parsed.features.map((f) => f.featureId)).toEqual(['boolean_2']);
    expect(geometriesFromArtifact(parsed)).toHaveLength(1);
  });

  it('keeps multiple unconsumed tails (e.g. array of shapes)', () => {
    const tri = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 1,
    };
    const parsed = parseMeshArtifact({
      revision: 2,
      bounds: { min: [0, 0, 0], max: [2, 1, 0] },
      features: [
        { featureId: 'box_1', featureKind: 'box', predecessors: [], faces: [tri] },
        { featureId: 'box_2', featureKind: 'box', predecessors: [], faces: [tri] },
      ],
    }, 2);
    expect(parsed.features.map((f) => f.featureId)).toEqual(['box_1', 'box_2']);
  });
});
