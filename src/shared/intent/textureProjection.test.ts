// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { computeProjectedUVs, isTextureProjection } from './textureProjection';

describe('isTextureProjection', () => {
  it('accepts all four projection shapes', () => {
    expect(isTextureProjection({ type: 'flat' })).toBe(true);
    expect(isTextureProjection({ type: 'flat', onto: 'xz' })).toBe(true);
    expect(isTextureProjection({ type: 'cylinder', axis: [0, 0, 1] })).toBe(true);
    expect(isTextureProjection({ type: 'sphere' })).toBe(true);
    expect(isTextureProjection({ type: 'box' })).toBe(true);
  });

  it('rejects invalid records', () => {
    expect(isTextureProjection({ type: 'flat', onto: 'bogus' })).toBe(false);
    expect(isTextureProjection({ type: 'cylinder', axis: [0, 0, 0] })).toBe(false);
    expect(isTextureProjection({ type: 'cylinder', axis: [1, 2] })).toBe(false);
    expect(isTextureProjection({ type: 'cone' })).toBe(false);
    expect(isTextureProjection(null)).toBe(false);
    expect(isTextureProjection('flat')).toBe(false);
  });
});

describe('computeProjectedUVs', () => {
  it('flat(xy) maps the bounding box to [0,1]', () => {
    const vertices = new Float32Array([
      0, 0, 5,
      10, 0, 5,
      10, 20, 5,
      0, 20, 5,
    ]);
    const uv = computeProjectedUVs(vertices, { type: 'flat', onto: 'xy' });
    expect(Array.from(uv)).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
  });

  it('cylinder wraps the full angular range and normalizes height to [0,1]', () => {
    // 8-point ring at two heights, radius 5, axis Z.
    const n = 8;
    const pts: number[] = [];
    for (const z of [0, 10]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        pts.push(5 * Math.cos(a), 5 * Math.sin(a), z);
      }
    }
    const vertices = new Float32Array(pts);
    const uv = computeProjectedUVs(vertices, { type: 'cylinder', axis: [0, 0, 1] });

    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < uv.length; i += 2) {
      minU = Math.min(minU, uv[i]);
      maxU = Math.max(maxU, uv[i]);
      minV = Math.min(minV, uv[i + 1]);
      maxV = Math.max(maxV, uv[i + 1]);
    }
    expect(minU).toBeGreaterThanOrEqual(0);
    expect(maxU).toBeLessThanOrEqual(1);
    expect(maxU - minU).toBeGreaterThan(0.8);
    expect(minV).toBeCloseTo(0, 5);
    expect(maxV).toBeCloseTo(1, 5);
  });

  it('cylinder UVs are stable under a rigid translation of the vertices', () => {
    const base = new Float32Array([
      5, 0, 0,
      0, 5, 5,
      -5, 0, 10,
      0, -5, 15,
    ]);
    const translated = base.map((v, i) => v + (i % 3 === 0 ? 100 : i % 3 === 1 ? -50 : 20));
    const projection = { type: 'cylinder' as const, axis: [0, 0, 1] as [number, number, number] };
    const uvBase = computeProjectedUVs(base, projection);
    const uvTranslated = computeProjectedUVs(translated, projection);
    // Both are re-derived from final positions relative to their own
    // recomputed bounding box, so a uniform translation of the whole part
    // yields the same relative UV layout.
    for (let i = 0; i < uvBase.length; i++) {
      expect(uvTranslated[i]).toBeCloseTo(uvBase[i], 4);
    }
  });

  it('sphere UVs stay within [0,1]', () => {
    const vertices = new Float32Array([
      10, 0, 0, -10, 0, 0, 0, 10, 0, 0, -10, 0, 0, 0, 10, 0, 0, -10,
    ]);
    const uv = computeProjectedUVs(vertices, { type: 'sphere' });
    for (const v of uv) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('box UVs stay within [0,1] for a cube', () => {
    const vertices = new Float32Array([
      -5, -5, -5, 5, -5, -5, 5, 5, -5, -5, 5, -5,
      -5, -5, 5, 5, -5, 5, 5, 5, 5, -5, 5, 5,
    ]);
    const uv = computeProjectedUVs(vertices, { type: 'box' });
    for (const v of uv) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
