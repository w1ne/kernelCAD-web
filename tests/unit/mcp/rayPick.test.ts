// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { rayPickFaces, rayPickTool } from '../../../src/agent/mcp/tools/rayPick';
import type { FaceGeometry } from '../../../src/shared/worker/workerTypes';

function triangle(faceId: number, z: number): FaceGeometry {
  return {
    faceId,
    vertices: new Float32Array([-1, -1, z, 1, -1, z, 0, 1, z]),
    indices: new Uint32Array([0, 1, 2]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  };
}

describe('ray_pick', () => {
  it('returns no hits for an empty ray path', () => {
    expect(rayPickFaces([triangle(0, 2)], [5, 5, 0], [0, 0, 1])).toEqual([]);
  });

  it('returns one hit per face in nearest-first order with point, distance, and normal', () => {
    expect(rayPickFaces([triangle(8, 5), triangle(3, 2)], [0, 0, 0], [0, 0, 1])).toEqual([
      { face_id: 3, point: [0, 0, 2], distance: 2, normal: [0, 0, 1] },
      { face_id: 8, point: [0, 0, 5], distance: 5, normal: [0, 0, 1] },
    ]);
  });

  it('validates ray inputs and reports actual model hits with selection-compatible face ids', async () => {
    expect(await rayPickTool({ code: 'return box(10, 10, 10);', origin: [0, 0, 0], direction: [0, 0, 0] })).toMatchObject({ ok: false });
    const result = await rayPickTool({ code: 'return box(10, 10, 10);', origin: [-5, 5, 5], direction: [2, 0, 0] });
    expect(result).toMatchObject({ ok: true, hit_basis: 'per-face tessellation' });
    const hits = (result as { hits: Array<{ distance: number; selection: { kind: string; id: number; shapeIndex: number } }> }).hits;
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0]!.distance).toBeLessThan(hits[1]!.distance);
    expect(hits[0]!.selection).toMatchObject({ kind: 'face', id: expect.any(Number), shapeIndex: expect.any(Number) });
  });

  it('returns a successful empty-hit result when the ray misses the model', async () => {
    const result = await rayPickTool({ code: 'return box(10, 10, 10);', origin: [-5, 50, 50], direction: [1, 0, 0] });
    expect(result).toMatchObject({ ok: true, hits: [] });
  });
});
