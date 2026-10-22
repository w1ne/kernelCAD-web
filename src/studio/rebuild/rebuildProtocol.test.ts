// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import {
  createRebuildWorkerHandler,
  isRebuildWorkerResponse,
  type RebuildWorkerRequest,
  type RebuildWorkerResponse,
} from './rebuildProtocol';

interface Posted {
  message: RebuildWorkerResponse;
  transfer: ArrayBuffer[];
}

function collector() {
  const posted: Posted[] = [];
  return {
    posted,
    post: (message: RebuildWorkerResponse, transfer: ArrayBuffer[]) => {
      posted.push({ message, transfer });
    },
  };
}

/** The worker's answer for a job arrives asynchronously. */
async function waitForPost(posts: Posted[]): Promise<Posted> {
  await vi.waitFor(() => {
    expect(posts.length).toBeGreaterThan(0);
  });
  return posts[0]!;
}

const MESH_BODY = {
  features: [
    {
      featureId: 'box',
      faces: [
        {
          vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
          indices: [0, 1, 2],
          faceId: 1,
        },
      ],
    },
  ],
};

describe('rebuild worker protocol', () => {
  it('posts done with typed arrays and the buffers to transfer', async () => {
    const { posted, post } = collector();
    const handle = createRebuildWorkerHandler({
      fetchImpl: async () => new Response(JSON.stringify(MESH_BODY), {
        status: 200,
        headers: { 'content-type': 'application/json', 'retry-after': '7' },
      }),
      post,
    });

    handle({ type: 'fetch', jobId: 1, url: 'https://example.test/mesh' });
    const { message, transfer } = await waitForPost(posted);

    expect(message.type).toBe('done');
    if (message.type !== 'done') return;
    expect(message.jobId).toBe(1);
    expect(message.ok).toBe(true);
    expect(message.status).toBe(200);
    expect(message.retryAfter).toBe('7');
    const features = (message.body as { features: any[] }).features;
    expect(features[0].faces[0].vertices).toBeInstanceOf(Float32Array);
    expect(features[0].faces[0].indices).toBeInstanceOf(Uint32Array);
    expect(transfer).toContain(features[0].faces[0].vertices.buffer);
    expect(transfer).toContain(features[0].faces[0].indices.buffer);
  });

  it('posts done with ok false when the server answers an HTTP error', async () => {
    const { posted, post } = collector();
    const handle = createRebuildWorkerHandler({
      fetchImpl: async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 }),
      post,
    });

    handle({ type: 'fetch', jobId: 2, url: 'https://example.test/mesh' });
    const { message } = await waitForPost(posted);

    expect(message.type).toBe('done');
    if (message.type !== 'done') return;
    expect(message.ok).toBe(false);
    expect(message.status).toBe(500);
    expect((message.body as { error: string }).error).toBe('boom');
  });

  it('posts done with a null body when the answer is not JSON', async () => {
    const { posted, post } = collector();
    const handle = createRebuildWorkerHandler({
      fetchImpl: async () => new Response('<!doctype html><html>nope</html>', { status: 200 }),
      post,
    });

    handle({ type: 'fetch', jobId: 3, url: 'https://example.test/mesh' });
    const { message } = await waitForPost(posted);

    expect(message.type).toBe('done');
    if (message.type !== 'done') return;
    expect(message.ok).toBe(true);
    expect(message.body).toBeNull();
  });

  it('posts done with a null body when the answer is empty', async () => {
    const { posted, post } = collector();
    const handle = createRebuildWorkerHandler({
      fetchImpl: async () => new Response('', { status: 200 }),
      post,
    });

    handle({ type: 'fetch', jobId: 4, url: 'https://example.test/mesh' });
    const { message } = await waitForPost(posted);

    expect(message.type).toBe('done');
    if (message.type !== 'done') return;
    expect(message.body).toBeNull();
  });

  it('posts failed when the network call rejects', async () => {
    const { posted, post } = collector();
    const handle = createRebuildWorkerHandler({
      fetchImpl: async () => { throw new Error('network down'); },
      post,
    });

    handle({ type: 'fetch', jobId: 5, url: 'https://example.test/mesh' });
    const { message } = await waitForPost(posted);

    expect(message.type).toBe('failed');
    if (message.type !== 'failed') return;
    expect(message.jobId).toBe(5);
    expect(message.aborted).toBe(false);
    expect(message.message).toBe('network down');
  });

  it('posts exactly one failed message when a pending fetch is cancelled', async () => {
    const { posted, post } = collector();
    const handle = createRebuildWorkerHandler({
      fetchImpl: (_url, init) => new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted.');
          error.name = 'AbortError';
          reject(error);
        });
      }),
      post,
    });

    handle({ type: 'fetch', jobId: 6, url: 'https://example.test/mesh' });
    handle({ type: 'cancel', jobId: 6 });
    await waitForPost(posted);

    expect(posted).toHaveLength(1);
    expect(posted[0].message.type).toBe('failed');
    expect((posted[0].message as { aborted: boolean }).aborted).toBe(true);
    expect(posted.some((entry) => entry.message.type === 'done')).toBe(false);
  });

  it('ignores a cancel for a job that is not running', () => {
    const { posted, post } = collector();
    const handle = createRebuildWorkerHandler({
      fetchImpl: async () => new Response('{}', { status: 200 }),
      post,
    });

    expect(() => handle({ type: 'cancel', jobId: 404 })).not.toThrow();
    expect(posted).toHaveLength(0);
  });

  it('never throws out of the handler', () => {
    const { post } = collector();
    const handle = createRebuildWorkerHandler({
      fetchImpl: async () => new Response('{}', { status: 200 }),
      post,
    });

    expect(() => handle(null as unknown as RebuildWorkerRequest)).not.toThrow();
    expect(() => handle({ type: 'fetch' } as unknown as RebuildWorkerRequest)).not.toThrow();
  });
});

describe('isRebuildWorkerResponse', () => {
  it('accepts both worker messages', () => {
    expect(isRebuildWorkerResponse({
      type: 'done',
      jobId: 1,
      ok: true,
      status: 200,
      statusText: 'OK',
      retryAfter: null,
      body: null,
    })).toBe(true);
    expect(isRebuildWorkerResponse({
      type: 'failed',
      jobId: 1,
      message: 'boom',
      aborted: false,
    })).toBe(true);
  });

  it('rejects junk', () => {
    expect(isRebuildWorkerResponse(null)).toBe(false);
    expect(isRebuildWorkerResponse('done')).toBe(false);
    expect(isRebuildWorkerResponse([])).toBe(false);
    expect(isRebuildWorkerResponse({})).toBe(false);
    expect(isRebuildWorkerResponse({ type: 'done' })).toBe(false);
    expect(isRebuildWorkerResponse({ type: 'done', jobId: 1 })).toBe(false);
    expect(isRebuildWorkerResponse({ type: 'failed', jobId: 1 })).toBe(false);
    expect(isRebuildWorkerResponse({ type: 'other', jobId: 1, ok: true, status: 200 })).toBe(false);
  });
});
