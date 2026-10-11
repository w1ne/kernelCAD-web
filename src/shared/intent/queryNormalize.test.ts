// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// FIX-03 — one selector vocabulary, no silent selector failures.
import { describe, it, expect } from 'vitest';
import {
  canonicalCurveType,
  canonicalSurfaceType,
  normalizeEdgeQuery,
  normalizeFaceQuery,
  publicSurfaceType,
  sameGeometryType,
} from './queryNormalize';
import { KernelError } from './kernelError';

function codeOf(fn: () => unknown): { code?: string; message?: string; hint?: string } {
  try {
    fn();
  } catch (e) {
    if (e instanceof KernelError) return { code: e.code, message: e.message, hint: e.hint };
    throw e;
  }
  return {};
}

describe('geometry-type vocabulary', () => {
  it('maps OCCT and public surface names onto one canonical spelling', () => {
    expect(canonicalSurfaceType('CYLINDRE')).toBe('CYLINDER');
    expect(canonicalSurfaceType('cylinder')).toBe('CYLINDER');
    expect(canonicalSurfaceType('BSPLINE')).toBe('BSPLINE_SURFACE');
    expect(canonicalSurfaceType('PLANE')).toBe('PLANE');
    expect(canonicalSurfaceType('LINE')).toBeUndefined();
    expect(canonicalSurfaceType('FOO')).toBeUndefined();
  });

  it('maps curve aliases', () => {
    expect(canonicalCurveType('BSPLINE')).toBe('BSPLINE_CURVE');
    expect(canonicalCurveType('circle')).toBe('CIRCLE');
    expect(canonicalCurveType('PLANE')).toBeUndefined();
  });

  it('reports public English surface names', () => {
    expect(publicSurfaceType('CYLINDRE')).toBe('CYLINDER');
    expect(publicSurfaceType('PLANE')).toBe('PLANE');
    expect(publicSurfaceType('BSPLINE_SURFACE')).toBe('BSPLINE_SURFACE');
    expect(publicSurfaceType(undefined)).toBe('UNKNOWN');
  });

  it('sameGeometryType is alias-aware', () => {
    expect(sameGeometryType('CYLINDRE', 'CYLINDER')).toBe(true);
    expect(sameGeometryType('BSPLINE', 'BSPLINE_SURFACE')).toBe(true);
    expect(sameGeometryType('PLANE', 'CYLINDER')).toBe(false);
    expect(sameGeometryType('FOO', 'FOO')).toBe(false);
  });
});

describe('normalizeEdgeQuery', () => {
  it('accepts axis letters (signed, any case) for parallel / perpendicular', () => {
    expect(normalizeEdgeQuery({ parallel: 'Z' }).parallel).toEqual([0, 0, 1]);
    expect(normalizeEdgeQuery({ parallel: '-x' as never }).parallel).toEqual([-1, 0, 0]);
    expect(normalizeEdgeQuery({ perpendicular: 'Y' }).perpendicular).toEqual([0, 1, 0]);
    expect(normalizeEdgeQuery({ parallel: [0, 0, 2] }).parallel).toEqual([0, 0, 2]);
  });

  it('accepts parallelTo / perpendicularTo as aliases', () => {
    expect(normalizeEdgeQuery({ parallelTo: 'Z' }).parallel).toEqual([0, 0, 1]);
    expect(normalizeEdgeQuery({ perpendicularTo: [1, 0, 0] }).perpendicular).toEqual([1, 0, 0]);
  });

  it('rejects conflicting alias values', () => {
    const r = codeOf(() => normalizeEdgeQuery({ parallel: 'Z', parallelTo: 'X' }));
    expect(r.code).toBe('feature.invalid-args');
    expect(r.hint).toContain('alias-conflict');
  });

  it('rejects a bad direction instead of silently matching nothing', () => {
    const r = codeOf(() => normalizeEdgeQuery({ parallel: 'Q' as never }));
    expect(r.code).toBe('feature.invalid-args');
    expect(r.message).toContain('EdgeQuery: parallel');
    expect(codeOf(() => normalizeEdgeQuery({ parallel: [0, 0, 0] })).code).toBe('feature.invalid-args');
  });

  it('normalises within: { min, max } to per-axis bounds', () => {
    expect(normalizeEdgeQuery({ within: { min: [-1, -2, 9], max: [1, 2, 11] } }).within).toEqual({
      xMin: -1, yMin: -2, zMin: 9, xMax: 1, yMax: 2, zMax: 11,
    });
    expect(normalizeEdgeQuery({ within: { zMin: 5 } }).within).toEqual({ zMin: 5 });
  });

  it('rejects empty / malformed / inverted within regions (they used to match everything)', () => {
    for (const within of [{}, { lo: 1 }, { min: [0, 0, 0] }, { min: [1, 0, 0], max: [0, 1, 1] }, { zMin: 'a' }]) {
      const r = codeOf(() => normalizeEdgeQuery({ within } as never));
      expect(r.code, JSON.stringify(within)).toBe('feature.invalid-args');
      expect(r.hint).toContain('bad-region');
    }
  });

  it('rejects unknown keys with a hint listing the valid ones', () => {
    const r = codeOf(() => normalizeEdgeQuery({ atz: 5 } as never));
    expect(r.code).toBe('feature.invalid-args');
    expect(r.message).toContain('unknown key atz');
    expect(r.hint).toContain('invalid-args.selector.unknown-key');
    expect(r.hint).toContain('atZ');
  });

  it('rejects ill-typed scalar values', () => {
    expect(codeOf(() => normalizeEdgeQuery({ atZ: '5' } as never)).code).toBe('feature.invalid-args');
    expect(codeOf(() => normalizeEdgeQuery({ convex: 'yes' } as never)).code).toBe('feature.invalid-args');
    expect(codeOf(() => normalizeEdgeQuery({ tolerance: 0 })).code).toBe('feature.invalid-args');
    expect(codeOf(() => normalizeEdgeQuery({ near: [1, 2] } as never)).code).toBe('feature.invalid-args');
  });

  it('canonicalises ofCurveType and rejects unknown curve types', () => {
    expect(normalizeEdgeQuery({ ofCurveType: 'BSPLINE' }).ofCurveType).toBe('BSPLINE_CURVE');
    expect(codeOf(() => normalizeEdgeQuery({ ofCurveType: 'PLANE' } as never)).code).toBe('feature.invalid-args');
  });

  it('explains a string passed where a query object was expected', () => {
    const r = codeOf(() => normalizeEdgeQuery('@kc[box_1/edge/e1]'));
    expect(r.code).toBe('feature.invalid-args');
    expect(r.hint).toContain('string-not-query');
  });
});

describe('normalizeFaceQuery', () => {
  it('accepts CYLINDER and CYLINDRE as the same surface type', () => {
    expect(normalizeFaceQuery({ ofSurfaceType: 'CYLINDER' }).ofSurfaceType).toBe('CYLINDER');
    expect(normalizeFaceQuery({ ofSurfaceType: 'CYLINDRE' }).ofSurfaceType).toBe('CYLINDER');
    expect(codeOf(() => normalizeFaceQuery({ ofSurfaceType: 'CIRCLE' } as never)).code).toBe('feature.invalid-args');
  });

  it('accepts axis letters, plane names, vectors, and the EdgeQuery spelling `parallel`', () => {
    expect(normalizeFaceQuery({ parallelTo: 'XY' }).parallelTo).toEqual([0, 0, 1]);
    expect(normalizeFaceQuery({ parallelTo: 'Z' }).parallelTo).toEqual([0, 0, 1]);
    expect(normalizeFaceQuery({ parallel: 'X' }).parallelTo).toEqual([1, 0, 0]);
    expect(normalizeFaceQuery({ parallelTo: [0, 1, 0] }).parallelTo).toEqual([0, 1, 0]);
  });

  it('keeps byNormal signed and validates it', () => {
    expect(normalizeFaceQuery({ byNormal: '-Z' }).byNormal).toEqual([0, 0, -1]);
    expect(codeOf(() => normalizeFaceQuery({ byNormal: 'Q' } as never)).code).toBe('feature.invalid-args');
  });

  it('normalises boundingBoxIn corners and rejects unknown keys', () => {
    expect(normalizeFaceQuery({ boundingBoxIn: { min: [0, 0, 0], max: [1, 1, 1] } }).boundingBoxIn)
      .toEqual({ xMin: 0, yMin: 0, zMin: 0, xMax: 1, yMax: 1, zMax: 1 });
    const r = codeOf(() => normalizeFaceQuery({ surfaceType: 'PLANE' } as never));
    expect(r.code).toBe('feature.invalid-args');
    expect(r.hint).toContain('ofSurfaceType');
  });
});
