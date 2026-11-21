// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { measureDutchClearance } from '../../integration/catalog/dutchBucketLayoutGeometry';
import type { MeshPart } from '../../integration/catalog/fiveConnectionsGeometry';

type Vec = [number, number, number];
function cube(min: Vec, max: Vec): MeshPart {
  const points: Vec[] = [
    [min[0], min[1], min[2]], [max[0], min[1], min[2]],
    [max[0], max[1], min[2]], [min[0], max[1], min[2]],
    [min[0], min[1], max[2]], [max[0], min[1], max[2]],
    [max[0], max[1], max[2]], [min[0], max[1], max[2]],
  ];
  const faces = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
    [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
  return { min, max, triangles: faces.map(face => face.map(index => points[index]!) as [Vec, Vec, Vec]) };
}

describe('Dutch actual-mesh clearance evidence', () => {
  it('measures a positive gap and rejects crossing surfaces from the triangles', () => {
    const a = cube([0, 0, 0], [10, 10, 10]);
    const clear = measureDutchClearance(a, cube([35, 0, 0], [45, 10, 10]));
    expect(clear.surfaceDistanceMm).toBeCloseTo(25, 8);
    expect(clear.solidsSeparated).toBe(true);
    const crossing = measureDutchClearance(a, cube([5, -5, 2], [15, 5, 8]));
    expect(crossing.surfaceDistanceMm).toBe(0);
    expect(crossing.solidsSeparated).toBe(false);
  });
  it('rejects a contained solid even when its surfaces have a positive distance', () => {
    const result = measureDutchClearance(cube([0, 0, 0], [10, 10, 10]), cube([2, 2, 2], [8, 8, 8]));
    expect(result.surfaceDistanceMm).toBeCloseTo(2, 8);
    expect(result.bVertexInsideA).toBe(true);
    expect(result.solidsSeparated).toBe(false);
  });
});
