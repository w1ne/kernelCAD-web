// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { attachTextures, disposeMaterialDeep } from './buildMaterialFromPBR';

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

describe('attachTextures', () => {
  it('decodes one texture per image and shares it across materials and rebuilds', async () => {
    // attachTextures only runs where the DOM image surface exists.
    vi.stubGlobal('document', {});
    vi.stubGlobal('Image', class {});
    const decoded = new THREE.Texture();
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(decoded);
    try {
      const ref = { path: 'data:image/png;base64,AAAA', repeat: [3, 2] as [number, number] };
      const a = new THREE.MeshPhysicalMaterial();
      const b = new THREE.MeshPhysicalMaterial();
      attachTextures(a, { albedo: ref });
      attachTextures(b, { albedo: ref });
      await vi.waitFor(() => expect(b.map).toBe(decoded));
      expect(a.map).toBe(decoded);
      expect(load).toHaveBeenCalledTimes(1);
      expect(decoded.repeat.toArray()).toEqual([3, 2]);
    } finally {
      load.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
