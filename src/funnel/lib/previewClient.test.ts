// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { parsePreviewStream } from './previewClient';

function streamOf(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({ start(c) { c.enqueue(bytes); c.close(); } });
}

describe('parsePreviewStream', () => {
  it('parses status then preview_done', async () => {
    const sse =
      'event: status\ndata: {"progress":40}\n\n' +
      'event: preview_done\ndata: {"glbUrl":"https://t/out.glb","costUsd":0.2,"taskId":"task_1"}\n\n';
    const events = [];
    for await (const e of parsePreviewStream(streamOf(sse))) events.push(e);
    expect(events[0]).toEqual({ kind: 'status', progress: 40 });
    expect(events[1]).toEqual({
      kind: 'preview_done',
      glbUrl: 'https://t/out.glb',
      costUsd: 0.2,
      taskId: 'task_1',
      renderImageUrl: null,
      proportions: null,
    });
  });

  it('parses an error event', async () => {
    const sse = 'event: error\ndata: {"code":"provider_failed","message":"boom"}\n\n';
    const events = [];
    for await (const e of parsePreviewStream(streamOf(sse))) events.push(e);
    expect(events[0]).toEqual({ kind: 'error', code: 'provider_failed', message: 'boom' });
  });
});
