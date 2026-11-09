// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { nearestTriangleDistancesChunked } from './meshDeviation';

describe('chunked export-mesh deviation queries', () => {
  it('finds the nearest triangle in later chunks while still considering earlier chunks', () => {
    const mesh = {
      vertices: [
        100, 0, 0, 102, 0, 0, 100, 2, 0,
        0, 0, 0, 2, 0, 0, 0, 2, 0,
      ],
      triangles: [0, 1, 2, 3, 4, 5],
    };

    expect(nearestTriangleDistancesChunked(
      [[0.5, 0.5, 0], [100.5, 0.5, 0]],
      [mesh],
      1,
    )).toEqual([0, 0]);
  });
});
