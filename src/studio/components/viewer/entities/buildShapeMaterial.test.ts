// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildShapeMaterial } from './buildShapeMaterial';
import { setRoomEnvironmentForTest } from '../roomEnvironment';

describe('buildShapeMaterial room environment', () => {
  it('pins the installed room onto a PBR material', () => {
    const env = new THREE.Texture();
    setRoomEnvironmentForTest(env);
    try {
      const material = buildShapeMaterial(
        { baseColor: '#b0b4b8', metalness: 0.6, roughness: 0.35 },
        false,
        '#b0b4b8',
        'shaded',
      ) as THREE.MeshPhysicalMaterial;
      expect(material.envMap).toBe(env);
      expect(material.envMapIntensity).toBe(1);
    } finally {
      setRoomEnvironmentForTest(null);
      env.dispose();
    }
  });
});

describe('buildShapeMaterial clippingPlanes', () => {
  it('defaults to no clipping planes', () => {
    const m = buildShapeMaterial(undefined, false, '#ffffff', 'shaded');
    expect(m.clippingPlanes ?? []).toHaveLength(0);
  });

  it('applies passed clipping planes and clipShadows', () => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10);
    const m = buildShapeMaterial(undefined, false, '#ffffff', 'shaded', [plane]);
    expect(m.clippingPlanes).toHaveLength(1);
    expect(m.clippingPlanes![0]).toBe(plane);
    expect(m.clipShadows).toBe(true);
  });
});

describe('buildShapeMaterial cutaway clipping', () => {
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10);

  it('clipIntersection defaults to false', () => {
    const m = buildShapeMaterial(undefined, false, '#ffffff', 'shaded', [plane]);
    expect(m.clipIntersection).toBe(false);
  });

  it('propagates clipIntersection=true to the material', () => {
    const m = buildShapeMaterial(undefined, false, '#ffffff', 'shaded', [plane], true);
    expect(m.clipIntersection).toBe(true);
  });

  it('clipped Lambert fallback renders double-sided; unclipped stays front-side', () => {
    const clipped = buildShapeMaterial(undefined, false, '#ffffff', 'shaded', [plane]);
    expect(clipped.side).toBe(THREE.DoubleSide);
    const unclipped = buildShapeMaterial(undefined, false, '#ffffff', 'shaded');
    expect(unclipped.side).toBe(THREE.FrontSide);
  });
});
