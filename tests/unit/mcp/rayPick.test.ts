// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rayPickFaces, rayPickTool } from '../../../src/agent/mcp/tools/rayPick';
import { sharedSelectionTool } from '../../../src/agent/mcp/tools/sharedSelection';
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
  afterEach(() => vi.unstubAllGlobals());

  it('returns no hits for an empty ray path', () => {
    expect(rayPickFaces([triangle(0, 2)], [5, 5, 0], [0, 0, 1])).toEqual([]);
  });

  it('returns one hit per face in nearest-first order with point, distance, and normal', () => {
    expect(rayPickFaces([triangle(8, 5), triangle(3, 2)], [0, 0, 0], [0, 0, 1])).toEqual([
      { face_id: 3, point: [0, 0, 2], distance: 2, normal: [0, 0, 1] },
      { face_id: 8, point: [0, 0, 5], distance: 5, normal: [0, 0, 1] },
    ]);
  });

  it('validates ray inputs and round-trips a hit directly through set_selection', async () => {
    expect(await rayPickTool({ code: 'return box(10, 10, 10);', origin: [0, 0, 0], direction: [0, 0, 0], studio_url: 'http://localhost:5173', session: 'token' })).toMatchObject({ ok: false });
    const selection = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify(
      init?.method === 'POST'
        ? { ok: true, selection: JSON.parse(String(init.body)).selection, revision: 3, modelGeneration: 7 }
        : { ok: true, selection: null, revision: 2, modelGeneration: 7 },
    )));
    vi.stubGlobal('fetch', selection);
    const target = { studio_url: 'http://localhost:5173', session: 'token' };
    const result = await rayPickTool({ ...target, code: 'return box(10, 10, 10);', origin: [-5, 5, 5], direction: [2, 0, 0] });
    expect(result).toMatchObject({ ok: true, hit_basis: 'per-face tessellation' });
    expect(result).toMatchObject({ ...target, model_generation: 7 });
    const hits = (result as { hits: Array<{ distance: number; model_generation: number; selection: { kind: string; id: number; shapeIndex: number }; set_selection: Record<string, unknown> }> }).hits;
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0]!.distance).toBeLessThan(hits[1]!.distance);
    expect(hits[0]!.selection).toMatchObject({ kind: 'face', id: expect.any(Number), shapeIndex: expect.any(Number) });
    expect(hits[0]!.model_generation).toBe(7);
    expect(hits[0]!.set_selection).toEqual({ ...target, model_generation: 7, selection: hits[0]!.selection });
    expect(await sharedSelectionTool('POST', hits[0]!.set_selection)).toMatchObject({ ok: true, selection: hits[0]!.selection, modelGeneration: 7 });
    expect(selection).toHaveBeenCalledTimes(2);
  });

  it('returns a successful empty-hit result when the ray misses the model', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, selection: null, revision: 0, modelGeneration: 0 }))));
    const result = await rayPickTool({ studio_url: 'http://localhost:5173', session: 'token', code: 'return box(10, 10, 10);', origin: [-5, 50, 50], direction: [1, 0, 0] });
    expect(result).toMatchObject({ ok: true, hits: [] });
  });
});
