// src/lib/imageSimilarity/judge.test.ts
//
// W2 — VisualJudge. Verifies:
//  1. MockVisualJudge returns its canned score (no API key, no network).
//  2. VlmRubricJudge caches by sha256(render+reference+rubric): a repeated
//     identical request returns the same result WITHOUT a second client call.
//  3. VlmRubricJudge parses the JSON rubric response and pins temperature 0.

import { describe, expect, it } from 'vitest';
import {
  MockVisualJudge,
  VlmRubricJudge,
  type JudgeLlmClient,
  type JudgeLlmRequest,
} from './judge';

/** Fake SDK-shaped client that counts calls and returns a canned JSON body. */
class CountingJudgeClient implements JudgeLlmClient {
  public calls: JudgeLlmRequest[] = [];
  constructor(private readonly body: string) {}
  async create(req: JudgeLlmRequest): Promise<{ text: string }> {
    this.calls.push(req);
    return { text: this.body };
  }
}

describe('MockVisualJudge', () => {
  it('returns the canned score and per-criterion map', async () => {
    const judge = new MockVisualJudge({
      score: 0.42,
      perCriterion: { 'lens openings present': 0.5, 'frame proportion': 0.34 },
      reason: 'canned',
    });
    const out = await judge.judge({
      renderPng: Buffer.from('render'),
      referencePng: Buffer.from('ref'),
      rubric: ['lens openings present', 'frame proportion'],
    });
    expect(out.score).toBe(0.42);
    expect(out.perCriterion['lens openings present']).toBe(0.5);
    expect(out.reason).toBe('canned');
  });
});

describe('VlmRubricJudge', () => {
  const validBody = JSON.stringify({
    perCriterion: { 'lens openings present': 0.8, 'frame proportion': 0.6 },
    reason: 'lenses visible; proportion slightly tall',
  });

  it('parses the JSON rubric response and averages per-criterion into score', async () => {
    const client = new CountingJudgeClient(validBody);
    const judge = new VlmRubricJudge(client);
    const out = await judge.judge({
      renderPng: Buffer.from('render-bytes'),
      referencePng: Buffer.from('ref-bytes'),
      rubric: ['lens openings present', 'frame proportion'],
    });
    expect(out.perCriterion['lens openings present']).toBe(0.8);
    expect(out.perCriterion['frame proportion']).toBe(0.6);
    expect(out.score).toBeCloseTo(0.7, 5); // (0.8 + 0.6) / 2
    expect(client.calls.length).toBe(1);
  });

  it('pins temperature 0 and a fixed model in the request', async () => {
    const client = new CountingJudgeClient(validBody);
    const judge = new VlmRubricJudge(client);
    await judge.judge({
      renderPng: Buffer.from('r'),
      referencePng: Buffer.from('f'),
      rubric: ['lens openings present', 'frame proportion'],
    });
    expect(client.calls[0].temperature).toBe(0);
    expect(client.calls[0].model.length).toBeGreaterThan(0);
  });

  it('caches by sha256(render+reference+rubric): identical input → no second call', async () => {
    const client = new CountingJudgeClient(validBody);
    const judge = new VlmRubricJudge(client);
    const args = {
      renderPng: Buffer.from('same-render'),
      referencePng: Buffer.from('same-ref'),
      rubric: ['lens openings present', 'frame proportion'],
    };
    const first = await judge.judge(args);
    const second = await judge.judge(args);
    expect(second).toEqual(first);
    expect(client.calls.length).toBe(1); // cache hit, no second call
  });

  it('makes a fresh call when the render bytes differ', async () => {
    const client = new CountingJudgeClient(validBody);
    const judge = new VlmRubricJudge(client);
    const rubric = ['lens openings present', 'frame proportion'];
    await judge.judge({ renderPng: Buffer.from('a'), referencePng: Buffer.from('f'), rubric });
    await judge.judge({ renderPng: Buffer.from('b'), referencePng: Buffer.from('f'), rubric });
    expect(client.calls.length).toBe(2);
  });

  it('retries once on malformed JSON then throws', async () => {
    const bad = new CountingJudgeClient('not json at all');
    const judge = new VlmRubricJudge(bad);
    await expect(
      judge.judge({ renderPng: Buffer.from('r'), referencePng: Buffer.from('f'), rubric: ['x'] }),
    ).rejects.toThrow(/malformed JSON after retry/);
    expect(bad.calls.length).toBe(2);
  });
});
