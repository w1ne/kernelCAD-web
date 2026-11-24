// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/render/indexedDisplayMesh.test.ts
//
// A composite GLB display body: one THREE.Mesh per material group under one
// Group, with UV/vertex-colour attributes and per-submesh PBR preserved unless
// the caller supplies an explicit material override.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildIndexedDisplayMesh } from '../../../src/render-player/components/demoPlayer/demoPlayerGeometry';
import { buildMaterialFromPBR } from '../../../src/render-player/components/demoPlayer/buildMaterialFromPBR';
import type { RuntimeSubMesh } from '../../../src/kernel/backends/runtimeMesh';

const triangle = (name: string, material: RuntimeSubMesh['material']): RuntimeSubMesh => ({
  name,
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
  uv: new Float32Array([0, 0, 1, 0, 0, 1]),
  colors: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  ...(material !== undefined ? { material } : {}),
});

describe('buildIndexedDisplayMesh — composite GLB groups', () => {
  const indexed = {
    positions: new Float32Array(9),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    subMeshes: [
      triangle('solder-mask', { baseColor: '#1b6b47', roughness: 0.42 }),
      triangle('gold-pad', { baseColor: '#d4af37', metalness: 1, roughness: 0.18 }),
    ],
  };

  it('returns one Mesh per sub-mesh under a Group, preserving each PBR material', () => {
    const built = buildIndexedDisplayMesh('board', indexed, buildMaterialFromPBR(undefined), {
      materialForSubMesh: (pbr) => buildMaterialFromPBR(pbr),
    });
    expect(built).toBeInstanceOf(THREE.Group);
    const meshes = built.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
    expect(meshes).toHaveLength(2);
    expect(meshes[0]!.geometry.getAttribute('uv')).toBeDefined();
    expect(meshes[0]!.geometry.getAttribute('color')).toBeDefined();
    expect((meshes[0]!.material as THREE.MeshPhysicalMaterial).vertexColors).toBe(true);
    expect((meshes[0]!.material as THREE.MeshPhysicalMaterial).color.getHexString()).toBe('1b6b47');
    expect((meshes[1]!.material as THREE.MeshPhysicalMaterial).metalness).toBe(1);
  });

  it('an explicit override material wins over every imported sub-mesh material', () => {
    const override = buildMaterialFromPBR({ baseColor: '#ff0000', roughness: 0.5 });
    const built = buildIndexedDisplayMesh('board', indexed, override);
    const meshes = built.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
    for (const mesh of meshes) expect(mesh.material).toBe(override);
  });
});
