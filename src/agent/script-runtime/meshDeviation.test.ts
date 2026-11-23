// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  decodeBinaryStlMeshChunks,
  measureBrepSurfaceDeviationFromBinaryStl,
  nearestTriangleDistancesChunked,
} from './meshDeviation';

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

  it('streams STL chunks lazily and measures a nearest triangle in a later chunk', () => {
    const bytes = makeBinaryStl([
      farTriangle(40),
      farTriangle(50),
      farTriangle(60),
      farTriangle(70),
      sourceTriangle(),
    ]);
    const report = measureBrepSurfaceDeviationFromBinaryStl(
      [makeSourceShape() as never],
      bytes,
      0.01,
      100,
      2,
    );

    expect(report).toMatchObject({ measured_max_mm: 0, samples: 4, triangles: 5 });

    const mutableBytes = makeBinaryStl([
      farTriangle(40),
      farTriangle(50),
      farTriangle(60),
      farTriangle(70),
      sourceTriangle(),
    ]);
    const iterator = decodeBinaryStlMeshChunks(mutableBytes, 2)[Symbol.iterator]();
    const first = iterator.next();
    expect(first.done).toBe(false);
    expect(first.value!.triangles.length / 3).toBeLessThanOrEqual(2);

    const lateVertexZOffset = 84 + 4 * 50 + 12 + 8;
    new DataView(mutableBytes.buffer, mutableBytes.byteOffset, mutableBytes.byteLength)
      .setFloat32(lateVertexZOffset, 123, true);

    const outputCounts = [first.value!.triangles.length / 3];
    for (let next = iterator.next(); !next.done; next = iterator.next()) {
      const count = next.value!.triangles.length / 3;
      outputCounts.push(count);
      expect(count).toBeLessThanOrEqual(2);
      if (outputCounts.length === 3) expect(next.value!.vertices[2]).toBe(123);
    }
    expect(outputCounts).toEqual([2, 2, 1]);
  });
});

function makeSourceShape(): object {
  const vertices = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  const face = {
    triangulation: () => ({ vertices, trianglesIndexes: [0, 1, 2] }),
    uvCoordinates: (point: readonly number[]) => [point[0]!, point[1]!],
    UVBounds: { uMin: 0, uMax: 1, vMin: 0, vMax: 1 },
    pointOnSurface: (u: number, v: number) => ({ x: u, y: v, z: 0 }),
  };
  return { faces: [face] };
}

function sourceTriangle(): number[] {
  return [0, 0, 0, 1, 0, 0, 0, 1, 0];
}

function farTriangle(x: number): number[] {
  return [x, 0, 0, x + 1, 0, 0, x, 1, 0];
}

function makeBinaryStl(triangles: readonly (readonly number[])[]): Uint8Array {
  const bytes = new Uint8Array(84 + triangles.length * 50);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, triangles.length, true);
  for (let triangle = 0; triangle < triangles.length; triangle++) {
    const offset = 84 + triangle * 50;
    for (let vertex = 0; vertex < 9; vertex++) {
      view.setFloat32(offset + 12 + vertex * 4, triangles[triangle]![vertex]!, true);
    }
  }
  return bytes;
}
