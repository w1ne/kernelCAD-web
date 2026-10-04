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

  it('a normal done event has no partial flag', async () => {
    const [done] = await collect(block('done', {
      artifact: { title: 'T', code: 'c', parameters: [], suggestions: [] }, generationId: 'g', anonId: 'a', durationMs: 1,
    }));
    expect(done).not.toHaveProperty('partial');
  });
});
