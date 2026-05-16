// tests/unit/render/pbrMaterial.test.ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildMaterialFromPBR } from '../../../src/studio/components/demoPlayer/DemoPlayerPage';

describe('buildMaterialFromPBR', () => {
  it('builds MeshPhysicalMaterial with all PBR fields', () => {
    const mat = buildMaterialFromPBR({
      baseColor: '#0a0a0a',
      metalness: 0,
      roughness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.05,
      ior: 1.55,
    });
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    const m = mat as THREE.MeshPhysicalMaterial;
    expect(m.metalness).toBe(0);
    expect(m.roughness).toBe(0.15);
    expect(m.clearcoat).toBe(0.8);
    expect(m.clearcoatRoughness).toBe(0.05);
    expect(m.ior).toBe(1.55);
  });

  it('applies transmission and sheen when provided', () => {
    const mat = buildMaterialFromPBR({
      baseColor: '#ffffff',
      transmission: 0.9,
      sheen: 0.6,
    });
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    const m = mat as THREE.MeshPhysicalMaterial;
    expect(m.transmission).toBe(0.9);
    expect(m.sheen).toBe(0.6);
  });

  it('falls back to baseColor only when no PBR fields are provided', () => {
    const mat = buildMaterialFromPBR({ baseColor: '#ff0000' });
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect((mat as THREE.MeshPhysicalMaterial).color.getHexString()).toBe('ff0000');
  });

  it('uses DEFAULT_MESH_COLOR when no PBR record is provided', () => {
    const mat = buildMaterialFromPBR(undefined);
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    // Should produce a valid colored material without crashing
    const m = mat as THREE.MeshPhysicalMaterial;
    // The default color is 0xc8d2e0 — verify it's non-black
    expect(m.color.r).toBeGreaterThan(0);
  });

  it('uses defaults when PBR fields are absent', () => {
    const mat = buildMaterialFromPBR({ baseColor: '#aabbcc' });
    const m = mat as THREE.MeshPhysicalMaterial;
    expect(m.metalness).toBe(0);
    expect(m.roughness).toBe(0.5);
    expect(m.clearcoat).toBe(0);
    expect(m.clearcoatRoughness).toBe(0.03);
    expect(m.ior).toBe(1.5);
    expect(m.transmission).toBe(0);
    expect(m.sheen).toBe(0);
  });

  it('resolves role tokens via resolveColor (servo → dark gray)', () => {
    // 'servo' role token maps to #2b3137
    const mat = buildMaterialFromPBR({ baseColor: 'servo' });
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    // Just verify it doesn't crash and produces a non-white color
    const m = mat as THREE.MeshPhysicalMaterial;
    // #2b3137 → r≈0.169, darker than mid gray (0.5)
    expect(m.color.r).toBeLessThan(0.5);
  });
});
