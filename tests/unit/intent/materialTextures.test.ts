// tests/unit/intent/materialTextures.test.ts
//
// TextureRef + TextureSet — type guards + normalization.

import { describe, it, expect } from 'vitest';
import {
  isTextureRef,
  normalizeTextureRef,
  type TextureRef,
} from '../../../src/shared/intent/textureRef';

describe('isTextureRef', () => {
  it('returns true for a minimal TextureRef', () => {
    expect(isTextureRef({ path: 'foo.png' })).toBe(true);
  });

  it('returns false for null / undefined / non-objects', () => {
    expect(isTextureRef(null)).toBe(false);
    expect(isTextureRef(undefined)).toBe(false);
    expect(isTextureRef('foo.png')).toBe(false);
    expect(isTextureRef(42)).toBe(false);
  });

  it('returns false when path is missing or non-string', () => {
    expect(isTextureRef({})).toBe(false);
    expect(isTextureRef({ path: 123 })).toBe(false);
    expect(isTextureRef({ path: '' })).toBe(false);
  });
});

describe('normalizeTextureRef', () => {
  it('applies defaults: repeat [1,1], offset [0,0], rotation 0', () => {
    const out = normalizeTextureRef({ path: 'a.png' });
    expect(out).toEqual({
      path: 'a.png',
      repeat: [1, 1],
      offset: [0, 0],
      rotation: 0,
    });
  });

  it('preserves explicit repeat / offset / rotation', () => {
    const ref: TextureRef = {
      path: 'b.jpg',
      repeat: [2, 3],
      offset: [0.1, 0.2],
      rotation: 45,
    };
    expect(normalizeTextureRef(ref)).toEqual(ref);
  });

  it('normalizes rotation outside [0, 360) — negative wraps', () => {
    const out = normalizeTextureRef({ path: 'a.png', rotation: -90 });
    expect(out.rotation).toBe(270);
  });

  it('normalizes rotation outside [0, 360) — over wraps', () => {
    const out = normalizeTextureRef({ path: 'a.png', rotation: 450 });
    expect(out.rotation).toBe(90);
  });

  it('throws when path is empty', () => {
    expect(() => normalizeTextureRef({ path: '' } as TextureRef)).toThrow(/path/);
  });

  it('throws when path is not a string', () => {
    expect(() => normalizeTextureRef({ path: 123 as any } as TextureRef)).toThrow(/path/);
  });

  it('throws when repeat is not a finite [number, number]', () => {
    expect(() =>
      normalizeTextureRef({ path: 'a.png', repeat: [Number.NaN, 1] as any } as TextureRef),
    ).toThrow(/repeat/);
  });

  it('throws when offset is not a finite [number, number]', () => {
    expect(() =>
      normalizeTextureRef({ path: 'a.png', offset: [1] as any } as TextureRef),
    ).toThrow(/offset/);
  });
});
