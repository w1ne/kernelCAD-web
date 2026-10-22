// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { disposeMaterialDeep } from './buildMaterialFromPBR';

describe('disposeMaterialDeep', () => {
  it('disposes material arrays and every texture map attached to each material', () => {
    const textureA = new THREE.Texture();
    const textureB = new THREE.Texture();
    const textureC = new THREE.Texture();
    const materialA = new THREE.MeshPhysicalMaterial({
      map: textureA,
      normalMap: textureB,
    });
    materialA.userData.extra = 'kept';
    const materialB = new THREE.MeshStandardMaterial({
      roughnessMap: textureC,
    });

    const textureADispose = vi.spyOn(textureA, 'dispose');
    const textureBDispose = vi.spyOn(textureB, 'dispose');
    const textureCDispose = vi.spyOn(textureC, 'dispose');
    const materialADispose = vi.spyOn(materialA, 'dispose');
    const materialBDispose = vi.spyOn(materialB, 'dispose');

    disposeMaterialDeep([materialA, materialB]);

    expect(textureADispose).toHaveBeenCalledTimes(1);
    expect(textureBDispose).toHaveBeenCalledTimes(1);
    expect(textureCDispose).toHaveBeenCalledTimes(1);
    expect(materialADispose).toHaveBeenCalledTimes(1);
    expect(materialBDispose).toHaveBeenCalledTimes(1);
  });
});
