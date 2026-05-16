import { describe, it, expect } from 'vitest';
import { isPBRMaterial, type PBRMaterial } from '../../../src/shared/intent/material';

describe('PBRMaterial', () => {
  it('accepts a minimal material with only baseColor', () => {
    const m: PBRMaterial = { baseColor: '#0a0a0a' };
    expect(isPBRMaterial(m)).toBe(true);
  });

  it('accepts a full PBR material', () => {
    const m: PBRMaterial = {
      baseColor: '#0a0a0a',
      metalness: 0,
      roughness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.05,
      ior: 1.55,
      transmission: 0,
      sheen: 0,
    };
    expect(isPBRMaterial(m)).toBe(true);
  });

  it('rejects an object without baseColor', () => {
    expect(isPBRMaterial({ metalness: 0.5 })).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(isPBRMaterial(null)).toBe(false);
    expect(isPBRMaterial('red')).toBe(false);
  });
});
