// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { createInlineTransport, rebuildQueue, STUDIO_MODEL_DOC } from './rebuildQueueInstance';
import { RebuildQueue } from './rebuildQueue';
import type { RebuildWorkerResponse } from './rebuildProtocol';

const MESH_BODY = {
  features: [
    {
      featureId: 'box',
      faces: [
        {
          vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
          uv: [0, 0, 1, 0, 0, 1],
          indices: [0, 1, 2],
          faceId: 1,
        },
      ],
    },
  ],
};

interface MeshBody {
  features: Array<{
    faces: Array<{ vertices: unknown; normals: unknown; indices: unknown }>;
  }>;
}

function meshResponse(): Response {
  return new Response(JSON.stringify(MESH_BODY), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('inline rebuild transport', () => {
  it('round-trips a mesh payload through the worker handler', async () => {
    const fetchMock = vi.fn(async () => meshResponse());
    vi.stubGlobal('fetch', fetchMock);

    const queue = new RebuildQueue({ createTransport: () => createInlineTransport() });
    const response = await queue.fetchJson({ url: 'https://example.test/mesh', label: 'mesh' });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('');

    const body = response.body as MeshBody;
    expect(body.features[0].faces[0].vertices).toBeInstanceOf(Float32Array);
    expect(body.features[0].faces[0].normals).toBeInstanceOf(Float32Array);
    expect(body.features[0].faces[0].indices).toBeInstanceOf(Uint32Array);
    expect(Array.from(body.features[0].faces[0].vertices as Float32Array)).toEqual([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('delivers the answer asynchronously', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => meshResponse()));

    const transport = createInlineTransport();
    const received: RebuildWorkerResponse[] = [];
    transport.listen(
      (message) => {
        received.push(message);
      },
      () => { /* the inline transport cannot crash */ },
    );

    transport.post({ type: 'fetch', jobId: 1, url: 'https://example.test/mesh' });
    expect(received).toHaveLength(0);

    await vi.waitFor(() => {
      expect(received).toHaveLength(1);
    });
    expect(received[0].type).toBe('done');
  });

  it('uses the fetch that is installed when the request runs', async () => {
    const queue = new RebuildQueue({ createTransport: () => createInlineTransport() });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await queue.fetchJson({ url: 'https://example.test/mesh', label: 'mesh' });
    expect(response.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('the shared rebuild queue', () => {
  it('names the document of the model the Studio shows', () => {
    expect(typeof STUDIO_MODEL_DOC).toBe('string');
    expect(STUDIO_MODEL_DOC.length).toBeGreaterThan(0);
  });

  it('falls back to the inline transport where no Worker exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => meshResponse()));

    const response = await rebuildQueue.fetchJson({ url: 'https://example.test/mesh', label: 'mesh' });
    expect(response.ok).toBe(true);
    expect(rebuildQueue.getSnapshot().jobs).toHaveLength(0);
  });
});
