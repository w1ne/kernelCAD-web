// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { TriangleBvh } from '../../../src/modeling/runtime/dfm/meshBvh';

const triangle = { vertices: [0, 0, 0, 4, 0, 0, 0, 4, 0], triangles: [0, 1, 2] };
describe('TriangleBvh closest point', () => {
  it.each([
    { query: [1, 1, 5], point: [1, 1, 0], distance: 5 },
    { query: [3, 3, 0], point: [2, 2, 0], distance: Math.sqrt(2) },
    { query: [-2, -3, 0], point: [0, 0, 0], distance: Math.sqrt(13) },
    { query: [2, -3, 0], point: [2, 0, 0], distance: 3 },
  ])('measures interior, edge and vertex regions: $query', ({ query, point, distance }) => {
    const hit = new TriangleBvh(triangle).closestPoint(query as [number, number, number]);
    expect(hit!.distance).toBeCloseTo(distance, 10);
    hit!.point.forEach((v, i) => expect(v).toBeCloseTo(point[i], 10));
    expect(hit!.triIndex).toBe(0);
  });
  it('returns null for empty or wholly degenerate meshes', () => {
    expect(new TriangleBvh({ vertices: [], triangles: [] }).closestPoint([0, 0, 0])).toBeNull();
    expect(new TriangleBvh({ vertices: [0,0,0, 1,0,0, 2,0,0], triangles: [0,1,2] }).closestPoint([0,0,1])).toBeNull();
  });
  it('rejects nonfinite queries', () => {
    expect(() => new TriangleBvh(triangle).closestPoint([NaN, 0, 0])).toThrow(/finite/);
  });
  it('finds the global nearest triangle across internal nodes and preserves original ids', () => {
    const vertices: number[] = [];
    const triangles: number[] = [0, 0, 0]; // skipped triangle must not renumber later hits
    for (let i = 0; i < 40; i++) {
      vertices.push(i * 10, 0, 0, i * 10 + 4, 0, 0, i * 10, 4, 0);
      triangles.push(i * 3, i * 3 + 1, i * 3 + 2);
    }
    const bvh = new TriangleBvh({ vertices, triangles });
    for (const query of [[371,1,2], [15,4,3], [-3,5,1], [410,0,0]] as [number,number,number][]) {
      const brute = Array.from({ length: 40 }, (_, i) => {
        const local = new TriangleBvh({ vertices: vertices.slice(i * 9, i * 9 + 9), triangles: [0,1,2] });
        return { ...local.closestPoint(query)!, triIndex: i + 1 };
      }).sort((a, b) => a.distance - b.distance)[0];
      const actual = bvh.closestPoint(query)!;
      expect(actual.distance).toBeCloseTo(brute.distance, 10);
      expect(actual.triIndex).toBe(brute.triIndex);
    }
  });
});
