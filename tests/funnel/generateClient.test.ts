import { describe, it, expect } from 'vitest';
import { parseSseStream, type GenerateEvent } from '../../src/funnel/lib/generateClient';

function streamFrom(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe('parseSseStream', () => {
  it('parses generation + status + done events', async () => {
    const sse = [
      'event: generation',
      'data: {"generationId":"g-1","anonId":"a-1"}',
      '',
      'event: status',
      'data: {"type":"status","phase":"running"}',
      '',
      'event: done',
      'data: {"artifact":{"title":"Cube","code":"return box(1,1,1);","parameters":[],"suggestions":["fillet"]},"generationId":"g-1","anonId":"a-1","durationMs":100}',
      '',
      '',
    ].join('\n');

    const events: GenerateEvent[] = [];
    for await (const e of parseSseStream(streamFrom(sse))) events.push(e);

    const kinds = events.map(e => e.kind);
    expect(kinds).toEqual(['generation', 'status', 'done']);
    if (events[2].kind === 'done') {
      expect(events[2].artifact.title).toBe('Cube');
    }
  });

  it('handles tool_call events', async () => {
    const sse = 'event: tool_call\ndata: {"type":"tool_call","name":"evaluate_script","args":{}}\n\n';
    const events: GenerateEvent[] = [];
    for await (const e of parseSseStream(streamFrom(sse))) events.push(e);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('tool_call');
  });

  it('handles error events', async () => {
    const sse = 'event: error\ndata: {"code":"llm_failed","message":"oops","generationId":"g-1"}\n\n';
    const events: GenerateEvent[] = [];
    for await (const e of parseSseStream(streamFrom(sse))) events.push(e);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('error');
    if (events[0].kind === 'error') {
      expect(events[0].code).toBe('llm_failed');
    }
  });

  it('handles split chunks across event boundaries', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode('event: status\ndata: {"type":"sta'));
        controller.enqueue(enc.encode('tus","phase":"running"}\n\n'));
        controller.close();
      },
    });
    const events: GenerateEvent[] = [];
    for await (const e of parseSseStream(stream)) events.push(e);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('status');
  });
});
