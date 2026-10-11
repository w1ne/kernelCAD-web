// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { parseSseStream, type GenerateEvent } from './generateClient';

function streamOf(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function collect(text: string): Promise<GenerateEvent[]> {
  const out: GenerateEvent[] = [];
  for await (const e of parseSseStream(streamOf(text))) out.push(e);
  return out;
}

const block = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe('parseSseStream', () => {
  it('parses progress and attached events', async () => {
    const events = await collect(
      block('attached', { message: 'already running' })
        + block('progress', { type: 'progress', stage: 'fixing', message: 'Fixing error 2', attempt: 2, elapsedMs: 61000 }),
    );
    expect(events).toEqual([
      { kind: 'attached', message: 'already running' },
      { kind: 'progress', stage: 'fixing', message: 'Fixing error 2', attempt: 2, elapsedMs: 61000 },
    ]);
  });

  it('carries the partial flag on a best-so-far done event', async () => {
    const artifact = { title: 'Vase', code: 'return box(1,1,1);', parameters: [], suggestions: [] };
    const [done] = await collect(block('done', {
      artifact,
      generationId: 'g1',
      anonId: 'a1',
      durationMs: 240000,
      partial: { reason: 'timeout', stage: 'writing_code', passedGates: ['evaluate'], unverified: ['interference'], note: 'n' },
    }));
    expect(done).toEqual({
      kind: 'done',
      artifact,
      generationId: 'g1',
      anonId: 'a1',
      durationMs: 240000,
      partial: { reason: 'timeout', stage: 'writing_code', unverified: ['interference'], note: 'n' },
    });
  });

  it('carries the files the delivered code imports, dropping malformed entries', async () => {
    const entry = { sha256: 'c'.repeat(64), byteLength: 684, mediaType: 'model/stl', format: 'stl' };
    const [done] = await collect(block('done', {
      artifact: { title: 'T', code: 'c', parameters: [], suggestions: [] }, generationId: 'g', anonId: 'a', durationMs: 1,
      assets: { 'inputs/cccccccccccc.stl': entry, 'bad.stl': { sha256: 1 } },
    }));
    expect(done).toMatchObject({ kind: 'done', assets: { 'inputs/cccccccccccc.stl': entry } });
    expect((done as { assets: Record<string, unknown> }).assets).not.toHaveProperty('bad.stl');
  });

  it('a normal done event has no partial flag', async () => {
    const [done] = await collect(block('done', {
      artifact: { title: 'T', code: 'c', parameters: [], suggestions: [] }, generationId: 'g', anonId: 'a', durationMs: 1,
    }));
    expect(done).not.toHaveProperty('partial');
  });

  it('parses code events, keeping reset only when the server sets it', async () => {
    const events = await collect(
      block('code', { attempt: 1, delta: '', reset: true })
        + block('code', { attempt: 1, delta: 'const a = 1;\n' })
        + block('code', { attempt: 2, delta: 'x', reset: false }),
    );
    expect(events).toEqual([
      { kind: 'code', attempt: 1, delta: '', reset: true },
      { kind: 'code', attempt: 1, delta: 'const a = 1;\n' },
      { kind: 'code', attempt: 2, delta: 'x' },
    ]);
  });

  it('reassembles code events split across chunk boundaries, mid-character too', async () => {
    const text = block('code', { attempt: 1, delta: 'return box(20, 20, 20); // 20 mm ⌀\n', reset: true })
      + block('mystery', { anything: true })
      + block('code', { attempt: 1, delta: 'é' });
    const bytes = new TextEncoder().encode(text);
    // Cut the bytes into 7-byte chunks: boundaries land inside the event
    // name, the JSON, the blank-line separator and the multi-byte characters.
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += 7) chunks.push(bytes.slice(i, i + 7));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(c);
        controller.close();
      },
    });
    const out: GenerateEvent[] = [];
    for await (const e of parseSseStream(stream)) out.push(e);
    // The unknown `mystery` event is dropped.
    expect(out).toEqual([
      { kind: 'code', attempt: 1, delta: 'return box(20, 20, 20); // 20 mm ⌀\n', reset: true },
      { kind: 'code', attempt: 1, delta: 'é' },
    ]);
  });
});
