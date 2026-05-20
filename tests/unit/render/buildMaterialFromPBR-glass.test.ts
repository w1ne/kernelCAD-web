// tests/unit/render/buildMaterialFromPBR-glass.test.ts
//
// Glass (transmission + volume), anisotropy, and texture-map wiring in
// `buildMaterialFromPBR`. Texture loads are deferred — we exercise the
// synchronous return value here; the async `attachTextures` second pass is
// covered by an integration test downstream.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { buildMaterialFromPBR } from '../../../src/studio/components/demoPlayer/buildMaterialFromPBR';

describe('buildMaterialFromPBR — glass + anisotropy + textures', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('threads thickness, attenuationColor, attenuationDistance into MeshPhysicalMaterial', () => {
    const mat = buildMaterialFromPBR({
      baseColor: '#000000',
      transmission: 0.9,
      thickness: 5,
      attenuationColor: '#aabbcc',
      attenuationDistance: 10,
    });
    const m = mat as THREE.MeshPhysicalMaterial;
    expect(m.thickness).toBe(5);
    expect(m.attenuationDistance).toBe(10);
    expect(m.attenuationColor.getHexString()).toBe('aabbcc');
  });

  it('treats attenuationDistance Infinity (or unset) as Three.js default', () => {
    const mat = buildMaterialFromPBR({
      baseColor: '#ffffff',
      transmission: 0.5,
      attenuationDistance: Infinity,
    });
    const m = mat as THREE.MeshPhysicalMaterial;
    expect(m.attenuationDistance).toBe(Infinity);
  });

  it('defaults glass fields cleanly when no glass fields are set', () => {
    const mat = buildMaterialFromPBR({ baseColor: '#ff0000' });
    const m = mat as THREE.MeshPhysicalMaterial;
    expect(m.thickness).toBe(0);
    expect(m.attenuationDistance).toBe(Infinity);
    // attenuationColor default is white.
    expect(m.attenuationColor.getHexString()).toBe('ffffff');
  });

  it('converts anisotropyRotation degrees → radians and clamps anisotropy', () => {
    const mat = buildMaterialFromPBR({
      baseColor: '#888',
      metalness: 1,
      roughness: 0.35,
      anisotropy: 0.5,
      anisotropyRotation: 90,
    });
    const m = mat as THREE.MeshPhysicalMaterial;
    expect(m.anisotropy).toBeCloseTo(0.5, 6);
    expect(m.anisotropyRotation).toBeCloseTo(Math.PI / 2, 6);
  });

  it('anisotropy defaults to 0 when not specified', () => {
    const mat = buildMaterialFromPBR({ baseColor: '#888' });
    const m = mat as THREE.MeshPhysicalMaterial;
    expect(m.anisotropy).toBe(0);
    expect(m.anisotropyRotation).toBe(0);
  });

  it('does not crash when `textures` is supplied (async attachment is fire-and-forget)', () => {
    // The synchronous factory must not throw or block on texture loads. The
    // texture pop-in is handled by attachTextures in a separate microtask.
    const mat = buildMaterialFromPBR({
      baseColor: '#ffffff',
      textures: {
        albedo: { path: 'some/path/to/texture.png' },
        normal: { path: 'some/path/to/normal.png' },
      },
    });
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
  });
});
