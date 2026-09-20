// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { tryExtractPlaneFromFace } from '../../../../../src/kernel/backends/occt/meshing';

describe('tryExtractPlaneFromFace (characterisation)', () => {
  it('returns undefined for non-record input', () => {
    expect(tryExtractPlaneFromFace(null)).toBeUndefined();
    expect(tryExtractPlaneFromFace(42)).toBeUndefined();
  });

  it('returns undefined when geomType is missing', () => {
    expect(tryExtractPlaneFromFace({})).toBeUndefined();
  });

  it('returns undefined when geomType is not planar', () => {
    expect(tryExtractPlaneFromFace({ geomType: 'CYLINDER' })).toBeUndefined();
  });

  it('extracts a plane from a face.plane record (fallback strategy)', () => {
    const face = {
      geomType: 'PLANE',
      plane: {
        origin: [1, 2, 3],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
    };
    const plane = tryExtractPlaneFromFace(face);
    expect(plane).toEqual({
      origin: [1, 2, 3],
      normal: [0, 0, 1],
      xDir: [1, 0, 0],
      yDir: [0, 1, 0],
    });
  });

  it('anchors the origin to face.center when available', () => {
    const face = {
      geomType: 'PLANAR',
      plane: {
        origin: [1, 2, 3],
        normal: [0, 0, 1],
      },
      center: [9, 9, 9],
    };
    const plane = tryExtractPlaneFromFace(face);
    expect(plane?.origin).toEqual([9, 9, 9]);
    expect(plane?.normal).toEqual([0, 0, 1]);
  });

  it('returns undefined when plane record has no origin or normal', () => {
    const face = { geomType: 'PLANE', plane: { foo: 'bar' } };
    expect(tryExtractPlaneFromFace(face)).toBeUndefined();
  });

  it('falls back to center + normalAt when no plane-like record present', () => {
    const face = {
      geomType: 'PLANE',
      center: () => [4, 5, 6],
      normalAt: (c: unknown) => {
        expect(c).toEqual([4, 5, 6]);
        return [0, 1, 0];
      },
    };
    const plane = tryExtractPlaneFromFace(face);
    expect(plane?.origin).toEqual([4, 5, 6]);
    expect(plane?.normal).toEqual([0, 1, 0]);
  });

  it('returns undefined when nothing usable is present', () => {
    const face = { geomType: 'PLANE' };
    expect(tryExtractPlaneFromFace(face)).toBeUndefined();
  });
});
