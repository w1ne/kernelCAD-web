// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The Studio's mesh fetches through the rebuild queue: the geometry is the
// same as the old main-thread path, a newer rebuild of the model cancels the
// stale one, and a failed rebuild reaches the caller and the UI.
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../funnel/lib/supabaseClient', () => ({
  isAuthConfigured: () => true,
  getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }),
}));

import { meshSourceDev } from '../scriptSource';
import { featureMeshesToGeometries } from '../context/geometry/types';
import { packMeshPayload } from './meshPayloadTransfer';
import { rebuildQueue, STUDIO_MODEL_DOC } from './rebuildQueueInstance';
import type { FeatureMeshSerialized } from '../../modeling/capture/featureMeshSerialize';

afterEach(() => {
  rebuildQueue.clearError();
  vi.restoreAllMocks();
});

function feature(id: string, offset: number): FeatureMeshSerialized {
  return {
    featureId: id,
    featureKind: 'box',
    predecessors: [],
    faces: [{
      vertices: [offset + 0.1, 0.2, 0.30000000000000004, 1 / 3, 2.5, -7.123456789],
      normals: [0, 0, 1, 0, 0, 1],
      indices: [0, 1, 0],
      uv: [0, 0, 1, 1],
      faceId: 3,
    }],
    mesh: { positions: [1.1, 2.2, 3.3], normals: [0, 1, 0], indices: [0, 0, 0] },
    edges: [0.5, 0.25, 1e-7],
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    faceOwners: [id],
    edgeRanges: [0, 1],
    edgeOwners: [id],
  };
}

function payload() {
  return { features: [feature('a', 0), feature('b', 10)], bounds: { min: [0, 0, 0], max: [1, 1, 1] } };
}

/** A fetch that answers only when told to, and rejects on abort like the real one. */
function controllableFetch() {
  const calls: { signal?: AbortSignal; answer: (body: unknown, status?: number) => void }[] = [];
  const impl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
    const signal = init?.signal ?? undefined;
    signal?.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
    calls.push({
      signal,
      answer: (body, status = 200) => resolve(new Response(JSON.stringify(body), { status })),
    });
  }));
  return { impl, calls };
}

describe('Studio rebuilds through the rebuild queue', () => {
  it('produces the same geometry as the main-thread rehydrate', () => {
    const plain = featureMeshesToGeometries(payload().features);
    const packed = packMeshPayload(payload()).payload as { features: FeatureMeshSerialized[] };
    expect(featureMeshesToGeometries(packed.features)).toEqual(plain);
  });

  it('cancels the stale model rebuild when a newer one starts', async () => {
    const fetch = controllableFetch();
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetch.impl);
    const stale = meshSourceDev('return box(1,1,1);', undefined, { doc: STUDIO_MODEL_DOC });
    const staleSettled = stale.catch((error: unknown) => error);
    await vi.waitFor(() => expect(fetch.calls.length).toBe(1));
    const fresh = meshSourceDev('return box(2,2,2);', undefined, { doc: STUDIO_MODEL_DOC });
    await vi.waitFor(() => expect(fetch.calls.length).toBe(2));

    expect(await staleSettled).toMatchObject({ name: 'AbortError' });
    expect(fetch.calls[0].signal?.aborted).toBe(true);

    fetch.calls[1].answer(payload());
    const result = await fresh;
    expect(result.features[0].faces[0].vertices).toBeInstanceOf(Float32Array);
    expect(rebuildQueue.getSnapshot().jobs.some((job) => job.doc === STUDIO_MODEL_DOC)).toBe(false);
  });

  it('does not cancel a rebuild of another document', async () => {
    const fetch = controllableFetch();
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetch.impl);
    const other = meshSourceDev('return box(1,1,1);');
    await vi.waitFor(() => expect(fetch.calls.length).toBe(1));
    const model = meshSourceDev('return box(2,2,2);', undefined, { doc: STUDIO_MODEL_DOC });
    await vi.waitFor(() => expect(fetch.calls.length).toBe(2));
    expect(fetch.calls[0].signal?.aborted).toBe(false);
    fetch.calls[0].answer(payload());
    fetch.calls[1].answer(payload());
    await expect(other).resolves.toHaveProperty('features');
    await expect(model).resolves.toHaveProperty('features');
  });

  it('surfaces a failed rebuild to the caller and the running-rebuilds list', async () => {
    const fetch = controllableFetch();
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetch.impl);
    const failing = meshSourceDev('return nope();', undefined, { doc: STUDIO_MODEL_DOC });
    await vi.waitFor(() => expect(fetch.calls.length).toBe(1));
    fetch.calls[0].answer({ error: 'nope is not defined' }, 500);
    await expect(failing).rejects.toThrow('nope is not defined');
    expect(rebuildQueue.getSnapshot().lastError?.message).toBe('nope is not defined');
  });
});
